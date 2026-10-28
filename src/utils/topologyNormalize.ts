import type { DeviceInstanceBasic, ProductListItem } from '@/types/deviceConfiguration'
import type { ModelFlowData, ModelFlowNode } from '@/types/visualModeling'
import {
  canConnectNodes,
  getNodeConnectionRuleStates,
  isTopologyHandleSide,
  parseTopologyHandleSide,
} from '@/utils/modelFlowRules'
import { getNodeInstanceId } from '@/utils/visualModeling'
import { countMeterNodes, MAX_METER_NODES, METER_NODE_LIMIT_MESSAGE } from '@/utils/topologyNodeLimits'

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

export interface TopologyNormalizeResult extends TopologyValidationResult {
  flow: ModelFlowData
  appliedFixes: string[]
  canImport: boolean
}

export interface TopologyValidationOptions {
  fixedBindings?: ModelFlowData['fixedBindings']
  instances?: DeviceInstanceBasic[]
  stationProductName?: string
  environmentProductName?: string
}

const ROOT_FIELDS = new Set(['nodes', 'edges', 'fixedBindings'])
const NODE_FIELDS = new Set(['id', 'type', 'position', 'data'])
const NODE_DATA_FIELDS = new Set(['label', 'description', 'productName', 'instanceId'])
const EDGE_FIELDS = new Set(['id', 'type', 'source', 'target', 'sourceHandle', 'targetHandle'])
const FIXED_BINDING_FIELDS = new Set(['stationInstanceId', 'environmentInstanceId'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nodeLabel(node: ModelFlowNode): string {
  return node.data.label?.trim() || node.data.productName || node.id
}

function finishValidation(issues: TopologyIssue[]): TopologyValidationResult {
  const errors = issues.filter((issue) => issue.level === 'error')
  return {
    issues,
    errors,
    warnings: issues.filter((issue) => issue.level === 'warning'),
    canSave: errors.length === 0,
  }
}

function positiveInteger(value: unknown): number | null {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export function normalizeTopologyFixedBindings(flow: ModelFlowData): ModelFlowData {
  const bindings: Record<string, unknown> = isRecord(flow.fixedBindings) ? flow.fixedBindings : {}
  return {
    ...flow,
    fixedBindings: {
      stationInstanceId: positiveInteger(bindings.stationInstanceId),
      environmentInstanceId: positiveInteger(bindings.environmentInstanceId),
    },
  }
}

function validateFixedInstance(
  instanceId: number | null | undefined,
  expectedProductName: string | undefined,
  label: 'Station' | 'Environment',
  instancesById: Map<number, DeviceInstanceBasic>,
  issues: TopologyIssue[],
) {
  if (!instanceId) {
    issues.push({
      level: 'error',
      code: `missing_${label.toLowerCase()}_binding`,
      message: `${label} requires an instance binding.`,
    })
    return
  }
  const instance = instancesById.get(instanceId)
  if (!instance) {
    issues.push({ level: 'error', code: 'unknown_instance', message: `${label} references an instance that no longer exists.` })
    return
  }
  if (expectedProductName && instance.product_name !== expectedProductName) {
    issues.push({
      level: 'error',
      code: 'instance_product_mismatch',
      message: `${label} is bound to an instance of ${instance.product_name}, not ${expectedProductName}.`,
    })
  }
}

/** Validate the canonical flat, single-instance topology model. */
export function validateTopologyForPersistence(
  flow: ModelFlowData,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const issues: TopologyIssue[] = []
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const nodeById = new Map<string, ModelFlowNode>()
  const edgeIds = new Set<string>()
  const instanceOwners = new Map<number, string>()
  const productsByName = new Map(products.map((product) => [product.product_name, product]))
  const instancesById = new Map((options?.instances ?? []).map((instance) => [instance.instance_id, instance]))

  if (countMeterNodes(nodes) > MAX_METER_NODES) {
    issues.push({ level: 'error', code: 'meter_node_limit', message: METER_NODE_LIMIT_MESSAGE })
  }

  for (const node of nodes) {
    if (!node.id || nodeById.has(node.id)) {
      issues.push({ level: 'error', code: 'duplicate_node_id', message: `Node id "${node.id}" is missing or duplicated.`, nodeId: node.id })
      continue
    }
    nodeById.set(node.id, node)
    if (node.type !== 'product') {
      issues.push({ level: 'error', code: 'invalid_node_type', message: `Node "${nodeLabel(node)}" must use type "product".`, nodeId: node.id })
    }
    const productName = node.data.productName?.trim()
    if (!productName || (productsByName.size > 0 && !productsByName.has(productName))) {
      issues.push({ level: 'error', code: 'unknown_product', message: `Node "${nodeLabel(node)}" references an unknown product.`, nodeId: node.id })
    } else if (!productsByName.get(productName)?.topology) {
      issues.push({ level: 'error', code: 'product_not_topological', message: `Product "${productName}" cannot be placed in the topology.`, nodeId: node.id })
    }
    const instanceId = getNodeInstanceId(node.data)
    if (instanceId === null) {
      issues.push({ level: 'error', code: 'missing_instance_binding', message: `Node "${nodeLabel(node)}" requires an instance binding.`, nodeId: node.id })
      continue
    }
    const owner = instanceOwners.get(instanceId)
    if (owner) {
      issues.push({ level: 'error', code: 'duplicate_instance_binding', message: `Instance #${instanceId} is bound to multiple nodes.`, nodeId: node.id })
    } else {
      instanceOwners.set(instanceId, node.id)
    }
    const instance = instancesById.get(instanceId)
    if (!instance) {
      issues.push({ level: 'error', code: 'unknown_instance', message: `Node "${nodeLabel(node)}" references an instance that no longer exists.`, nodeId: node.id })
    } else if (productName && instance.product_name !== productName) {
      issues.push({ level: 'error', code: 'instance_product_mismatch', message: `Node "${nodeLabel(node)}" is bound to an instance of ${instance.product_name}, not ${productName}.`, nodeId: node.id })
    }
  }

  const connectedNodeIds = new Set<string>()
  const connectedPairs = new Set<string>()
  for (const edge of edges) {
    if (!edge.id || edgeIds.has(edge.id)) {
      issues.push({ level: 'error', code: 'duplicate_edge_id', message: `Edge id "${edge.id}" is missing or duplicated.` })
    }
    edgeIds.add(edge.id)
    if (edge.type !== 'deletable-smoothstep') {
      issues.push({ level: 'error', code: 'invalid_edge_type', message: `Edge ${edge.id} must use type "deletable-smoothstep".` })
    }
    if (!isTopologyHandleSide(edge.sourceHandle) || !isTopologyHandleSide(edge.targetHandle)) {
      issues.push({ level: 'error', code: 'invalid_edge_handle', message: `Edge ${edge.id} must use top, right, bottom, or left handles.` })
    }
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) {
      issues.push({ level: 'error', code: 'dangling_edge', message: `Edge ${edge.id} references a missing node.` })
      continue
    }
    if (source.id === target.id) {
      issues.push({ level: 'error', code: 'self_edge', message: `Node "${nodeLabel(source)}" cannot connect to itself.`, nodeId: source.id })
      continue
    }
    const pair = [source.id, target.id].sort().join('::')
    if (connectedPairs.has(pair)) {
      issues.push({ level: 'error', code: 'duplicate_edge', message: `Nodes "${nodeLabel(source)}" and "${nodeLabel(target)}" have duplicate connections.` })
      continue
    }
    connectedPairs.add(pair)
    if (!canConnectNodes(source, target)) {
      issues.push({ level: 'error', code: 'invalid_connection', message: `Connection between "${nodeLabel(source)}" and "${nodeLabel(target)}" is not allowed.` })
      continue
    }
    connectedNodeIds.add(source.id)
    connectedNodeIds.add(target.id)
  }

  for (const node of nodes) {
    for (const rule of getNodeConnectionRuleStates(node, nodes, edges)) {
      const group = rule.products.join(', ')
      if (rule.count < rule.min) {
        issues.push({
          level: 'error',
          code: 'connection_rule_min',
          message: `Node "${nodeLabel(node)}" requires at least ${rule.min} connection(s) across ${group}; currently ${rule.count}.`,
          nodeId: node.id,
        })
      }
      if (rule.max != null && rule.count > rule.max) {
        issues.push({
          level: 'error',
          code: 'connection_rule_max',
          message: `Node "${nodeLabel(node)}" allows at most ${rule.max} connection(s) across ${group}; currently ${rule.count}.`,
          nodeId: node.id,
        })
      }
    }
  }

  if (nodes.length > 1) {
    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        issues.push({ level: 'error', code: 'isolated_node', message: `Node "${nodeLabel(node)}" is not connected to the topology.`, nodeId: node.id })
      }
    }
  }

  const fixedBindings = options?.fixedBindings ?? flow.fixedBindings
  const fixedIds = [
    ['Station', fixedBindings?.stationInstanceId],
    ['Environment', fixedBindings?.environmentInstanceId],
  ] as const
  for (const [label, instanceId] of fixedIds) {
    if (!instanceId) continue
    const owner = instanceOwners.get(instanceId)
    if (owner) {
      issues.push({ level: 'error', code: 'duplicate_instance_binding', message: `Instance #${instanceId} is bound to both ${label} and node "${owner}".` })
    }
  }
  if (
    fixedBindings?.stationInstanceId
    && fixedBindings.stationInstanceId === fixedBindings.environmentInstanceId
  ) {
    issues.push({ level: 'error', code: 'duplicate_instance_binding', message: `Instance #${fixedBindings.stationInstanceId} is bound to both Station and Environment.` })
  }
  if (fixedBindings?.stationInstanceId) {
    validateFixedInstance(fixedBindings.stationInstanceId, options?.stationProductName, 'Station', instancesById, issues)
  }
  if (fixedBindings?.environmentInstanceId) {
    validateFixedInstance(fixedBindings.environmentInstanceId, options?.environmentProductName, 'Environment', instancesById, issues)
  }

  return finishValidation(issues)
}

