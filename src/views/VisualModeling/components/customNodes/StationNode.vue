<template>
  <div class="voltage-class station-node" :class="{ selected: selected }">
    <!-- 底部连接点（向下连接子节点） -->
    <Handle
      type="source"
      :position="Position.Bottom"
      id="bottom"
      class="station-node__handle station-node__handle--bottom"
    />

    <div class="station-node__icon">
      <AppIcon name="i-tabler-building-factory-2" class="station-node__icon-svg" />
    </div>
    <div class="station-node__label">{{ data.label || 'Station' }}</div>
    <div v-if="data.description" class="station-node__desc">{{ data.description }}</div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  data: {
    label: string
    description?: string
  }
  selected?: boolean
}>()
</script>

<style lang="scss" scoped>
.voltage-class {
  .station-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 24px;
    background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
    border: 2px solid #3949ab;
    border-radius: 10px;
    min-width: 140px;
    cursor: grab;
    box-shadow: 0 4px 16px rgba(26, 35, 126, 0.35);
    transition: all 0.2s ease;
    position: relative;
    overflow: visible;

    &.selected,
    &:hover {
      border-color: #7986cb;
      box-shadow: 0 0 0 2px rgba(121, 134, 203, 0.5), 0 4px 16px rgba(26, 35, 126, 0.5);
    }

    &__icon {
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

    &__label {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      letter-spacing: 0.5px;
    }

    &__desc {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.65);
      margin-top: 4px;
      text-align: center;
    }

    &__handle {
      width: 12px;
      height: 12px;
      background-color: #7986cb;
      border: 2px solid #ffffff;
      border-radius: 50%;
      position: absolute;
      z-index: 10;

      &--bottom {
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
      }

      &:hover {
        background-color: #9fa8da;
        transform: translateX(-50%) scale(1.3);
      }
    }
  }
}
</style>
