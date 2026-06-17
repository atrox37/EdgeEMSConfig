<template>
  <div class="display-points-panel">
    <div class="display-points-panel__header">
      <span class="display-points-panel__title">Overview Display Points</span>
      <el-tooltip content="Select measurement points to show on VoltageEMS homepage" placement="top">
        <AppIcon name="i-tabler-info-circle" class="display-points-panel__info-icon" />
      </el-tooltip>
    </div>

    <div v-if="!instanceId" class="display-points-panel__empty">
      Bind an instance first
    </div>

    <template v-else>
      <div v-if="loading" class="display-points-panel__loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>Loading points...</span>
      </div>

      <div v-else-if="availablePoints.length === 0" class="display-points-panel__empty">
        No measurement points available
      </div>

      <div v-else class="display-points-panel__list">
        <div
          v-for="pt in availablePoints"
          :key="pt.measurement_id"
          class="display-points-panel__item"
          :class="{ 'is-selected': isSelected(pt.measurement_id) }"
        >
          <el-checkbox
            :model-value="isSelected(pt.measurement_id)"
            size="small"
            @change="(val: boolean) => togglePoint(pt, val)"
          />
          <div class="display-points-panel__item-info">
            <div class="display-points-panel__item-name">{{ pt.name }}</div>
            <div v-if="getConfig(pt.measurement_id)" class="display-points-panel__item-edit">
              <el-input
                v-model="getConfig(pt.measurement_id)!.label"
                size="small"
                placeholder="Label"
                class="display-points-panel__item-label-input"
                @change="emitUpdate"
              />
              <el-input
                v-model="getConfig(pt.measurement_id)!.unit"
                size="small"
                placeholder="Unit"
                class="display-points-panel__item-unit-input"
                @change="emitUpdate"
              />
            </div>
            <div v-else class="display-points-panel__item-meta">
              <span>{{ pt.unit || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="display-points-panel__footer">
        <span class="display-points-panel__count">{{ selectedPoints.length }} selected</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AppIcon from '@/components/AppIcon.vue'
import { getInstancePoints } from '@/api/devicesManagement'
import type { DisplayPointConfig } from '@/types/visualModeling'

const props = defineProps<{
  instanceId: number | undefined
  modelValue: DisplayPointConfig[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: DisplayPointConfig[]): void
}>()

interface AvailablePoint {
  measurement_id: number
  name: string
  unit: string
}

const loading = ref(false)
const availablePoints = ref<AvailablePoint[]>([])
const selectedPoints = ref<DisplayPointConfig[]>([...props.modelValue])

watch(() => props.modelValue, (val) => {
  selectedPoints.value = [...val]
}, { deep: true })

watch(() => props.instanceId, async (id) => {
  if (!id) {
    availablePoints.value = []
    return
  }
  loading.value = true
  try {
    const res = await getInstancePoints(id)
    const pts = (res as any)?.data?.measurements ?? []
    availablePoints.value = pts.map((p: any) => ({
      measurement_id: p.measurement_id,
      name: p.name,
      unit: p.unit ?? '',
    }))
  } catch {
    availablePoints.value = []
  } finally {
    loading.value = false
  }
}, { immediate: true })

function isSelected(measurementId: number): boolean {
  return selectedPoints.value.some(p => p.measurementId === measurementId)
}

function getConfig(measurementId: number): DisplayPointConfig | undefined {
  return selectedPoints.value.find(p => p.measurementId === measurementId)
}

function togglePoint(pt: AvailablePoint, val: boolean) {
  if (props.readonly) return
  if (val) {
    if (!isSelected(pt.measurement_id)) {
      selectedPoints.value = [
        ...selectedPoints.value,
        { measurementId: pt.measurement_id, label: pt.name, unit: pt.unit },
      ]
    }
  } else {
    selectedPoints.value = selectedPoints.value.filter(p => p.measurementId !== pt.measurement_id)
  }
  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', [...selectedPoints.value])
}
</script>

<style lang="scss" scoped>
.display-points-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.display-points-panel__header {
  display: flex;
  align-items: center;
  gap: 5px;
}

.display-points-panel__title {
  font-size: 11px;
  font-weight: 600;
  color: #607080;
}

.display-points-panel__info-icon {
  :deep(svg) { width: 12px; height: 12px; color: #b0b8c4 !important; }
}

.display-points-panel__loading,
.display-points-panel__empty {
  font-size: 11px;
  color: #b0b8c4;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 0;
}

.display-points-panel__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(15,31,61,0.08);
  border-radius: 6px;
  padding: 4px;
  background: #f8fafc;
}

.display-points-panel__item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 5px;
  transition: background 0.12s;

  &.is-selected {
    background: rgba(74, 144, 217, 0.07);
  }
}

.display-points-panel__item-info {
  flex: 1;
  min-width: 0;
}

.display-points-panel__item-name {
  font-size: 11px;
  color: #0f1f3d;
  font-weight: 500;
  line-height: 1.4;
  margin-bottom: 3px;
}

.display-points-panel__item-meta {
  font-size: 10px;
  color: #909399;
}

.display-points-panel__item-edit {
  display: flex;
  gap: 4px;
}

.display-points-panel__item-label-input {
  flex: 2;
}

.display-points-panel__item-unit-input {
  flex: 1;
}

.display-points-panel__footer {
  display: flex;
  justify-content: flex-end;
}

.display-points-panel__count {
  font-size: 10px;
  color: #909399;
}
</style>
