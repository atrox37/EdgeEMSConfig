import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import { createFlowEdgeId } from '@/utils/defaultModelFlow'
import {
  hasEdgeBetweenNodesEitherDirection,
  isContainerNode,
} from '@/utils/modelFlowRules'

export interface TopologySyncPatch {
  nodeUpdates: Array<{ id: string; patch: Record<string, unknown> }>
  edgesToAdd: FlowEdge[]
  edgesToRemove: string[]
}

type PositionedNode = {
  id: string
  type?: string
  position: { x: number; y: number }
  parentNode?: string
}

export function getNodeAbsolutePosition(
  node: PositionedNode,
  nodes: PositionedNode[],
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let current: PositionedNode | undefined = node
  const visited = new Set<string>()
  while (current?.parentNode && !visited.has(current.parentNode)) {
    visited.add(current.parentNode)
    const parent = nodes.find((n) => n.id === current!.parentNode)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    current = parent
  }
  return { x, y }
}

function edgeIdsBetween(
  edges: Array<Pick<FlowEdge, 'id' | 'source' | 'target'>>,
  nodeA: string,
  nodeB: string,
): string[] {
  return edges
    .filter(
      (e) =>
        (e.source === nodeA && e.target === nodeB)
        || (e.source === nodeB && e.target === nodeA),
    )
    .map((e) => e.id)
}

function hierarchyEdge(source: string, target: string): FlowEdge {
  return {
    id: createFlowEdgeId(),
    source,
    target,
    sourceHandle: 'bottom-source',
    targetHandle: 'top-target',
  } as FlowEdge
}

/** 从容器脱离：转绝对坐标，移除容器边，必要时补 Station 边 */
export function buildDetachPatch(
  nodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
): TopologySyncPatch | null {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node?.parentNode) return null

  const parentId = node.parentNode
  const abs = getNodeAbsolutePosition(node, nodes)
  const edgesToRemove = edgeIdsBetween(edges, parentId, nodeId)

  const station = nodes.find((n) => n.type === 'station')
  const edgesToAdd: FlowEdge[] = []
  if (
    station
    && !hasEdgeBetweenNodesEitherDirection(edges, station.id, nodeId)
  ) {
    edgesToAdd.push(hierarchyEdge(station.id, nodeId))
  }

  return {
    nodeUpdates: [{
      id: nodeId,
      patch: {
        parentNode: undefined,
        extent: undefined,
        position: abs,
      },
    }],
    edgesToAdd,
    edgesToRemove,
  }
}

/** 归入容器：设相对坐标，补容器边，移除 Station 直连边 */
export function buildAttachPatch(
  nodeId: string,
  containerId: string,
  relativePosition: { x: number; y: number },
  nodes: FlowNode[],
  edges: FlowEdge[],
): TopologySyncPatch {
  const station = nodes.find((n) => n.type === 'station')
  const edgesToRemove: string[] = []
  if (station) {
    edgesToRemove.push(...edgeIdsBetween(edges, station.id, nodeId))
  }

  const edgesToAdd: FlowEdge[] = []
  if (!hasEdgeBetweenNodesEitherDirection(edges, containerId, nodeId)) {
    edgesToAdd.push(hierarchyEdge(containerId, nodeId))
  }

  return {
    nodeUpdates: [{
      id: nodeId,
      patch: {
        parentNode: containerId,
        extent: undefined,
        position: relativePosition,
      },
    }],
    edgesToAdd,
    edgesToRemove,
  }
}

/** 连线后：容器 → 设备 时同步 parentNode */
export function buildConnectReparentPatch(
  parentId: string,
  childId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
): TopologySyncPatch | null {
  const parent = nodes.find((n) => n.id === parentId)
  const child = nodes.find((n) => n.id === childId)
  if (!parent || !child || child.type !== 'product') return null
  if (!isContainerNode(parent)) return null
  if (child.parentNode === parentId) return null

  const abs = getNodeAbsolutePosition(child, nodes)
  const rel = {
    x: abs.x - parent.position.x,
    y: abs.y - parent.position.y,
  }
  return buildAttachPatch(childId, parentId, rel, nodes, edges)
}

/** 补齐已有 parentNode 但缺少容器连线的节点 */
export function buildMissingContainerEdgePatches(
  nodes: FlowNode[],
  edges: FlowEdge[],
): TopologySyncPatch[] {
  const patches: TopologySyncPatch[] = []
  for (const node of nodes) {
    if (node.type !== 'product' || !node.parentNode) continue
    if (hasEdgeBetweenNodesEitherDirection(edges, node.parentNode, node.id)) continue
    const parent = nodes.find((n) => n.id === node.parentNode)
    if (!parent) continue
    const rel = node.position
    patches.push(buildAttachPatch(node.id, node.parentNode, rel, nodes, edges))
  }
  return patches
}