/** Normalize editable state into the canonical topology representation. */
export function normalizeTopology(
  flow: ModelFlowData,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyNormalizeResult {
  const normalized = createPersistedTopologyFlow(flow)
  const validation = validateTopologyForPersistence(normalized, products, options)
  return {
    ...validation,
    flow: normalized,
    appliedFixes: [],
    canImport: validation.canSave,
  }
}

/** Convert Vue Flow state into the exact persisted topology DTO. */
export function createPersistedTopologyFlow(flow: ModelFlowData): ModelFlowData {
  return {
    nodes: (flow.nodes ?? []).map((node) => ({
      id: node.id,
      type: 'product',
      position: {
        x: Number(node.position?.x) || 0,
        y: Number(node.position?.y) || 0,
      },
      data: {
        label: node.data?.label ?? '',
        description: node.data?.description ?? '',
        productName: node.data?.productName ?? '',
        instanceId: getNodeInstanceId(node.data),
      },
    })),
    edges: (flow.edges ?? []).map((edge) => ({
      id: edge.id,
      type: 'deletable-smoothstep',
      source: edge.source,
      target: edge.target,
      sourceHandle: parseTopologyHandleSide(edge.sourceHandle) ?? 'bottom',
      targetHandle: parseTopologyHandleSide(edge.targetHandle) ?? 'top',
    })),
    fixedBindings: {
      stationInstanceId: positiveInteger(flow.fixedBindings?.stationInstanceId),
      environmentInstanceId: positiveInteger(flow.fixedBindings?.environmentInstanceId),
    },
  }
}

/** Import accepts only the canonical schema; no legacy migration is performed. */
export function stripKnownTopologyRuntimeFields(value: unknown): unknown {
  return isRecord(value) ? cloneJson(value) : value
}

function addUnknownFields(value: Record<string, unknown>, allowed: Set<string>, path: string, issues: TopologyIssue[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ level: 'error', code: 'unknown_field', message: `Unsupported field "${path}.${key}" in import data.` })
    }
  }
}

