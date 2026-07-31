<template>
  <div class="flow-minimap" role="img" aria-label="Flow minimap">
    <svg :viewBox="viewBox" preserveAspectRatio="none">
      <g class="flow-minimap__edges">
        <line v-for="edge in visibleEdges" :key="edge.id" :x1="edge.source.x" :y1="edge.source.y" :x2="edge.target.x" :y2="edge.target.y" :stroke="edge.color" />
      </g>
      <rect v-for="node in visibleNodes" :key="node.id" class="flow-minimap__node" :x="node.x" :y="node.y" :width="node.width" :height="node.height" rx="3" />
      <rect class="flow-minimap__viewport" :x="viewportBounds.x" :y="viewportBounds.y" :width="viewportBounds.width" :height="viewportBounds.height" rx="1" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVueFlow, type Edge as FlowEdge } from '@vue-flow/core'

const WIDTH = 200
const HEIGHT = 200
const PADDING = 10
const { edges, viewport, dimensions, getNodesInitialized } = useVueFlow()

const visibleNodes = computed(() => getNodesInitialized.value.filter((node) => !node.hidden).map((node) => ({
  id: node.id,
  x: node.computedPosition.x,
  y: node.computedPosition.y,
  width: node.dimensions.width || 1,
  height: node.dimensions.height || 1,
})))

const nodeById = computed(() => new Map(visibleNodes.value.map((node) => [node.id, node])))

const bounds = computed(() => {
  const nodes = visibleNodes.value
  if (!nodes.length) return { x: -1, y: -1, width: 2, height: 2 }
  const minX = Math.min(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxX = Math.max(...nodes.map((node) => node.x + node.width))
  const maxY = Math.max(...nodes.map((node) => node.y + node.height))
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) }
})

const scale = computed(() => Math.max(bounds.value.width / WIDTH, bounds.value.height / HEIGHT, 0.0001))
const viewBox = computed(() => {
  const width = WIDTH * scale.value + PADDING * 2 * scale.value
  const height = HEIGHT * scale.value + PADDING * 2 * scale.value
  return `${bounds.value.x - PADDING * scale.value} ${bounds.value.y - PADDING * scale.value} ${width} ${height}`
})

const visibleEdges = computed(() => (edges.value as FlowEdge[]).flatMap((edge) => {
  const source = nodeById.value.get(edge.source)
  const target = nodeById.value.get(edge.target)
  if (!source || !target) return []
  return [{
    id: edge.id,
    source: { x: source.x + source.width / 2, y: source.y + source.height / 2 },
    target: { x: target.x + target.width / 2, y: target.y + target.height / 2 },
    color: typeof edge.style?.stroke === 'string' ? edge.style.stroke : '#2878ff',
  }]
}))

const viewportBounds = computed(() => {
  const zoom = viewport.value.zoom || 1
  return {
    x: -viewport.value.x / zoom,
    y: -viewport.value.y / zoom,
    width: dimensions.value.width / zoom,
    height: dimensions.value.height / zoom,
  }
})
</script>

<style lang="scss" scoped>
.flow-minimap {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 5;
  width: 200px;
  height: 200px;
  padding: 10px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);

  svg { display: block; width: 100%; height: 100%; }
}

.flow-minimap__edges line {
  fill: none;
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
}

.flow-minimap__node {
  fill: #edf4ff;
  stroke: #2878ff;
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.flow-minimap__viewport {
  fill: rgba(255, 105, 0, 0.06);
  stroke: #ff6900;
  stroke-width: 2.5px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
</style>
