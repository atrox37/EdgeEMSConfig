<template>
  <div class="voltage-class start-node">
    <!-- 卡片内容 -->
    <div class="start-node__content">
      <div class="start-node__icon">
        <AppIcon name="i-tabler-caret-right-filled" className="start-node__glyph" />
      </div>
      <div class="start-node__info">
        <div class="start-node__name">START</div>
        <div class="start-node__description">Rule chain entry point</div>
      </div>
    </div>

    <!-- 右侧连接点（只能发起连接） -->
    <Handle
      type="source"
      :position="Position.Right"
      id="right"
      class="start-node__handle start-node__handle--right"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  data: any
}>()
</script>

<style lang="scss" scoped>
.start-node {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #ffcc80;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  min-width: 200px;
  border-left: 4px solid rgba(255, 138, 0, 0.4);
  border-top: 2px solid rgba(255, 138, 0, 0.4);
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
}

.start-node:hover {
  border-color: #ff8a00;
  box-shadow: 4px 4px 12px rgba(255, 138, 0, 0.25);
}

.start-node:active {
  cursor: grabbing;
}

.start-node__handle {
  width: 12px;
  height: 12px;
  background-color: #ff8a00;
  border: 2px solid white;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: crosshair;
}

.start-node__handle--right {
  right: -6px;
}

.start-node__handle:hover {
  background-color: #ffb74d;
  transform: translateY(-50%) scale(1.2);
}

.start-node__content {
  display: flex;
  align-items: center;
  flex: 1;
  padding: 0 8px;
}

.start-node__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffa726;
  border-radius: 6px;
  margin-right: 12px;
}

.start-node__icon :deep(.start-node__glyph) {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.start-node__info {
  flex: 1;
}

.start-node__name {
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
  font-size: 14px;
}

.start-node__description {
  font-size: 12px;
  color: #ffffff;
  line-height: 1.4;
}
</style>