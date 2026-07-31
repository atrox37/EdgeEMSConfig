import { Position, type Edge as FlowEdge, type GraphNode, type Node as FlowNode } from '@vue-flow/core'
import { CONTAINER_DISPLAY_ORDER, isContainerProduct } from '@/constants/deviceProducts'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

const DEFAULT_NODE_SIZE: Record<string, { width: number; height: number }> = {
  station: { width: 180, height: 90 },
  product: { width: 110, height: 120 },
  productImage: { width: 280, height: 262 },
  group: { width: 280, height: 254 },
}

/** 图片设备节点绑定实例后，底部实例标签占用的高度（含间距） */
const INSTANCE_BADGE_EXTRA_HEIGHT = 34
const COMPONENT_DETAILS_EXTRA_HEIGHT = 260

const LAYOUT = {
  stationY: 24,
  rowGapY: 100,
  childHeaderH: 44,
  childPaddingX: 12,
  childPaddingY: 12,
  childGapX: 12,
  childGapY: 12,
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
  const instances = normalizeNodeInstances(node.data as ModelNodeData)
  return instances.length > 0 ? INSTANCE_BADGE_EXTRA_HEIGHT : 0
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

function compareChildNodes(a: FlowNode, b: FlowNode): number {
  const labelA =
    (a.data as { label?: string })?.label ||
    (a.data as { productName?: string })?.productName ||
    a.id
  const labelB =
    (b.data as { label?: string })?.label ||
    (b.data as { productName?: string })?.productName ||
    b.id
  return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' })
}

function sortContainerGroups(groups: FlowNode[]): FlowNode[] {
  return [...groups].sort((a, b) => {
    const pa = (a.data as { productName?: string })?.productName ?? ''
    const pb = (b.data as { productName?: string })?.productName ?? ''
    const ia = CONTAINER_DISPLAY_ORDER.indexOf(pa as (typeof CONTAINER_DISPLAY_ORDER)[number])
    const ib = CONTAINER_DISPLAY_ORDER.indexOf(pb as (typeof CONTAINER_DISPLAY_ORDER)[number])
    const rankA = ia === -1 ? CONTAINER_DISPLAY_ORDER.length : ia
    const rankB = ib === -1 ? CONTAINER_DISPLAY_ORDER.length : ib
    return rankA - rankB
  })
}

export function getGroupContentLayout(
  children: FlowNode[],
  expanded: boolean,
  isContainer: boolean,
): { size: { width: number; height: number }; positions: Map<string, { x: number; y: number }> } {
  const positions = new Map<string, { x: number; y: number }>()
  const sortedChildren = [...children].sort(compareChildNodes)
  const groupBaseWidth = DEFAULT_NODE_SIZE.group.width
  const groupCollapsedHeight = DEFAULT_NODE_SIZE.group.height

  const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(sortedChildren.length))))
  const rowHeights: number[] = []

  sortedChildren.forEach((child, index) => {
    const { height } = getNodeSize(child)
    const row = Math.floor(index / cols)
    if (!rowHeights[row]) rowHeights[row] = 0
    rowHeights[row] = Math.max(rowHeights[row], height)
  })

  sortedChildren.forEach((child, index) => {
    const { width, height } = getNodeSize(child)
    const col = index % cols
    const row = Math.floor(index / cols)

    let x = LAYOUT.childPaddingX
    for (let c = 0; c < col; c++) {
      const prev = sortedChildren[row * cols + c]
      if (prev) x += getNodeSize(prev).width + LAYOUT.childGapX
    }

    const detailsHeight = expanded ? (isContainer ? 178 : 222) : 0
    const childStartY = 54 + 202 + detailsHeight
    let y = childStartY
    for (let r = 0; r < row; r++) {
      y += (rowHeights[r] ?? 0) + LAYOUT.childGapY
    }

    positions.set(child.id, { x, y })
  })

  let maxRight = LAYOUT.childPaddingX
  let maxBottom = 54 + 202 + (expanded ? (isContainer ? 178 : 222) : 0)
  sortedChildren.forEach((child) => {
    const pos = positions.get(child.id)
    if (!pos) return
    const { width, height } = getNodeSize(child)
    maxRight = Math.max(maxRight, pos.x + width + LAYOUT.childPaddingX)
    maxBottom = Math.max(maxBottom, pos.y + height + LAYOUT.childPaddingY)
  })

  return {
    size: {
      width: Math.max(groupBaseWidth, maxRight),
      height: Math.max(groupCollapsedHeight, maxBottom),
    },
    positions,
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
  _edges: FlowEdge[],
  direction: 'TB' | 'LR' = 'TB',
): FlowNode[] {
  const isHorizontal = direction === 'LR'
  const sourcePosition = isHorizontal ? Position.Right : Position.Bottom
  const targetPosition = isHorizontal ? Position.Left : Position.Top

  const positions = new Map<string, { x: number; y: number }>()
  const sizeUpdates = new Map<string, { width: number; height: number }>()

  const station = nodes.find((n) => n.type === 'station' && !n.parentNode)
  const topLevel = nodes.filter((n) => !n.parentNode && n.id !== station?.id)

  const groups = sortContainerGroups(
    topLevel.filter(
      (n) => n.type === 'group' || isContainerProduct((n.data as { productName?: string })?.productName),
    ),
  )
  const topProducts = topLevel
    .filter((n) => !groups.includes(n))
    .sort(compareChildNodes)

  const rowItems = [...groups, ...topProducts]
  const rowWidths = rowItems.map((n) => getNodeSize(n).width)
  const rowTotalW =
    rowWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, rowItems.length - 1) * LAYOUT.topGapX

  let rowX = LAYOUT.canvasCenterX - rowTotalW / 2
  const rowY = LAYOUT.stationY + (station ? getNodeSize(station).height + LAYOUT.rowGapY : 0)

  if (station) {
    const { width } = getNodeSize(station)
    positions.set(station.id, {
      x: LAYOUT.canvasCenterX - width / 2,
      y: LAYOUT.stationY,
    })
  }

  rowItems.forEach((node) => {
    const { width } = getNodeSize(node)
    positions.set(node.id, { x: rowX, y: rowY })
    rowX += width + LAYOUT.topGapX

    const children = nodes
      .filter((n) => n.parentNode === node.id)
      .sort(compareChildNodes)
    if (!children.length) return

    const data = node.data as { uiExpanded?: boolean; topologyType?: string; productName?: string }
    const expanded = data.uiExpanded === true
    const isContainer = data.topologyType === 'container' || /container|distribution board/i.test(data.productName ?? '')
    const groupLayout = getGroupContentLayout(children, expanded, isContainer)
    sizeUpdates.set(node.id, groupLayout.size)

    const childPositions = groupLayout.positions
    childPositions.forEach((pos, id) => positions.set(id, pos))
  })

  return nodes.map((node) => {
    const pos = positions.get(node.id)
    const size = sizeUpdates.get(node.id)
    const base = {
      ...node,
      sourcePosition,
      targetPosition,
      ...(node.parentNode ? { hidden: true } : {}),
      ...(pos ? { position: { x: pos.x, y: pos.y } } : {}),
    }

    if (!size) return base

    return {
      ...base,
      data: {
        ...node.data,
        width: size.width,
        height: size.height,
      },
      style: {
        ...(node.style as Record<string, string | number>),
        width: `${size.width}px`,
        height: `${size.height}px`,
      },
    }
  })
}
