import type { Connection, Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import type { ProductListItem } from '@/types/deviceConfiguration'
import { DEFAULT_DEVICE_PRODUCTS, isContainerProduct } from '@/constants/deviceProducts'

function productParentMap(products: ProductListItem[]): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const p of products) {
    map.set(p.product_name, p.parent_name)
  }
  return map
}

const parentMap = productParentMap(DEFAULT_DEVICE_PRODUCTS)

export function getProductParentName(productName?: string): string | null | undefined {
  if (!productName) return undefined
  return parentMap.get(productName)
}

export function canPlaceInContainer(
  childProductName: string,
  containerProductName: string,
): boolean {
  return getProductParentName(childProductName) === containerProductName
}

export function mustBeTopLevel(productName?: string): boolean {
  if (!productName) return true
  if (productName === 'Station') return true
  if (isContainerProduct(productName)) return true
  return getProductParentName(productName) === 'Station'
}

export function getNodeProductName(node?: FlowNode | null): string | undefined {
  return (node?.data as { productName?: string } | undefined)?.productName
}

export function isDirectChildNode(parent?: FlowNode | null, child?: FlowNode | null): boolean {
  if (!parent || !child?.parentNode) return false
  return child.parentNode === parent.id
}

export function isContainerNode(node?: FlowNode | null): boolean {
  if (!node) return false
  if (node.type === 'group') return true
  const data = node.data as { isContainer?: boolean; productName?: string } | undefined
  return !!data?.isContainer || isContainerProduct(data?.productName)
}

export function canConnectNodes(
  source?: FlowNode | null,
  target?: FlowNode | null,
): boolean {
  if (!source || !target || source.id === target.id) return false

  // Station → 任意非 Station 节点（顶层容器、顶层设备、容器内设备均可直连）
  if (source.type === 'station') {
    return target.type !== 'station'
  }

  // 容器 → 直接子设备
  if (isContainerNode(source) && isDirectChildNode(source, target)) {
    return true
  }

  return false
}

/** 仅允许父→子方向（不自动交换端点） */
export function isStrictParentChildConnection(
  source?: FlowNode | null,
  target?: FlowNode | null,
): boolean {
  return canConnectNodes(source, target)
}

export function hasEdgeBetweenNodes(
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
  sourceId: string,
  targetId: string,
): boolean {
  return edges.some((e) => e.source === sourceId && e.target === targetId)
}

/** 两节点之间是否已有连线（任意方向） */
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
  if (handle === 'bottom') return 'bottom-source'
  if (handle === 'top') return 'top-source'
  return `${handle}-source`
}

export function toTargetHandle(handle?: string | null): string {
  if (!handle) return 'top-target'
  if (handle.endsWith('-target')) return handle
  if (handle.endsWith('-source')) return handle.replace('-source', '-target')
  if (handle === 'bottom') return 'bottom-target'
  if (handle === 'top') return 'top-target'
  return `${handle}-target`
}

function normalizeHandleId(
  handle: string | null | undefined,
  kind: 'source' | 'target',
): string {
  return kind === 'source' ? toSourceHandle(handle) : toTargetHandle(handle)
}

/** 解析连线端点：允许从任意方向拖线，统一规范为父→子 */
export function resolveConnectionEndpoints(
  connection: Connection,
  nodes: FlowNode[],
): {
  source: FlowNode
  target: FlowNode
  sourceHandle: string
  targetHandle: string
} | null {
  if (!connection.source || !connection.target) return null
  const a = nodes.find((n) => n.id === connection.source)
  const b = nodes.find((n) => n.id === connection.target)
  if (!a || !b) return null

  if (canConnectNodes(a, b)) {
    return {
      source: a,
      target: b,
      sourceHandle: normalizeHandleId(connection.sourceHandle, 'source'),
      targetHandle: normalizeHandleId(connection.targetHandle, 'target'),
    }
  }
  if (canConnectNodes(b, a)) {
    return {
      source: b,
      target: a,
      sourceHandle: normalizeHandleId(connection.targetHandle, 'source'),
      targetHandle: normalizeHandleId(connection.sourceHandle, 'target'),
    }
  }
  return null
}

/** 修正反方向的边（子→父 转为 父→子） */
export function correctEdgeDirection<T extends {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}>(edge: T, nodes: FlowNode[]): T {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)
  if (canConnectNodes(sourceNode, targetNode)) {
    return {
      ...edge,
      sourceHandle: toSourceHandle(edge.sourceHandle),
      targetHandle: toTargetHandle(edge.targetHandle),
    }
  }
  if (!canConnectNodes(targetNode, sourceNode)) return edge
  return {
    ...edge,
    source: edge.target,
    target: edge.source,
    sourceHandle: toSourceHandle(edge.targetHandle),
    targetHandle: toTargetHandle(edge.sourceHandle),
  }
}

export function isValidModelConnection(
  connection: Connection,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
): boolean {
  const source = nodes.find((n) => n.id === connection.source)
  const target = nodes.find((n) => n.id === connection.target)
  if (!isStrictParentChildConnection(source, target)) return false
  return !hasEdgeBetweenNodes(edges, source!.id, target!.id)
}

export function getConnectionRuleHint(
  source?: FlowNode | null,
  target?: FlowNode | null,
  edges: Array<Pick<FlowEdge, 'source' | 'target'>> = [],
): string {
  if (!source || !target) return 'Invalid connection'

  if (!isStrictParentChildConnection(source, target)) {
    if (isStrictParentChildConnection(target, source)) {
      return '请连接父节点与子节点（拖线方向不限，系统将自动规范为父→子）'
    }
    if (source.parentNode || target.parentNode) {
      return '请从父容器连到子设备（例如 ESS → Battery）'
    }
    return '请从父节点连到子节点（例如 Station → Generator；任意设备均可直连 Station）'
  }

  if (hasEdgeBetweenNodes(edges, source.id, target.id) || hasEdgeBetweenNodes(edges, target.id, source.id)) {
    return '这两个节点之间已有连线'
  }
  return 'Invalid connection'
}
