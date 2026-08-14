import type { DeviceInstanceBasic, ProductListItem } from '@/types/deviceConfiguration'
import type { ModelFlowData, ModelFlowNode, ModelInstanceBinding, ModelNodeData } from '@/types/visualModeling'
import { canConnectNodes, hasEdgeBetweenNodesEitherDirection } from '@/utils/modelFlowRules'
import { instanceIds, normalizeNodeData, normalizeNodeInstances } from '@/utils/visualModeling'

export type TopologyIssueLevel = 'error' | 'warning'

export interface TopologyIssue {
  level: TopologyIssueLevel
  code: string
  message: string
  nodeId?: string
}

export interface TopologyValidationResult {
  issues: TopologyIssue[]
  errors: TopologyIssue[]
  warnings: TopologyIssue[]
  canSave: boolean
}

export interface TopologyNormalizeResult {
  flow: ModelFlowData
  issues: TopologyIssue[]
  errors: TopologyIssue[]
  warnings: TopologyIssue[]
  appliedFixes: string[]
  canImport: boolean
}

function buildParentMap(products: ProductListItem[]): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const p of products) {
    map.set(p.product_name, p.parent_name ?? null)
  }
  return map
}

function nodeLabel(node: ModelFlowNode): string {
  const data = node.data as ModelNodeData
  return data.label?.trim() || data.productName || node.id
}

function isBindableDeviceNode(node: ModelFlowNode): boolean {
  return node.type === 'product'
}

function isContainerGroupNode(node: ModelFlowNode): boolean {
  if (node.type !== 'group') return false
  const data = node.data as ModelNodeData & { isContainer?: boolean }
  return !!data.isContainer || data.topologyType === 'container'
}

function childMatchesContainer(
  childProduct: string,
  containerProduct: string,
  parentMap: Map<string, string | null>,
): boolean {
  return parentMap.get(childProduct) === containerProduct
}

function cloneFlow(flow: ModelFlowData): ModelFlowData {
  return {
    nodes: JSON.parse(JSON.stringify(flow.nodes ?? [])) as ModelFlowNode[],
    edges: JSON.parse(JSON.stringify(flow.edges ?? [])) as ModelFlowData['edges'],
    fixedBindings: flow.fixedBindings ? JSON.parse(JSON.stringify(flow.fixedBindings)) : undefined,
  }
}

export interface TopologyValidationOptions {
  /** 返回节点实例的实时路由通道（来自 channel-bindings） */
  resolveChannelIds?: (nodeId: string, instanceId: number) => number[]
  /** The editor renders Station/Env as fixed bindings instead of flow nodes. */
  requireStationNode?: boolean
  fixedBindings?: ModelFlowData['fixedBindings']
  requireEnvironmentBinding?: boolean
  /** Current backend instance list, used to reject stale or forged bindings. */
  instances?: DeviceInstanceBasic[]
  stationProductName?: string
  environmentProductName?: string
}

