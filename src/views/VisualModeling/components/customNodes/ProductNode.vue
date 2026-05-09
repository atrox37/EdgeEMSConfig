<template>
  <div class="voltage-class product-node" :style="outerStyle">
    <!-- 顶部连接点（悬于外层，不受 clip 影响） -->
    <Handle
      type="target"
      :position="Position.Top"
      id="top"
      class="product-node__handle product-node__handle--top"
      :style="handleStyle"
    />

    <!-- 内容区域（独立 overflow:hidden 做圆角裁剪） -->
    <div class="product-node__clip" :style="clipStyle">
      <!-- 头部 -->
      <div class="product-node__header" :style="headerStyle">
        <div class="product-node__icon-wrap">
          <AppIcon :name="iconName" class="product-node__icon-svg" />
        </div>
        <div class="product-node__header-info">
          <div class="product-node__label">{{ data.label }}</div>
          <div v-if="data.productName" class="product-node__product-tag">
            {{ data.productName }}
          </div>
        </div>
      </div>

      <!-- 描述行 -->
      <div v-if="data.description" class="product-node__desc-row">
        {{ data.description }}
      </div>

      <!-- 属性区域 -->
      <div v-if="hasProperties" class="product-node__props">
        <div
          v-for="[k, v] in displayProps"
          :key="k"
          class="product-node__prop-row"
        >
          <span class="product-node__prop-key">{{ k }}</span>
          <span class="product-node__prop-val">{{ v }}</span>
        </div>
        <div v-if="hiddenCount > 0" class="product-node__prop-more">
          +{{ hiddenCount }} 个属性
        </div>
      </div>

      <!-- 无属性且已绑定实例时 -->
      <div v-else-if="data.instanceId" class="product-node__no-props">
        暂无属性配置
      </div>
    </div>

    <!-- 底部连接点 -->
    <Handle
      type="source"
      :position="Position.Bottom"
      id="bottom"
      class="product-node__handle product-node__handle--bottom"
      :style="handleStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const MAX_PROPS = 4

const props = defineProps<{
  data: {
    label: string
    description?: string
    productName?: string
    instanceId?: number
    instanceName?: string
    properties?: Record<string, string | number>
    color?: string
    icon?: string
  }
  selected?: boolean
}>()

const COLOR_MAP: Record<string, { border: string; headerBg: string; bg: string }> = {
  blue:    { border: '#4a90d9', headerBg: '#4a90d9', bg: '#e3f0ff' },
  green:   { border: '#43a047', headerBg: '#43a047', bg: '#e8f5e9' },
  orange:  { border: '#ef6c00', headerBg: '#ef6c00', bg: '#fff3e0' },
  purple:  { border: '#8e24aa', headerBg: '#8e24aa', bg: '#f3e5f5' },
  teal:    { border: '#00897b', headerBg: '#00897b', bg: '#e0f2f1' },
  red:     { border: '#e53935', headerBg: '#e53935', bg: '#ffebee' },
  default: { border: '#607d8b', headerBg: '#607d8b', bg: '#f5f7fa' },
}

const colorKey = computed(() => props.data.color || 'default')
const c = computed(() => COLOR_MAP[colorKey.value] || COLOR_MAP.default)

/** 外层容器：不设 overflow hidden，让连接点可以溢出 */
const outerStyle = computed(() => ({
  borderColor: props.selected ? c.value.border : `${c.value.border}70`,
  boxShadow: props.selected
    ? `0 0 0 2px ${c.value.border}55, 0 4px 14px rgba(0,0,0,0.14)`
    : '0 2px 8px rgba(0,0,0,0.09)',
}))

/** 内部 clip 区域：负责背景色 + 圆角裁剪 */
const clipStyle = computed(() => ({
  backgroundColor: c.value.bg,
}))

const headerStyle = computed(() => ({
  backgroundColor: c.value.headerBg,
}))

const handleStyle = computed(() => ({
  backgroundColor: c.value.border,
}))

const iconName = computed(() => props.data.icon || 'i-tabler-cpu')

const allProps = computed(() =>
  Object.entries(props.data.properties ?? {}) as [string, string | number][],
)
const hasProperties = computed(() => allProps.value.length > 0)
const displayProps = computed(() => allProps.value.slice(0, MAX_PROPS))
const hiddenCount = computed(() => Math.max(0, allProps.value.length - MAX_PROPS))
</script>

<style lang="scss" scoped>
.voltage-class {
  .product-node {
    min-width: 170px;
    max-width: 240px;
    border: 2px solid #607d8b;
    border-radius: 8px;
    cursor: grab;
    transition: border-color 0.2s, box-shadow 0.2s;
    position: relative;
    // overflow 必须为 visible，否则顶/底连接点（-6px）会被裁掉
    overflow: visible;

    &:active { cursor: grabbing; }

    // ---- 内容 clip 区域 ----
    &__clip {
      overflow: hidden;
      border-radius: 6px; // 比外层 8px 略小，与 border 对齐
    }

    // ---- 头部 ----
    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      background: #607d8b;
    }

    &__icon-wrap {
      width: 28px;
      height: 28px;
      background: rgba(255,255,255,0.18);
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      :deep(svg) { width: 16px; height: 16px; color: #ffffff !important; }
    }

    &__header-info { flex: 1; min-width: 0; }

    &__label {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__product-tag {
      font-size: 10px;
      color: rgba(255,255,255,0.75);
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }


    // ---- 描述行 ----
    &__desc-row {
      padding: 4px 10px 3px;
      font-size: 11px;
      color: #5a6a7a;
      line-height: 1.4;
      border-bottom: 1px dashed rgba(0,0,0,0.08);
      background: rgba(255,255,255,0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    // ---- 属性列表 ----
    &__props {
      padding: 6px 10px 7px;
    }

    &__prop-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      line-height: 1.8;
      border-bottom: 1px dashed rgba(0,0,0,0.07);

      &:last-of-type { border-bottom: none; }
    }

    &__prop-key {
      color: #607080;
      font-weight: 500;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__prop-val {
      color: #1a2438;
      font-weight: 600;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }

    &__prop-more {
      font-size: 10px;
      color: #909399;
      text-align: center;
      padding-top: 2px;
    }

    &__no-props {
      padding: 5px 10px 6px;
      font-size: 11px;
      color: #b0b8c4;
      text-align: center;
    }

    // ---- 连接点 ----
    &__handle {
      width: 12px;
      height: 12px;
      background-color: #607d8b;
      border: 2px solid #ffffff;
      border-radius: 50%;
      position: absolute;
      z-index: 10;
      transition: transform 0.15s, background-color 0.15s;

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
        transform: translateX(-50%) scale(1.4);
        background-color: #ff8a00 !important;
        border-color: #fff;
      }
    }
  }
}
</style>
