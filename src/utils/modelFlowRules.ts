import type { Connection, Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import type { ProductListItem } from '@/types/deviceConfiguration'

let parentMap = new Map<string, string | null>()
let connectableProductPairs = new Set<string>()

function connectionPairKey(productA: string, productB: string): string {
  return [productA, productB].sort().join('::')
}

/** Refreshes all topology rules from the products API response. */
export function setModelFlowProductRules(products?: ProductListItem[] | null) {
  const apiProducts = products ?? []
  parentMap = new Map(apiProducts.map((product) => [product.product_name, product.parent_name]))
  connectableProductPairs = new Set()

  const topologyProductNames = new Set(
    apiProducts
      .filter((product) => product.topology?.enabled)
      .map((product) => product.product_name),
  )

  // An edge has no direction in the current topology model. Therefore a rule
  // declared by either product is normalized into one undirected pair.
  for (const product of apiProducts) {
    if (!topologyProductNames.has(product.product_name)) continue
    for (const targetName of product.topology?.connectableProducts ?? []) {
      if (targetName !== product.product_name && topologyProductNames.has(targetName)) {
        connectableProductPairs.add(connectionPairKey(product.product_name, targetName))
      }
    }
  }
}

export function getProductParentName(productName?: string): string | null | undefined {
  return productName ? parentMap.get(productName) : undefined
}

export function canPlaceInContainer(childProductName: string, containerProductName: string): boolean {
  return getProductParentName(childProductName) === containerProductName
}

export function getNodeProductName(node?: FlowNode | null): string | undefined {
  return (node?.data as { productName?: string } | undefined)?.productName
}

export function isDirectChildNode(parent?: FlowNode | null, child?: FlowNode | null): boolean {
  return !!parent && child?.parentNode === parent.id
}

export function isContainerNode(node?: FlowNode | null): boolean {
  if (!node) return false
  const data = node.data as { isContainer?: boolean; topologyType?: string } | undefined
  return node.type === 'group' || !!data?.isContainer || data?.topologyType === 'container'
}

export function canConnectNodes(source?: FlowNode | null, target?: FlowNode | null): boolean {
  if (!source || !target || source.id === target.id) return false
  const sourceProductName = getNodeProductName(source)
  const targetProductName = getNodeProductName(target)
  return !!sourceProductName
    && !!targetProductName
    && connectableProductPairs.has(connectionPairKey(sourceProductName, targetProductName))
}

export function isStrictParentChildConnection(source?: FlowNode | null, target?: FlowNode | null): boolean {
  return canConnectNodes(source, target)
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

export function toSourceHandle(handle?: string | null): string {
  if (!handle) return 'bottom-source'
  if (handle.endsWith('-source')) return handle
  if (handle.endsWith('-target')) return handle.replace('-target', '-source')
  return `${handle}-source`
}

export function toTargetHandle(handle?: string | null): string {
  if (!handle) return 'top-target'
  if (handle.endsWith('-target')) return handle
  if (handle.endsWith('-source')) return handle.replace('-source', '-target')
  return `${handle}-target`
}

function normalizeHandleId(handle: string | null | undefined, kind: 'source' | 'target'): string {
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

export function isValidModelConnection(
  connection: Connection,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
): boolean {
  const source = nodes.find((node) => node.id === connection.source)
  const target = nodes.find((node) => node.id === connection.target)
  return !!source
    && !!target
    && canConnectNodes(source, target)
    && !hasEdgeBetweenNodesEitherDirection(edges, source.id, target.id)
}

export function getConnectionRuleHint(
  source?: FlowNode | null,
  target?: FlowNode | null,
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
): string {
  if (!source || !target) return 'Invalid connection'
  if (!canConnectNodes(source, target)) return 'This connection is not allowed by the product topology configuration'
  if (hasEdgeBetweenNodesEitherDirection(edges, source.id, target.id)) return 'An edge already exists between these two nodes'
  return ''
}