/** 校验拓扑（不修改数据） */
export function validateTopology(
  flow: ModelFlowData,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const issues: TopologyIssue[] = []
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const parentMap = buildParentMap(products)

  const stations = nodes.filter((n) => n.type === 'station')
  if (options?.requireStationNode !== false && !stations.length) {
    issues.push({
      level: 'error',
      code: 'missing_station',
      message: 'Topology must include exactly one Station node.',
    })
  } else if (stations.length > 1) {
    issues.push({
      level: 'error',
      code: 'multiple_stations',
      message: `Topology has ${stations.length} Station nodes; only one is allowed.`,
    })
  }

  const instanceOwners = new Map<number, string>()
  for (const node of nodes) {
    const ids = instanceIds(node.data as ModelNodeData)
    for (const instanceId of ids) {
      const prev = instanceOwners.get(instanceId)
      if (prev && prev !== node.id) {
        issues.push({
          level: 'error',
          code: 'duplicate_instance_binding',
          message: `Instance #${instanceId} is bound to multiple nodes.`,
          nodeId: node.id,
        })
      } else {
        instanceOwners.set(instanceId, node.id)
      }
    }
  }

  for (const node of nodes) {
    if (!node.parentNode) continue
    const parent = nodeById.get(node.parentNode)
    if (!parent) {
      issues.push({
        level: 'warning',
        code: 'invalid_parent_ref',
        message: `Node "${nodeLabel(node)}" references a missing container.`,
        nodeId: node.id,
      })
      continue
    }
    if (!isContainerGroupNode(parent)) continue
    const childProduct = (node.data as ModelNodeData).productName?.trim()
    const containerProduct = (parent.data as ModelNodeData).productName?.trim()
    if (
      childProduct
      && containerProduct
      && !childMatchesContainer(childProduct, containerProduct, parentMap)
    ) {
      issues.push({
        level: 'error',
        code: 'container_product_mismatch',
        message: `"${nodeLabel(node)}" (${childProduct}) cannot belong to "${nodeLabel(parent)}" (${containerProduct}).`,
        nodeId: node.id,
      })
    }
  }

  const station = stations[0]
  for (const node of nodes) {
    if (!isBindableDeviceNode(node)) continue
    const ids = instanceIds(node.data as ModelNodeData)
    if (!ids.length) {
      issues.push({
        level: 'warning',
        code: 'unbound_device',
        message: `Device node "${nodeLabel(node)}" has no instance bound.`,
        nodeId: node.id,
      })
      continue
    }
    if (options?.resolveChannelIds) {
      const channels = options.resolveChannelIds(node.id, ids[0])
      if (!channels.length) {
        issues.push({
          level: 'warning',
          code: 'no_routing_channels',
          message: `Device "${nodeLabel(node)}" has no measurement routing channels configured.`,
          nodeId: node.id,
        })
      }
    }
  }

  if (station) {
    for (const node of nodes) {
      if (node.id === station.id || node.parentNode) continue
      if (node.type === 'station') continue
      const connected = hasEdgeBetweenNodesEitherDirection(edges, station.id, node.id)
      if (!connected) {
        issues.push({
          level: 'warning',
          code: 'missing_station_edge',
          message: `Top-level node "${nodeLabel(node)}" is not connected to Station.`,
          nodeId: node.id,
        })
      }
    }
  }

  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
      issues.push({
        level: 'warning',
        code: 'dangling_edge',
        message: `Edge ${edge.id} references a missing node.`,
      })
    }
  }

  for (const node of nodes) {
    if (!isContainerGroupNode(node)) continue
    const hasChild = nodes.some((n) => n.parentNode === node.id)
    if (!hasChild) {
      issues.push({
        level: 'warning',
        code: 'empty_container',
        message: `Container "${nodeLabel(node)}" has no device nodes inside.`,
        nodeId: node.id,
      })
    }
  }

  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  return {
    issues,
    errors,
    warnings,
    canSave: errors.length === 0,
  }
}

/**
 * 导入/修复拓扑：清理悬空边、无效 parent、重复实例绑定，并返回校验结果。
 */
