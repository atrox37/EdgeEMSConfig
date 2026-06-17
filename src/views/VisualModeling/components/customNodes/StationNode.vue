<template>
  <div
    class="voltage-class station-node"
    :class="{ selected: selected, 'station-node--view-mode': hideConnectionHandles }"
  >
    <NodeConnectionHandles />

    <div class="station-node__icon">
      <AppIcon name="i-tabler-building-factory-2" class="station-node__icon-svg" />
    </div>
    <div class="station-node__label">{{ data.label || 'Station' }}</div>
    <div v-if="data.description" class="station-node__desc">{{ data.description }}</div>
    <NodeInstanceBadges
      v-if="boundInstances.length"
      :instances="boundInstances"
      variant="dark"
      class="station-node__instances"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { MODELING_EDITOR_KEY } from '../../modelingEditorContext'
import AppIcon from '@/components/AppIcon.vue'
import NodeConnectionHandles from '../NodeConnectionHandles.vue'
import NodeInstanceBadges from '../NodeInstanceBadges.vue'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

const props = defineProps<{
  data: ModelNodeData
  selected?: boolean
}>()

const editorCtx = inject(MODELING_EDITOR_KEY, null)
const hideConnectionHandles = computed(() => editorCtx?.isViewMode.value ?? false)

const boundInstances = computed(() => normalizeNodeInstances(props.data))
</script>

<style lang="scss" scoped>
.station-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 24px 12px;
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  border: 2px solid #3949ab;
  border-radius: 10px;
  min-width: 140px;
  cursor: grab;
  box-shadow: 0 4px 16px rgba(26, 35, 126, 0.35);
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
}

.station-node.selected,
.station-node:hover {
  border-color: #7986cb;
  box-shadow: 0 0 0 2px rgba(121, 134, 203, 0.5), 0 4px 16px rgba(26, 35, 126, 0.5);
}

.station-node__icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;

  :deep(svg) {
    width: 24px;
    height: 24px;
    color: #ffffff !important;
  }
}

.station-node__label {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  letter-spacing: 0.5px;
}

.station-node__desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 4px;
  text-align: center;
}

.station-node__instances {
  margin-top: 8px;
  width: 100%;
}

.station-node:not(.station-node--view-mode):hover :deep(.node-connection-handle) {
  opacity: 1;
  pointer-events: all !important;
  background-color: #7986cb;
}

.station-node.station-node--view-mode :deep(.node-connection-handle) {
  pointer-events: none;
}
</style>
