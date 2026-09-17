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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BaseEdge,
  getSmoothStepPath,
  useVueFlow,
  type EdgeProps,
} from '@vue-flow/core'
import topologyDeleteIcon from '@/assets/icons/topology-delete.svg'

const props = defineProps<EdgeProps>()
const { removeEdges } = useVueFlow()

const edgePath = computed(() => getSmoothStepPath(props))
const path = computed(() => edgePath.value[0])
const labelX = computed(() => edgePath.value[1])
const labelY = computed(() => edgePath.value[2])

const edgeStyle = computed(() => ({
  ...props.style,
  stroke: props.selected ? '#035DEF' : '#B3CEFA',
  strokeWidth: props.selected ? 6 : 3,
}))

const handleDelete = () => {
  removeEdges([props.id])
}
</script>

<style scoped lang="scss">
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
</style>