export function normalizeTopology(
  flow: ModelFlowData,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyNormalizeResult {
  const appliedFixes: string[] = []
  const working = cloneFlow(flow)
  let nodes = working.nodes ?? []
  let edges = working.edges ?? []

  const nodeIdSet = () => new Set(nodes.map((n) => n.id))

  // 移除悬空边
  const beforeEdgeCount = edges.length
  edges = edges.filter((e) => nodeIdSet().has(e.source) && nodeIdSet().has(e.target))
  if (edges.length < beforeEdgeCount) {
    appliedFixes.push('Removed edges that referenced missing nodes.')
  }

  // 解除无效 parentNode
  const ids = nodeIdSet()
  let detached = 0
  nodes = nodes.map((node) => {
    if (!node.parentNode || ids.has(node.parentNode)) return node
    detached += 1
    const { parentNode: _p, extent: _e, ...rest } = node
    return rest as ModelFlowNode
  })
  if (detached > 0) {
    appliedFixes.push(`Detached ${detached} node(s) from missing containers.`)
  }

  // 去重实例绑定（保留首次出现的节点）
  const seenInstances = new Set<number>()
  nodes = nodes.map((node) => {
    const data = normalizeNodeData(node.data as ModelNodeData)
    const instances = data.instances ?? []
    const kept = instances.filter((inst) => {
      if (seenInstances.has(inst.instanceId)) return false
      seenInstances.add(inst.instanceId)
      return true
    })
    if (kept.length !== instances.length) {
      appliedFixes.push(`Cleared duplicate instance binding on "${nodeLabel(node)}".`)
    }
    return {
      ...node,
      data: {
        ...data,
        instances: kept,
        instanceId: kept[0]?.instanceId,
        instanceName: kept[0]?.instanceName,
      },
    }
  })

  const normalizedFlow: ModelFlowData = { nodes, edges, fixedBindings: working.fixedBindings }
  const validation = validateTopology(normalizedFlow, products, options)

  return {
    flow: normalizedFlow,
    issues: validation.issues,
    errors: validation.errors,
    warnings: validation.warnings,
    appliedFixes: [...new Set(appliedFixes)],
    canImport: validation.errors.length === 0,
  }
}


/** Strict rules shared by saving and importing persisted topologies. */
export function validateTopologyForPersistence(
  flow: ModelFlowData,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const base = validateTopology(flow, products, { ...options, requireStationNode: false })
  const issues = [...base.issues]
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const productsByName = new Map(products.map((product) => [product.product_name, product]))
  const instancesById = new Map((options?.instances ?? []).map((instance) => [instance.instance_id, instance]))
  const connectedIds = new Set<string>()
  const seenPairs = new Set<string>()

  const validateBinding = (
    binding: Pick<ModelInstanceBinding, 'instanceId' | 'productName'>,
    expectedProductName: string | undefined,
    label: string,
    nodeId?: string,
  ) => {
    const instance = instancesById.get(binding.instanceId)
    if (!instance) {
      issues.push({ level: 'error', code: 'unknown_instance', message: `${label} references an instance that no longer exists.`, nodeId })
      return
    }
    if (expectedProductName && instance.product_name !== expectedProductName) {
      issues.push({ level: 'error', code: 'instance_product_mismatch', message: `${label} is bound to an instance of ${instance.product_name}, not ${expectedProductName}.`, nodeId })
    }
    if (binding.productName && binding.productName !== instance.product_name) {
      issues.push({ level: 'error', code: 'instance_product_mismatch', message: `${label} stores product ${binding.productName}, but the instance belongs to ${instance.product_name}.`, nodeId })
    }
  }

  for (const edge of edges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) {
      issues.push({ level: 'error', code: 'dangling_edge', message: `Edge ${edge.id} references a missing node.` })
      continue
    }
    if (source.id === target.id) {
      issues.push({ level: 'error', code: 'self_edge', message: `Node \"${nodeLabel(source)}\" cannot connect to itself.`, nodeId: source.id })
      continue
    }
    const pair = [source.id, target.id].sort().join('::')
    if (seenPairs.has(pair)) {
      issues.push({ level: 'error', code: 'duplicate_edge', message: `Nodes \"${nodeLabel(source)}\" and \"${nodeLabel(target)}\" have duplicate connections.` })
      continue
    }
    seenPairs.add(pair)
    if (!canConnectNodes(source, target)) {
      issues.push({ level: 'error', code: 'invalid_connection', message: `Connection between \"${nodeLabel(source)}\" and \"${nodeLabel(target)}\" is not allowed.` })
      continue
    }
    connectedIds.add(source.id)
    connectedIds.add(target.id)
  }

  for (const node of nodes) {
    if (node.parentNode && nodeById.has(node.parentNode)) {
      connectedIds.add(node.id)
      connectedIds.add(node.parentNode)
    }
    const data = node.data as ModelNodeData
    const productName = data.productName?.trim()
    const product = productName ? productsByName.get(productName) : undefined
    if (!product) {
      issues.push({ level: 'error', code: 'unknown_product', message: `Node \"${nodeLabel(node)}\" references a product that no longer exists.`, nodeId: node.id })
      continue
    }
    const ids = instanceIds(data)
    if (product.can_create_instance === true && !ids.length) {
      issues.push({ level: 'error', code: 'missing_instance_binding', message: `Node \"${nodeLabel(node)}\" requires an instance binding.`, nodeId: node.id })
    }
    for (const binding of normalizeNodeInstances(data)) {
      validateBinding(binding, productName, `Node \"${nodeLabel(node)}\"`, node.id)
    }
  }

  for (const node of nodes) {
    if (!connectedIds.has(node.id)) {
      issues.push({ level: 'error', code: 'isolated_node', message: `Node \"${nodeLabel(node)}\" is not connected to the topology.`, nodeId: node.id })
    }
  }

  const fixedBindings = options?.fixedBindings ?? flow.fixedBindings
  if (!fixedBindings?.station?.instanceId) {
    issues.push({ level: 'error', code: 'missing_station_binding', message: 'Station requires an instance binding.' })
  } else {
    validateBinding(fixedBindings.station, options?.stationProductName, 'Station')
  }
  if (options?.requireEnvironmentBinding && !fixedBindings?.environment?.instanceId) {
    issues.push({ level: 'error', code: 'missing_environment_binding', message: 'Environment requires an instance binding.' })
  } else if (fixedBindings?.environment?.instanceId) {
    validateBinding(fixedBindings.environment, options?.environmentProductName, 'Environment')
  }

  const errors = issues.filter((issue) => issue.level === 'error')
  return {
    issues,
    errors,
    warnings: issues.filter((issue) => issue.level === 'warning'),
    canSave: errors.length === 0,
  }
}
const IMPORT_ROOT_FIELDS = new Set(['nodes', 'edges', 'fixedBindings'])
const IMPORT_NODE_FIELDS = new Set(['id', 'type', 'position', 'data', 'parentNode', 'extent', 'style', 'zIndex', 'dimensions', 'hidden', 'selected', 'dragging', 'sourcePosition', 'targetPosition'])
const IMPORT_EDGE_FIELDS = new Set(['id', 'source', 'target', 'sourceHandle', 'targetHandle', 'label', 'type', 'style', 'markerEnd', 'selected', 'animated', 'data', 'labelStyle', 'labelShowBg', 'labelBgStyle'])
const IMPORT_NODE_DATA_FIELDS = new Set(['label', 'description', 'productName', 'parentName', 'instances', 'instanceId', 'instanceName', 'color', 'icon', 'imageUrl', 'isContainer', 'topologyType', 'selectableProductTypes', 'properties', 'width', 'height', 'uiExpanded'])
const IMPORT_BINDING_FIELDS = new Set(['instanceId', 'instanceName', 'productName', 'channelIds', 'overviewPoints'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function addUnknownImportFields(value: Record<string, unknown>, allowed: Set<string>, path: string, issues: TopologyIssue[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ level: 'error', code: 'unknown_field', message: `Unsupported field "${path}.${key}" in import data.` })
    }
  }
}

