<template>
  <div
    class="voltage-class group-node"
    :class="{
      selected: selected,
      'group-node--view-mode': hideConnectionHandles,
      'group-node--drop-valid': dropHighlight === 'valid',
      'group-node--drop-invalid': dropHighlight === 'invalid',
    }"
    :style="containerStyle"
  >
    <!-- 可拖拽缩放句柄（右下、右、下三个方向） -->
    <NodeResizer
      :min-width="200"
      :min-height="150"
      :line-style="resizerLineStyle"
      :handle-style="resizerHandleStyle"
      :is-visible="selected && !hideConnectionHandles"
      @resize="onResize"
      @resize-end="onResizeEnd"
    />

    <NodeConnectionHandles />

    <!-- 标题栏 -->
    <div class="group-node__header" :style="headerStyle">
      <AppIcon :name="data.icon || 'i-tabler-layout-grid'" class="group-node__header-icon" />
      <div class="group-node__title-row">
        <span class="group-node__title">{{ data.label }}</span>
        <div
          v-if="boundInstances.length && data.isContainer"
          class="group-node__instance-tags"
        >
          <span
            v-for="inst in boundInstances.slice(0, 2)"
            :key="inst.instanceId"
            class="group-node__instance-tag"
            :title="inst.instanceName"
          >
            {{ inst.instanceName }}
          </span>
          <span v-if="boundInstances.length > 2" class="group-node__instance-more">
            +{{ boundInstances.length - 2 }}
          </span>
        </div>
      </div>
      <div
        v-if="boundInstances.length && !data.isContainer"
        class="group-node__instance-tags group-node__instance-tags--legacy"
      >
        <span
          v-for="inst in boundInstances.slice(0, 2)"
          :key="inst.instanceId"
          class="group-node__instance-tag"
          :title="inst.instanceName"
        >
          {{ inst.instanceName }}
        </span>
        <span v-if="boundInstances.length > 2" class="group-node__instance-more">
          +{{ boundInstances.length - 2 }}
        </span>
      </div>
      <span v-if="data.description && !data.isContainer" class="group-node__subtitle">{{ data.description }}</span>
      <span v-if="!data.isContainer" class="group-node__size-hint">{{ currentW }}×{{ currentH }}</span>
    </div>

    <!-- 内容区域提示（无子节点时显示） -->
    <div v-if="!data.isContainer && !isContainerProduct(data.productName)" class="group-node__drop-hint">
      <AppIcon name="i-tabler-drag-drop" class="group-node__drop-icon" />
      <span>Drop nodes into this area</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { MODELING_EDITOR_KEY } from '../../modelingEditorContext'
import { useVueFlow } from '@vue-flow/core'
import NodeConnectionHandles from '../NodeConnectionHandles.vue'
import { NodeResizer, type OnResize } from '@vue-flow/node-resizer'
import AppIcon from '@/components/AppIcon.vue'
import type { ModelNodeData } from '@/types/visualModeling'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import { isContainerProduct } from '@/constants/deviceProducts'

const props = defineProps<{
  id: string
  data: ModelNodeData & {
    isContainer?: boolean
  }
  selected?: boolean
}>()

const { updateNode } = useVueFlow()
const editorCtx = inject(MODELING_EDITOR_KEY, null)
const hideConnectionHandles = computed(() => editorCtx?.isViewMode.value ?? false)

const dropHighlight = computed(() => {
  if (editorCtx?.isViewMode.value) return null
  if (editorCtx?.dropTargetContainerId?.value !== props.id) return null
  return editorCtx?.dropTargetStatus?.value ?? null
})

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
const boundInstances = computed(() => normalizeNodeInstances(props.data))

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

function onResizeEnd() {
  editorCtx?.notifyFlowChanged?.()
}
</script>

<style lang="scss" scoped>
.group-node {
  width: 100%;
  height: 100%;
  border: 2px dashed #546e7a;
  border-radius: 10px;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  overflow: visible;
}

.group-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px 8px 0 0;
  background-color: #546e7a;
  user-select: none;
}

.group-node__header :deep(svg) {
  width: 15px;
  height: 15px;
  color: #ffffff !important;
  flex-shrink: 0;
}

.group-node__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.group-node__title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-node__instance-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  flex-shrink: 1;
  min-width: 0;
}

.group-node__instance-tags.group-node__instance-tags--legacy {
  max-width: 45%;
  flex-shrink: 0;
}

.group-node__instance-tag {
  max-width: 72px;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-node__instance-more {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.75);
  flex-shrink: 0;
}

.group-node__subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-right: 4px;
  white-space: nowrap;
}

.group-node__size-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  flex-shrink: 0;
}

.group-node__drop-hint {
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

.group-node__drop-icon :deep(svg) {
  width: 28px;
  height: 28px;
  color: rgba(0, 0, 0, 0.18) !important;
}

.group-node:not(.group-node--view-mode):hover :deep(.node-connection-handle) {
  opacity: 1;
  pointer-events: all !important;
  background-color: #78909c;
}

.group-node.group-node--view-mode :deep(.node-connection-handle) {
  pointer-events: none;
}

.group-node :deep(.vue-flow__resize-control) {
  opacity: 0;
  transition: opacity 0.15s;
}

.group-node.group-node--drop-valid {
  border-color: #43a047;
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.28), inset 0 0 0 1px rgba(67, 160, 71, 0.2);
}

.group-node.group-node--drop-invalid {
  border-color: #e53935;
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.25), inset 0 0 0 1px rgba(229, 57, 53, 0.15);
}
</style>
