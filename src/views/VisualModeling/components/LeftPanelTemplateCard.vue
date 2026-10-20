<template>
  <el-popover
    v-model:visible="tooltipVisible"
    :width="320"
    trigger="hover"
    placement="right-start"
    :show-after="700"
    :hide-after="100"
    :disabled="tooltipSuppressed"
    popper-class="left-panel-template-tooltip"
  >
    <template #reference>
      <div
        class="left-panel__image-item"
        draggable="true"
        @mousedown="tooltipVisible = false"
        @dragstart="handleDragStart"
        @dragend="releaseTooltipSuppression"
      >
        <div class="left-panel__image-type left-panel__image-type--product">Product</div>
        <div class="left-panel__image-content">
          <img
            v-if="template.imageUrl"
            :src="template.imageUrl"
            :alt="template.label"
            class="left-panel__image-thumb"
            draggable="false"
          />
          <div v-else class="left-panel__image-fallback">{{ template.label.slice(0, 2) }}</div>
          <div class="left-panel__image-label">{{ template.label }}</div>
        </div>
      </div>
    </template>

    <div class="left-panel-template-tooltip__content">
      <div class="left-panel-template-tooltip__title">{{ template.label }}</div>
      <div class="left-panel-template-tooltip__subtitle">Connection requirements:</div>

      <template v-if="requirements.length">
        <div
          v-for="(item, index) in requirements"
          :key="`${item.title}-${index}`"
          class="left-panel-template-tooltip__rule"
        >
          <div class="left-panel-template-tooltip__rule-title">{{ item.title }}</div>
          <div class="left-panel-template-tooltip__rule-detail">{{ item.detail }}</div>
        </div>
      </template>
      <div v-else class="left-panel-template-tooltip__empty">No connection requirements configured.</div>

      <div v-if="template.description" class="left-panel-template-tooltip__hint">
        <AppIcon name="i-tabler-info-circle" class="left-panel-template-tooltip__hint-icon" />
        <span>{{ template.description }}</span>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { ModelNodeTemplate } from '@/types/visualModeling'
import { buildConnectionRequirementViews } from '@/utils/topologyConnectionDisplay'

const TOOLTIP_SUPPRESS_MS = 400

const props = defineProps<{
  template: ModelNodeTemplate
}>()

const emit = defineEmits<{
  dragstart: [event: DragEvent]
}>()

const tooltipVisible = ref(false)
const tooltipSuppressed = ref(false)
let suppressTimer: number | undefined

const requirements = computed(() => buildConnectionRequirementViews(props.template.connections))

function clearSuppressTimer() {
  if (suppressTimer) {
    window.clearTimeout(suppressTimer)
    suppressTimer = undefined
  }
}

function suppressTooltip() {
  tooltipVisible.value = false
  tooltipSuppressed.value = true
  clearSuppressTimer()
}

function releaseTooltipSuppression() {
  clearSuppressTimer()
  suppressTimer = window.setTimeout(() => {
    tooltipSuppressed.value = false
    suppressTimer = undefined
  }, TOOLTIP_SUPPRESS_MS)
}

function handleDragStart(event: DragEvent) {
  suppressTooltip()
  emit('dragstart', event)
}

onBeforeUnmount(clearSuppressTimer)
</script>

<style lang="scss" scoped>
.left-panel__image-item {
  position: relative;
  height: 140px;
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 8px;
  cursor: grab;
  border: 1px solid #eeeeee;
  transition: all 300ms ease-out;
}

.left-panel__image-item:hover {
  border-color: #b3cefa;
}

.left-panel__image-item:active {
  border-color: #b3cefa;
  box-shadow: 0 6px 12px 0 #0000001a;
  background-color: #f8f9fb;
}

.left-panel__image-type {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  padding: 4px 6px;
  border-radius: 4px;
  background: rgba(3, 93, 239, 0.1);
  color: #035def;
  font-size: 12px;
  line-height: 1;
}

.left-panel__image-type--product {
  background: rgba(3, 93, 239, 0.1);
  color: #035def;
}

.left-panel__image-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .left-panel__image-thumb {
    margin-top: 28px;
    width: 72px;
    height: 72px;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
  }

  .left-panel__image-fallback {
    margin-top: 28px;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #4a90d9;
    background: rgba(74, 144, 217, 0.08);
    border-radius: 8px;
  }

  .left-panel__image-label {
    font-size: 14px;
    color: #333333;
    text-align: center;
    line-height: 1;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}
</style>

<style lang="scss">
.left-panel-template-tooltip.el-popover.el-popper {
  padding: 16px 18px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(15, 31, 61, 0.12);
}

.left-panel-template-tooltip__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.left-panel-template-tooltip__title {
  font-size: 18px;
  font-weight: 700;
  color: #1a2438;
  line-height: 1.3;
}

.left-panel-template-tooltip__subtitle {
  margin-top: -4px;
  font-size: 13px;
  font-weight: 600;
  color: #667085;
}

.left-panel-template-tooltip__rule {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.left-panel-template-tooltip__rule-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a2438;
}

.left-panel-template-tooltip__rule-detail {
  font-size: 13px;
  color: #667085;
}

.left-panel-template-tooltip__empty {
  font-size: 13px;
  color: #98a2b3;
}

.left-panel-template-tooltip__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(3, 93, 239, 0.08);
  color: #1d4fbf;
  font-size: 13px;
  line-height: 1.5;
}

.left-panel-template-tooltip__hint-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 16px;
  color: #035def;
}
</style>