/** Reject unknown import fields before the topology is normalized or rendered. */
export function validateTopologyImport(
  value: unknown,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const issues: TopologyIssue[] = []
  if (!isRecord(value)) {
    issues.push({ level: 'error', code: 'invalid_import', message: 'Imported topology must be a JSON object.' })
  } else {
    addUnknownImportFields(value, IMPORT_ROOT_FIELDS, 'root', issues)
    const nodes = Array.isArray(value.nodes) ? value.nodes : null
    const edges = Array.isArray(value.edges) ? value.edges : null
    if (!nodes || !edges) {
      issues.push({ level: 'error', code: 'invalid_import', message: 'Imported topology must contain nodes and edges arrays.' })
    }
    for (const [index, node] of (nodes ?? []).entries()) {
      if (!isRecord(node)) {
        issues.push({ level: 'error', code: 'invalid_node', message: `Node ${index + 1} is invalid.` })
        continue
      }
      addUnknownImportFields(node, IMPORT_NODE_FIELDS, `nodes[${index}]`, issues)
      if (!isRecord(node.data)) {
        issues.push({ level: 'error', code: 'invalid_node_data', message: `Node ${index + 1} has invalid data.` })
        continue
      }
      addUnknownImportFields(node.data, IMPORT_NODE_DATA_FIELDS, `nodes[${index}].data`, issues)
      for (const [bindingIndex, binding] of (Array.isArray(node.data.instances) ? node.data.instances : []).entries()) {
        if (!isRecord(binding)) {
          issues.push({ level: 'error', code: 'invalid_instance', message: `Node ${index + 1} has an invalid instance binding.` })
          continue
        }
        addUnknownImportFields(binding, IMPORT_BINDING_FIELDS, `nodes[${index}].data.instances[${bindingIndex}]`, issues)
      }
    }
    for (const [index, edge] of (edges ?? []).entries()) {
      if (!isRecord(edge)) {
        issues.push({ level: 'error', code: 'invalid_edge', message: `Edge ${index + 1} is invalid.` })
        continue
      }
      addUnknownImportFields(edge, IMPORT_EDGE_FIELDS, `edges[${index}]`, issues)
    }
    if (value.fixedBindings !== undefined && !isRecord(value.fixedBindings)) {
      issues.push({ level: 'error', code: 'invalid_fixed_bindings', message: 'Fixed bindings are invalid.' })
    }
    if (isRecord(value.fixedBindings)) {
      addUnknownImportFields(value.fixedBindings, new Set(['station', 'environment']), 'fixedBindings', issues)
      for (const key of ['station', 'environment']) {
        const binding = value.fixedBindings[key]
        if (binding !== null && binding !== undefined && isRecord(binding)) {
          addUnknownImportFields(binding, IMPORT_BINDING_FIELDS, `fixedBindings.${key}`, issues)
        }
      }
    }
  }
  if (issues.length) return { issues, errors: issues, warnings: [], canSave: false }
  return validateTopologyForPersistence(value as ModelFlowData, products, options)
}
