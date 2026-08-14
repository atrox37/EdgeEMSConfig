<template>
  <div
    class="rule-history-execution-flow"
    :style="{ width: `${layout.width}px`, height: `${layout.height}px` }"
  >
    <svg
      class="rule-history-execution-flow__connections"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="rule-history-flow-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#b0c6ee" />
        </marker>
      </defs>
      <g v-for="edge in layout.edges" :key="edge.key">
        <path
          :d="edge.path"
          fill="none"
          stroke="#b0c6ee"
          stroke-width="1.5"
          marker-end="url(#rule-history-flow-arrow)"
        />
        <text
          v-if="edge.label"
          :x="edge.labelX"
          :y="edge.labelY"
          class="rule-history-execution-flow__edge-label"
        >
          {{ edge.label }}
        </text>
      </g>
    </svg>

    <div
      v-for="item in layout.nodes"
      :key="item.key"
      class="rule-history-execution-flow__node"
      :class="[`is-${item.status}`, `kind-${item.kind}`]"
      :title="isBoundaryNode(item) ? getNodeTitle(item) : item.description ? `${item.title}\n${item.description}` : item.title"
      :style="{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        minHeight: `${item.height}px`,
      }"
    >
      <div class="rule-history-execution-flow__title">
        <span v-if="!isBoundaryNode(item) && item.status !== 'default'" class="rule-history-execution-flow__status">
          <span class="rule-history-execution-flow__status-dot">•</span>
          {{ item.status === 'error' ? 'Error' : 'Interrupt' }}
        </span>
        <span>{{ getNodeTitle(item) }}</span>
      </div>
      <div v-if="!isBoundaryNode(item) && item.description" class="rule-history-execution-flow__description">
        {{ item.description }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  RuleHistoryExecutionGraph,
  RuleHistoryExecutionGraphEdge,
  RuleHistoryExecutionGraphNode,
} from '@/types/controlRule'
import {
  formatExecutionGraphNodeDescription,
  getExecutionGraphNodeStatus,
} from '@/utils/ruleHistoryDisplay'

interface Props {
  graph: RuleHistoryExecutionGraph
}

interface LayoutNode {
  key: string
  source: RuleHistoryExecutionGraphNode
  kind: string
  status: 'default' | 'error' | 'interrupt'
  title: string
  description: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  row: number
}

interface LayoutEdge {
  key: string
  path: string
  label: string
  labelX: number
  labelY: number
}

const props = defineProps<Props>()

const getNodeWidth = (node: RuleHistoryExecutionGraphNode): number =>
  node.type === 'start' || node.type === 'end' ? 65 : 250

const getNodeHeight = (node: RuleHistoryExecutionGraphNode): number =>
  node.type === 'start' || node.type === 'end' ? 30 : 50

const isBoundaryNode = (node: LayoutNode): boolean =>
  node.kind === 'start' || node.kind === 'end'

const getNodeTitle = (node: LayoutNode): string => {
  if (node.kind === 'start') return 'START'
  if (node.kind === 'end') return 'END'
  return node.title
}

