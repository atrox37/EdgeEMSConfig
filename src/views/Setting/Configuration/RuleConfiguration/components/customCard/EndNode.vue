<template>
  <div class="voltage-class end-node">
    <!-- 左侧连接点（只能接收连接） -->
    <Handle
      type="target"
      :position="Position.Left"
      id="left"
      class="end-node__handle end-node__handle--left"
    />

    <!-- 卡片内容 -->
    <div class="end-node__content">
      <div class="end-node__icon">
        <AppIcon name="i-tabler-circle-check-filled" className="end-node__glyph" />
      </div>
      <div class="end-node__info">
        <div class="end-node__name">END</div>
        <div class="end-node__description">Rule chain exit point</div>
      </div>
    </div>
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
.end-node {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: #3f444d;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  min-width: 200px;
  border: 1px solid rgba(179, 206, 250, 0.9);
  box-shadow: none;
  position: relative;
}

.end-node:hover {
  border-color: #035def;
  box-shadow: none;
}

.end-node:active {
  cursor: grabbing;
}

.end-node__handle {
  width: 15px;
  height: 15px;
  box-sizing: border-box;
  background-color: #ffffff;
  border: 1px solid #b3cefa;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  cursor: crosshair;
}

.end-node__handle--left {
  left: -7px;
}

.end-node__handle:hover {
  background-color: #035def;
  transform: translateY(-50%) scale(1.2);
}

.end-node__handle.connecting {
  background-color: #035def;
}

.end-node__content {
  display: flex;
  align-items: center;
  flex: 1;
  padding: 0 8px;
}

.end-node__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b2f36;
  border-radius: 6px;
  margin-right: 12px;
}

.end-node__icon :deep(.end-node__glyph) {
  width: 20px;
  height: 20px;
  color: #ffffff;
}

.end-node__info {
  flex: 1;
}

.end-node__name {
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
  font-size: 14px;
}

.end-node__description {
  font-size: 12px;
  color: #ffffff;
  line-height: 1.4;
}
</style>
