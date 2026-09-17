import type { Connection, Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import type {
  ProductListItem,
  ProductTopologyConnectionRule,
} from '@/types/deviceConfiguration'
import type { TopologyHandleSide } from '@/types/visualModeling'

export interface ProductConnectionRuleState {
  nodeId: string
  productName: string
  products: string[]
  min: number
  max: number | null
  count: number
}

let topologyProductsByName = new Map<string, ProductListItem>()

/** Refreshes all topology rules from the products API response. */
export function setModelFlowProductRules(products?: ProductListItem[] | null) {
  topologyProductsByName = new Map(
    (products ?? [])
      .filter((product) => !!product.topology)
      .map((product) => [product.product_name, product]),
  )
}

function getConnectionRule(
  productName: string,
  peerProductName: string,
): ProductTopologyConnectionRule | undefined {
  return topologyProductsByName
    .get(productName)
    ?.topology
    ?.connections
    ?.find((rule) => rule.products.includes(peerProductName))
}

function isProductPairAllowed(productA: string, productB: string): boolean {
  if (productA === productB) return false
  return !!getConnectionRule(productA, productB) && !!getConnectionRule(productB, productA)
}

export function getNodeProductName(node?: FlowNode | null): string | undefined {
  return (node?.data as { productName?: string } | undefined)?.productName
}

export function canConnectNodes(source?: FlowNode | null, target?: FlowNode | null): boolean {
  if (!source || !target || source.id === target.id) return false
  const sourceProductName = getNodeProductName(source)
  const targetProductName = getNodeProductName(target)
  return !!sourceProductName
    && !!targetProductName
    && isProductPairAllowed(sourceProductName, targetProductName)
}

function getConnectedPeerNodes(
  node: FlowNode,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
): FlowNode[] {
  const nodesById = new Map(nodes.map((item) => [item.id, item]))
  const peerIds = new Set<string>()
  for (const edge of edges) {
    if (edge.source === node.id) peerIds.add(edge.target)
    else if (edge.target === node.id) peerIds.add(edge.source)
  }
  return Array.from(peerIds)
    .map((id) => nodesById.get(id))
    .filter((peer): peer is FlowNode => !!peer && canConnectNodes(node, peer))
}

export function getNodeConnectionRuleStates(
  node: FlowNode,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
): ProductConnectionRuleState[] {
  const productName = getNodeProductName(node)
  if (!productName) return []
  const peers = getConnectedPeerNodes(node, nodes, edges)
  return (topologyProductsByName.get(productName)?.topology?.connections ?? []).map((rule) => ({
    nodeId: node.id,
    productName,
    products: [...rule.products],
    min: Math.max(0, Number(rule.min) || 0),
    max: rule.max == null ? null : Math.max(0, Number(rule.max) || 0),
    count: peers.filter((peer) => {
      const peerProductName = getNodeProductName(peer)
      return !!peerProductName && rule.products.includes(peerProductName)
    }).length,
  }))
}

function getConnectionLimitHint(
  source: FlowNode,
  target: FlowNode,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
): string {
  for (const [node, peer] of [[source, target], [target, source]] as const) {
    const peerProductName = getNodeProductName(peer)
    const state = getNodeConnectionRuleStates(node, nodes, edges)
      .find((rule) => !!peerProductName && rule.products.includes(peerProductName))
    if (state?.max != null && state.count >= state.max) {
      return `${state.productName} allows at most ${state.max} connection(s) across ${state.products.join(', ')}`
    }
  }
  return ''
}

export function hasEdgeBetweenNodes(
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
  sourceId: string,
  targetId: string,
): boolean {
  return edges.some((edge) => edge.source === sourceId && edge.target === targetId)
}

export function hasEdgeBetweenNodesEitherDirection(
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
  nodeA: string,
  nodeB: string,
): boolean {
  return hasEdgeBetweenNodes(edges, nodeA, nodeB) || hasEdgeBetweenNodes(edges, nodeB, nodeA)
}

const HANDLE_SIDES = new Set<TopologyHandleSide>(['top', 'right', 'bottom', 'left'])
const RUNTIME_HANDLE_PATTERN = /^(top|right|bottom|left)(?:-(?:source|target))?$/

/** Parse a persisted handle side (strict: top | right | bottom | left only). */
export function parseTopologyHandleSide(handle?: string | null): TopologyHandleSide | null {
  if (!handle) return null
  return HANDLE_SIDES.has(handle as TopologyHandleSide) ? (handle as TopologyHandleSide) : null
}

function parseRuntimeHandleSide(handle?: string | null): TopologyHandleSide | null {
  if (!handle) return null
  const match = String(handle).match(RUNTIME_HANDLE_PATTERN)
  return match ? (match[1] as TopologyHandleSide) : null
}

export function isTopologyHandleSide(handle?: string | null): handle is TopologyHandleSide {
  return parseTopologyHandleSide(handle) !== null
}

export function toSourceHandle(handle?: string | null): TopologyHandleSide {
  return parseRuntimeHandleSide(handle) ?? 'bottom'
}

export function toTargetHandle(handle?: string | null): TopologyHandleSide {
  return parseRuntimeHandleSide(handle) ?? 'top'
}

function normalizeHandleId(handle: string | null | undefined, kind: 'source' | 'target'): TopologyHandleSide {
  return kind === 'source' ? toSourceHandle(handle) : toTargetHandle(handle)
}

/** Keeps the drag order because topology edges are currently undirected. */
export function resolveConnectionEndpoints(connection: Connection, nodes: FlowNode[]) {
  if (!connection.source || !connection.target) return null
  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  if (!canConnectNodes(source, target)) return null
  return {
    source: source!,
    target: target!,
    sourceHandle: normalizeHandleId(connection.sourceHandle, 'source'),
    targetHandle: normalizeHandleId(connection.targetHandle, 'target'),
  }
}

/** Edge orientation is retained for rendering only; it has no business meaning. */
export function correctEdgeDirection<T extends {
  sourceHandle?: string | null
  targetHandle?: string | null
}>(edge: T, _nodes: FlowNode[]): T {
  return {
    ...edge,
    sourceHandle: toSourceHandle(edge.sourceHandle),
    targetHandle: toTargetHandle(edge.targetHandle),
  }
}

export function canPreviewNodePair(
  source: FlowNode | null | undefined,
  target: FlowNode | null | undefined,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
): boolean {
  if (!source || !target || source.id === target.id) return false
  return canConnectNodes(source, target)
    && !hasEdgeBetweenNodesEitherDirection(edges, source.id, target.id)
    && !getConnectionLimitHint(source, target, nodes, edges)
}

export function getConnectionRuleHint(
  source?: FlowNode | null,
  target?: FlowNode | null,
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
  nodes: FlowNode[] = [],
): string {
  if (!source || !target) return 'Invalid connection'
  if (!canConnectNodes(source, target)) return 'Both products must allow this connection in their topology configuration'
  if (hasEdgeBetweenNodesEitherDirection(edges, source.id, target.id)) return 'An edge already exists between these two nodes'
  const limitHint = getConnectionLimitHint(source, target, nodes, edges)
  if (limitHint) return limitHint
  return ''
}
