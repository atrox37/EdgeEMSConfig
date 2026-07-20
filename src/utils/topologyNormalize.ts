import type { ProductListItem } from '@/types/deviceConfiguration'
import type { ModelFlowData, ModelFlowNode, ModelNodeData } from '@/types/visualModeling'
import { DEFAULT_DEVICE_PRODUCTS } from '@/constants/deviceProducts'
import { isContainerProduct } from '@/constants/deviceProducts'
import { hasEdgeBetweenNodesEitherDirection } from '@/utils/modelFlowRules'
import { instanceIds, normalizeNodeData } from '@/utils/visualModeling'

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
  return !!data.isContainer || isContainerProduct(data.productName)
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
  }
}

export interface TopologyValidationOptions {
  /** 返回节点实例的实时路由通道（来自 channel-bindings） */
  resolveChannelIds?: (nodeId: string, instanceId: number) => number[]
}

/** 校验拓扑（不修改数据） */
export function validateTopology(
  flow: ModelFlowData,
  products: ProductListItem[] = DEFAULT_DEVICE_PRODUCTS,
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const issues: TopologyIssue[] = []
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const parentMap = buildParentMap(products)

  const stations = nodes.filter((n) => n.type === 'station')
  if (!stations.length) {
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
  products: ProductListItem[] = DEFAULT_DEVICE_PRODUCTS,
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
    const kept = data.instances.filter((inst) => {
      if (seenInstances.has(inst.instanceId)) return false
      seenInstances.add(inst.instanceId)
      return true
    })
    if (kept.length !== data.instances.length) {
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

  const normalizedFlow: ModelFlowData = { nodes, edges }
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
