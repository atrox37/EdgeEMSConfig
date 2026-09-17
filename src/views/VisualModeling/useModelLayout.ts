import { Position, type Edge as FlowEdge, type GraphNode, type Node as FlowNode } from '@vue-flow/core'
import dagre from '@dagrejs/dagre'
import { getNodeInstanceId } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

const DEFAULT_NODE_SIZE: Record<string, { width: number; height: number }> = {
  product: { width: 110, height: 120 },
  productImage: { width: 280, height: 262 },
}

/** 图片设备节点绑定实例后，底部实例标签占用的高度（含间距） */
const INSTANCE_BADGE_EXTRA_HEIGHT = 34
const COMPONENT_DETAILS_EXTRA_HEIGHT = 260

const LAYOUT = {
  stationY: 24,
  rowGapY: 100,
  topGapX: 36,
  canvasCenterX: 520,
}

function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  return parseFloat(val) || fallback
}

function hasImage(node: FlowNode): boolean {
  return !!(node.data as { imageUrl?: string })?.imageUrl
}

function getInstanceBadgeExtraHeight(node: FlowNode): number {
  if (node.type !== 'product' || !hasImage(node)) return 0
  return getNodeInstanceId(node.data as ModelNodeData) !== null ? INSTANCE_BADGE_EXTRA_HEIGHT : 0
}

function getNodeSize(node: FlowNode | GraphNode): { width: number; height: number } {
  const type = node.type ?? 'product'
  const defaults =
    type === 'product' && hasImage(node as FlowNode)
      ? DEFAULT_NODE_SIZE.productImage
      : DEFAULT_NODE_SIZE[type] ?? DEFAULT_NODE_SIZE.product
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
    height:
      height
      + getInstanceBadgeExtraHeight(node as FlowNode)
      + ((node.data as { uiExpanded?: boolean } | undefined)?.uiExpanded
        ? COMPONENT_DETAILS_EXTRA_HEIGHT
        : 0),
  }
}

/**
 * 分层自动布局：
 * 1. Station 置顶居中
 * 2. 顶层容器与 Station 子设备横向排列
 * 3. 容器内子节点网格排布，并自适应容器尺寸
 */
export function layoutModelGraph(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'TB' | 'LR' = 'TB',
): FlowNode[] {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction })

  const topLevelNodes = nodes.filter((node) => !node.parentNode)
  const topLevelIds = new Set(topLevelNodes.map((node) => node.id))
  const isHorizontal = direction === 'LR'
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom
  const targetPosition = isHorizontal ? Position.Left : Position.Top

  topLevelNodes.forEach((node) => {
    const { width, height } = getNodeSize(node)
    graph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    if (topLevelIds.has(edge.source) && topLevelIds.has(edge.target)) {
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
      ...(node.parentNode ? { hidden: true } : {}),
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
  const nodeMap = new Map(nodes.filter((node) => !node.parentNode).map((node) => [node.id, node]))

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