/** Reject fields outside the canonical persisted schema before rendering it. */
export function validateTopologyImport(
  value: unknown,
  products: ProductListItem[] = [],
  options?: TopologyValidationOptions,
): TopologyValidationResult {
  const issues: TopologyIssue[] = []
  if (!isRecord(value)) {
    return finishValidation([{ level: 'error', code: 'invalid_import', message: 'Imported topology must be a JSON object.' }])
  }
  addUnknownFields(value, ROOT_FIELDS, 'root', issues)
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
    addUnknownFields(node, NODE_FIELDS, `nodes[${index}]`, issues)
    if (!isRecord(node.data)) {
      issues.push({ level: 'error', code: 'invalid_node_data', message: `Node ${index + 1} has invalid data.` })
    } else {
      addUnknownFields(node.data, NODE_DATA_FIELDS, `nodes[${index}].data`, issues)
    }
  }
  for (const [index, edge] of (edges ?? []).entries()) {
    if (!isRecord(edge)) {
      issues.push({ level: 'error', code: 'invalid_edge', message: `Edge ${index + 1} is invalid.` })
      continue
    }
    addUnknownFields(edge, EDGE_FIELDS, `edges[${index}]`, issues)
  }
  if (!isRecord(value.fixedBindings)) {
    issues.push({ level: 'error', code: 'invalid_fixed_bindings', message: 'Fixed bindings are required.' })
  } else {
    addUnknownFields(value.fixedBindings, FIXED_BINDING_FIELDS, 'fixedBindings', issues)
  }
  if (issues.length) return finishValidation(issues)
  return validateTopologyForPersistence(value as unknown as ModelFlowData, products, options)
}
