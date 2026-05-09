<template>
  <div
    class="voltage-class group-node"
    :class="{ selected: selected }"
    :style="containerStyle"
  >
    <!-- 可拖拽缩放句柄（右下、右、下三个方向） -->
    <NodeResizer
      :min-width="200"
      :min-height="150"
      :line-style="resizerLineStyle"
      :handle-style="resizerHandleStyle"
      :is-visible="selected"
      @resize="onResize"
    />

    <!-- 顶部连接点 -->
    <Handle
      type="target"
      :position="Position.Top"
      id="top"
      class="group-node__handle group-node__handle--top"
    />

    <!-- 标题栏 -->
    <div class="group-node__header" :style="headerStyle">
      <AppIcon :name="data.icon || 'i-tabler-layout-grid'" class="group-node__header-icon" />
      <span class="group-node__title">{{ data.label }}</span>
      <span v-if="data.description" class="group-node__subtitle">{{ data.description }}</span>
      <!-- 尺寸显示 -->
      <span class="group-node__size-hint">{{ currentW }}×{{ currentH }}</span>
    </div>

    <!-- 内容区域提示（无子节点时显示） -->
    <div class="group-node__drop-hint">
      <AppIcon name="i-tabler-drag-drop" class="group-node__drop-icon" />
      <span>拖入节点到此区域</span>
    </div>

    <!-- 底部连接点 -->
    <Handle
      type="source"
      :position="Position.Bottom"
      id="bottom"
      class="group-node__handle group-node__handle--bottom"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeResizer, type OnResize } from '@vue-flow/node-resizer'
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  id: string
  data: {
    label: string
    description?: string
    color?: string
    icon?: string
    width?: number
    height?: number
  }
  selected?: boolean
}>()

const { updateNode } = useVueFlow()

const GROUP_COLORS: Record<string, { border: string; bg: string; header: string }> = {
  purple:  { border: '#9c27b0', bg: 'rgba(243,229,245,0.45)', header: '#9c27b0' },
  blue:    { border: '#1565c0', bg: 'rgba(227,240,255,0.45)', header: '#1565c0' },
  green:   { border: '#2e7d32', bg: 'rgba(232,245,233,0.45)', header: '#2e7d32' },
  orange:  { border: '#e65100', bg: 'rgba(255,243,224,0.45)', header: '#e65100' },
  teal:    { border: '#006064', bg: 'rgba(224,242,241,0.45)', header: '#006064' },
  default: { border: '#546e7a', bg: 'rgba(236,239,241,0.45)', header: '#546e7a' },
}

const colorKey = computed(() => props.data.color || 'default')
const colors = computed(() => GROUP_COLORS[colorKey.value] || GROUP_COLORS.default)

// 仅用于标题栏尺寸提示的显示
const currentW = ref(props.data.width || 360)
const currentH = ref(props.data.height || 240)

// 不设置 width/height，由 VueFlow + NodeResizer 控制节点 wrapper 尺寸
// 本组件 root 设置为 width:100% height:100% 填满 wrapper
const containerStyle = computed(() => ({
  backgroundColor: colors.value.bg,
  borderColor: props.selected ? colors.value.border : `${colors.value.border}88`,
  boxShadow: props.selected
    ? `0 0 0 2px ${colors.value.border}55, inset 0 0 0 1px ${colors.value.border}33`
    : `0 2px 10px rgba(0,0,0,0.08)`,
}))

const headerStyle = computed(() => ({
  backgroundColor: colors.value.header,
}))

const resizerLineStyle = computed(() => ({
  borderColor: colors.value.border,
  borderWidth: '2px',
}))

const resizerHandleStyle = computed(() => ({
  backgroundColor: colors.value.header,
  borderColor: '#ffffff',
  width: '10px',
  height: '10px',
}))

function onResize({ params }: OnResize) {
  currentW.value = Math.round(params.width)
  currentH.value = Math.round(params.height)
  // 同步 data 以便保存持久化；style 由 NodeResizer 直接更新到 VueFlow 内部
  updateNode(props.id, {
    data: { ...props.data, width: currentW.value, height: currentH.value },
  })
}
</script>

<style lang="scss" scoped>

.voltage-class {
  .group-node {
    width: 100%;
    height: 100%;
    border: 2px dashed #546e7a;
    border-radius: 10px;
    position: relative;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
    overflow: visible;

    // ---- 标题栏 ----
    &__header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 8px 8px 0 0;
      background-color: #546e7a;
      user-select: none;

      :deep(svg) {
        width: 15px;
        height: 15px;
        color: #ffffff !important;
        flex-shrink: 0;
      }
    }

    &__title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.3px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      margin-right: 4px;
      white-space: nowrap;
    }

    &__size-hint {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.5);
      white-space: nowrap;
      flex-shrink: 0;
    }

    // ---- 拖入提示 ----
    &__drop-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) translateY(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: rgba(0, 0, 0, 0.2);
      font-size: 11px;
      pointer-events: none;
      user-select: none;
    }

    &__drop-icon {
      :deep(svg) {
        width: 28px;
        height: 28px;
        color: rgba(0, 0, 0, 0.18) !important;
      }
    }

    // ---- 连接点 ----
    &__handle {
      width: 12px;
      height: 12px;
      background-color: #78909c;
      border: 2px solid #ffffff;
      border-radius: 50%;
      position: absolute;
      z-index: 10;
      transition: all 0.15s;

      &--top {
        top: -7px;
        left: 50%;
        transform: translateX(-50%);
      }

      &--bottom {
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
      }

      &:hover {
        transform: translateX(-50%) scale(1.35);
        background-color: #ff8a00;
      }
    }

    // NodeResizer 主题覆盖
    :deep(.vue-flow__resize-control) {
      opacity: 0;
      transition: opacity 0.15s;
    }

    :deep(.vue-flow__resize-control.line),
    :deep(.vue-flow__resize-control.handle) {
      opacity: 1;
    }
  }
}
</style>
