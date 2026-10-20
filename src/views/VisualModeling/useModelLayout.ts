import { Position, type Edge as FlowEdge, type GraphNode, type Node as FlowNode } from '@vue-flow/core'
import dagre from '@dagrejs/dagre'

const DEFAULT_NODE_SIZE: Record<string, { width: number; height: number }> = {
  product: { width: 280, height: 296 },
}

function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  return parseFloat(val) || fallback
}

function getNodeSize(node: FlowNode | GraphNode): { width: number; height: number } {
  const type = node.type ?? 'product'
  const defaults = DEFAULT_NODE_SIZE[type] ?? DEFAULT_NODE_SIZE.product
  const graphNode = node as GraphNode
  const style = node.style as Record<string, string | number> | undefined
  const data = node.data as { width?: number; height?: number } | undefined
  const width =
    graphNode.dimensions?.width ||
    parsePx(style?.width, defaults.width) ||
    parsePx(data?.width, defaults.width)
  const height =
    graphNode.dimensions?.height ||
    parsePx(style?.height, defaults.height) ||
    parsePx(data?.height, defaults.height)
  return {
    width,
    height,
  }
}

/** 扁平拓扑自动布局：所有 product 节点参与 dagre 排布。 */
export function layoutModelGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'TB' | 'LR' = 'TB',
): FlowNode[] {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const isHorizontal = direction === 'LR'
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom
  const targetPosition = isHorizontal ? Position.Left : Position.Top

  nodes.forEach((node) => {
    const { width, height } = getNodeSize(node)
    graph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      graph.setEdge(edge.source, edge.target)
    }
  })

  dagre.layout(graph)

  return nodes.map((node) => {
    const layoutNode = graph.node(node.id)
    const base = {
      ...node,
      sourcePosition,
      targetPosition,
    }

    if (!layoutNode) return base

    return {
      ...base,
      position: {
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
      },
    }
  })
}

function getLayoutCenter(node: FlowNode): { x: number; y: number } {
  const { width, height } = getNodeSize(node)
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  }
}

/** Align edge handles with the relative positions produced by auto layout. */
export function alignEdgeHandlesToLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  return edges.map((edge) => {
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) return edge

    const sourceCenter = getLayoutCenter(source)
    const targetCenter = getLayoutCenter(target)
    const dx = targetCenter.x - sourceCenter.x
    const dy = targetCenter.y - sourceCenter.y

    let sourceSide: 'top' | 'right' | 'bottom' | 'left'
    let targetSide: 'top' | 'right' | 'bottom' | 'left'
    if (Math.abs(dx) >= Math.abs(dy)) {
      sourceSide = dx >= 0 ? 'right' : 'left'
      targetSide = dx >= 0 ? 'left' : 'right'
    } else {
      sourceSide = dy >= 0 ? 'bottom' : 'top'
      targetSide = dy >= 0 ? 'top' : 'bottom'
    }

    return {
      ...edge,
      sourceHandle: sourceSide,
      targetHandle: targetSide,
    }
  })
}