const layout = computed(() => {
  const sourceNodes = props.graph.nodes
  const sourceEdges = props.graph.edges
  const incoming = new Map<string, string[]>()
  const outgoing = new Map<string, RuleHistoryExecutionGraphEdge[]>()

  sourceEdges.forEach((edge) => {
    incoming.set(edge.target, [...(incoming.get(edge.target) || []), edge.source])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge])
  })

  const depthMemo = new Map<string, number>()
  const getDepth = (id: string, visiting = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!
    if (visiting.has(id)) return 0
    visiting.add(id)
    const depth = Math.max(
      -1,
      ...(incoming.get(id) || []).map((parent) => getDepth(parent, new Set(visiting))),
    ) + 1
    depthMemo.set(id, depth)
    return depth
  }

  sourceNodes.forEach((node) => getDepth(node.id))

  const rowById = new Map<string, number>()
  let nextBranchRow = 1
  const placeRows = (id: string, row: number, visiting = new Set<string>()) => {
    if (visiting.has(id) || rowById.has(id)) return
    rowById.set(id, row)
    const children = outgoing.get(id) || []
    children.forEach((edge, index) => {
      const childRow = index === 0 ? row : nextBranchRow++
      placeRows(edge.target, childRow, new Set([...visiting, id]))
    })
  }

  const roots = sourceNodes.filter((node) => !incoming.has(node.id))
  roots.forEach((node, index) => placeRows(node.id, index))
  sourceNodes.forEach((node) => placeRows(node.id, nextBranchRow++))

  const columnWidths = new Map<number, number>()
  const rowHeights = new Map<number, number>()
  const nodes: LayoutNode[] = sourceNodes.map((source) => {
    const status = getExecutionGraphNodeStatus(source)
    const item: LayoutNode = {
      key: source.id,
      source,
      kind: source.type,
      status,
      title: source.label,
      description: formatExecutionGraphNodeDescription(source),
      x: 0,
      y: 0,
      width: getNodeWidth(source),
      height: getNodeHeight(source),
      depth: depthMemo.get(source.id) || 0,
      row: rowById.get(source.id) || 0,
    }
    columnWidths.set(item.depth, Math.max(columnWidths.get(item.depth) || 0, item.width))
    rowHeights.set(item.row, Math.max(rowHeights.get(item.row) || 0, item.height))
    return item
  })
  const placed = new Map(nodes.map((node) => [node.key, node]))

  const columnX = new Map<number, number>()
  let currentX = 32
  Array.from(columnWidths.keys()).sort((a, b) => a - b).forEach((depth) => {
    columnX.set(depth, currentX)
    currentX += (columnWidths.get(depth) || 250) + 96
  })
  nodes.forEach((node) => {
    node.x = columnX.get(node.depth) || 32
    const rowTop = 18 + node.row * 74
    node.y = rowTop + ((rowHeights.get(node.row) || node.height) - node.height) / 2
  })

  const edges: LayoutEdge[] = sourceEdges.flatMap((edge, index) => {
    const from = placed.get(edge.source)
    const to = placed.get(edge.target)
    if (!from || !to) return []
    const startX = from.x + from.width
    const startY = from.y + from.height / 2
    const endX = to.x
    const endY = to.y + to.height / 2
    const middleX = startX + Math.max(18, (endX - startX) / 2)
    const path = startY === endY
      ? `M ${startX} ${startY} H ${endX}`
      : `M ${startX} ${startY} H ${middleX - 12} C ${middleX} ${startY}, ${middleX} ${endY}, ${middleX + 12} ${endY} H ${endX}`
    return [{
      key: `${edge.source}-${edge.target}-${index}`,
      path,
      label: edge.label || edge.port || '',
      labelX: middleX,
      labelY: startY + (endY - startY) / 2 - 6,
    }]
  })

  return {
    nodes,
    edges,
    width: Math.max(1041, ...nodes.map((node) => node.x + node.width + 32)),
    height: Math.max(120, ...nodes.map((node) => node.y + node.height + 18)),
  }
})
</script>

<style scoped lang="scss">
.rule-history-execution-flow {
  position: relative;
  flex: 0 0 auto;
  min-width: 1041px;
  border-radius: 8px;
  background: #f5f6fa;
  overflow: hidden;

  &__connections {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__edge-label {
    fill: #666;
    font-family: Arimo, sans-serif;
    font-size: 14px;
    text-anchor: middle;
  }

  &__node {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 7px 12px;
    box-sizing: border-box;
    border: 1px solid #B0C6EE;
    border-radius: 4px;
    background: #ECEEFA;

    color: #333;
    font-family: Arimo, sans-serif;
    overflow: hidden;

    &.kind-start,
    &.kind-end {
      align-items: center;
      justify-content: center;
      padding: 4 10px;
      text-transform: uppercase;
    }

    &.is-error {
      border-color: transparent;
      background: rgba(245, 63, 63, 0.1);
    }

    &.is-interrupt {
      border-color: transparent;
      background: rgba(255, 107, 10, 0.1);
    }
  }

  &__title {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    flex: 0 0 auto;
    font-weight: 700;

    .is-error & {
      color: #f53f3f;
    }

    .is-interrupt & {
      color: #ff6b0a;
    }
  }

  &__status-dot {
    font-size: 16px;
  }

  &__description {
    min-width: 0;
    overflow: hidden;
    color: #666;
    font-size: 12px;
    line-height: 20px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .is-error &__description {
    color: #f53f3f;
  }

  .is-interrupt &__description {
    color: #ff6b0a;
  }
}
</style>
