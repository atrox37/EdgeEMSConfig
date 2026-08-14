<template>
  <BaseEdge :id="id" :path="path" :style="edgeStyle" />

  <g
    v-if="selected"
    class="deletable-edge__delete-svg nodrag nopan"
    @click.stop="handleDelete"
  >
    <circle :cx="labelX" :cy="labelY" r="18" fill="#ffffff" />
    <image
      :href="topologyDeleteIcon"
      :x="labelX - 14"
      :y="labelY - 14"
      width="28"
      height="28"
      preserveAspectRatio="xMidYMid meet"
    />
  </g>

  <EdgeLabelRenderer>
    <button
      v-if="selected"
      type="button"
      class="deletable-edge__delete nodrag nopan"
      :style="deleteButtonStyle"
      aria-label="Delete connection"
      title="Delete connection"
      @click.stop="handleDelete"
    >
      <img :src="topologyDeleteIcon" alt="" aria-hidden="true" draggable="false" />
      <span aria-hidden="true">×</span>
    </button>
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useVueFlow,
  type EdgeProps,
} from '@vue-flow/core'
import topologyDeleteIcon from '@/assets/icons/topology-delete.svg'

const props = defineProps<EdgeProps>()
const { removeEdges } = useVueFlow()

// EdgeProps 的 sourceX/sourceY/targetX/targetY 会在节点移动时更新，
// 路径必须保持响应式计算，否则边只会停留在首次渲染的位置。
const edgePath = computed(() => getSmoothStepPath(props))
const path = computed(() => edgePath.value[0])
const labelX = computed(() => edgePath.value[1])
const labelY = computed(() => edgePath.value[2])

const edgeStyle = computed(() => ({
  ...props.style,
  stroke: props.selected ? '#035DEF' : '#B3CEFA',
  strokeWidth: props.selected ? 6 : 3,
}))

const deleteButtonStyle = computed(() => ({
  transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
}))

const handleDelete = () => {
  removeEdges([props.id])
}
</script>

<style scoped lang="scss">
:global(.vue-flow__edge-labels) {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
}

.deletable-edge__delete {
  display: none;
}

.deletable-edge__delete-svg {
  position: relative;
  z-index: 1001;
  cursor: pointer;
  pointer-events: all;
}

.deletable-edge__delete-svg circle,
.deletable-edge__delete-svg image {
  pointer-events: all;
}

.deletable-edge__delete-svg:hover {
  filter: brightness(0.92);
}

/* Kept as a fallback for Vue Flow versions that mount EdgeLabelRenderer in the DOM. */
.deletable-edge__delete {
  position: relative;
  z-index: 1000;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: all;
  box-shadow: none;
}

.deletable-edge__delete img {
  display: block;
  width: 28px;
  height: 28px;
  pointer-events: none;
}

.deletable-edge__delete span {
  display: none;
}

.deletable-edge__delete {
  display: none !important;
}

.deletable-edge__delete:hover img {
  filter: brightness(0.92);
}
</style>
