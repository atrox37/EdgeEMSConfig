<template>
  <div class="home-configuration">
    <div class="home-configuration__header">
      <h2 class="home-configuration__title">Home Configuration</h2>
      <div class="home-configuration__actions">
        <!-- <div class="home-configuration__actions-left"> -->
          <el-button type="primary" plain @click="handleRestore">Restore Default</el-button>
        <!-- </div> -->
      </div>
    </div>

    <div class="home-configuration__content">
      <div class="home-configuration__preview">
        <div ref="previewContainerRef" class="home-configuration__scale-viewport">
          <div
            class="home-configuration__canvas"
            :style="{
              width: `${canvasWidthPx}px`,
              height: `${canvasHeightPx}px`,
              transform: `translate(-50%, -50%) scale(${previewScale})`,
            }"
          >
            <HomeView
              :isEditing="isEditing"
              :pointIndexMap="pointIndexMap"
              :pointConfigs="pointConfigs"
              @pointsReady="handlePointsReady"
              @cardClick="handleCardClick"
            />
          </div>
        </div>
      </div>
    </div>

    <PointConfigDialog
      v-model="isPointDialogVisible"
      :card="activePointDialogCard"
      @updateBasic="handleUpdatePointBasic"
      @save="handleSavePointConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import HomeView from './HomeView/index.vue'
import PointConfigDialog from './components/PointConfigDialog.vue'
import type { PointConfigPayload } from './components/PointConfigDialog.vue'

const DESIGN_WIDTH_PX = 1700
const DESIGN_HEIGHT_PX = 995
const DESIGN_REM_PX = 100

const previewContainerRef = ref<HTMLElement | null>(null)
const containerWidthPx = ref(0)
const containerHeightPx = ref(0)
let resizeObserver: ResizeObserver | null = null

const rootFontSizePx = computed(() => {
  // 当前项目不做全局 rem 适配；这里用 root font-size 计算“把 1rem 当 100px”需要的倍数
  const fontSize = getComputedStyle(document.documentElement).fontSize
  const parsed = Number.parseFloat(fontSize)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16
})

const baseScale = computed(() => DESIGN_REM_PX / rootFontSizePx.value)

const fitScale = computed(() => {
  const w = containerWidthPx.value
  const h = containerHeightPx.value
  if (w <= 0 || h <= 0) return 1
  return Math.min(w / DESIGN_WIDTH_PX, h / DESIGN_HEIGHT_PX)
})

// 最终缩放：先把“当前 1rem(默认 16px)”放大到“设计 1rem=100px”，再按容器等比缩放
const previewScale = computed(() => baseScale.value * fitScale.value)

// 画布尺寸：用 DESIGN/baseScale，保证“放大后”刚好等于设计尺寸，再由 fitScale 决定装进容器
const canvasWidthPx = computed(() => DESIGN_WIDTH_PX / baseScale.value)
const canvasHeightPx = computed(() => DESIGN_HEIGHT_PX / baseScale.value)

const isEditing = ref(true)
const isPointDialogVisible = ref(false)

interface PointRecord {
  id: string
  module: string
  context?: string
  defaultLabel: string
  defaultUnit: string
  defaultIcon?: string
}

interface PointConfig {
  label: string
  unit: string
  icon?: string
  description?: string
  formula?: string
}

const pointRecords = ref<PointRecord[]>([])
const pointConfigs = reactive<Record<string, PointConfig>>({})
const activePointId = ref<string | null>(null)

const handleRestore = () => {
  // Style-only placeholder
}

const handleCardClick = (payload: { id: string; title: string }) => {
  activePointId.value = payload.id
  isPointDialogVisible.value = true
}

const handleSavePointConfig = (payload: PointConfigPayload) => {
  pointConfigs[payload.cardId] = {
    ...(pointConfigs[payload.cardId] || {}),
    label: payload.name,
    unit: payload.unit,
    icon: payload.icon,
    formula: payload.formula,
    description: payload.description,
  }
}

const handleUpdatePointBasic = (payload: {
  id: string
  label: string
  unit: string
  icon?: string
}) => {
  pointConfigs[payload.id] = {
    ...(pointConfigs[payload.id] || {}),
    label: payload.label,
    unit: payload.unit,
    ...(payload.icon !== undefined && { icon: payload.icon }),
  }
}

const handlePointsReady = (points: PointRecord[]) => {
  pointRecords.value = points
  for (const p of points) {
    if (!pointConfigs[p.id]) {
      pointConfigs[p.id] = {
        label: p.defaultLabel,
        unit: p.defaultUnit,
        ...(p.defaultIcon && { icon: p.defaultIcon }),
      }
    }
  }
}

const pointIndexMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  pointRecords.value.forEach((p, idx) => {
    map[p.id] = idx + 1
  })
  return map
})

const activePointDialogCard = computed(() => {
  const id = activePointId.value
  if (!id) return null
  const record = pointRecords.value.find((x) => x.id === id)
  const cfg = pointConfigs[id]
  return {
    id,
    module: record?.module || 'Point Configuration',
    context: record?.context,
    label: cfg?.label ?? record?.defaultLabel ?? id,
    unit: cfg?.unit ?? record?.defaultUnit ?? '',
    icon: cfg?.icon ?? record?.defaultIcon ?? '',
    formula: cfg?.formula,
    description: cfg?.description,
  }
})

onMounted(() => {
  const el = previewContainerRef.value
  if (!el) return
  const updateSize = () => {
    containerWidthPx.value = el.clientWidth
    containerHeightPx.value = el.clientHeight
  }
  updateSize()
  resizeObserver = new ResizeObserver(() => updateSize())
  resizeObserver.observe(el)
})

onBeforeUnmount(() => {
  if (resizeObserver && previewContainerRef.value) {
    resizeObserver.unobserve(previewContainerRef.value)
  }
  resizeObserver = null
})
</script>

<style lang="scss" scoped>
.home-configuration {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.home-configuration__header {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-configuration__title {
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin: 0;
}

.home-configuration__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  // padding: 12px 16px;
  // border-radius: $border-radius-base;
  // background: $bg-color-input;
  // border: $border-width-base solid $border-color-base;
}

.home-configuration__actions-left,
.home-configuration__actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-configuration__content {
  flex: 1;
  min-height: 0;
  border-radius: $border-radius-base;
  border: $border-width-base solid $border-color-base;
  background: $bg-color-page;
  padding: 20px; // 0.2rem in the old homepage (1rem = 100px)
  overflow: hidden;
}

.home-configuration__preview {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.home-configuration__scale-viewport {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.home-configuration__canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: 50% 50%;
  will-change: transform;
}

.home-configuration__canvas :deep(.home) {
  width: 100%;
  height: 100%;
}
</style>
