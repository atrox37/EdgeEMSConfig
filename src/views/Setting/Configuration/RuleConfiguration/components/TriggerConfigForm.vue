<template>
  <div class="trigger-config-form">
    <div class="trigger-config-form__section-title">Trigger Config</div>

    <el-form-item label="Trigger Type:" prop="triggerType">
      <el-radio-group v-model="form.type">
        <el-radio label="interval">Interval</el-radio>
        <el-radio label="on_change">On Change</el-radio>
      </el-radio-group>
    </el-form-item>

    <template v-if="form.type === 'interval'">
      <el-form-item label="Interval (ms):" required>
        <el-input-number
          v-model="form.interval_ms"
          :controls="false"
          align="left"
          :min="1"
          placeholder="1000"
        />
      </el-form-item>
    </template>

    <template v-else>
      <el-form-item label="Point Refs:" required class="trigger-config-form__point-refs-item">
        <div class="trigger-config-form__point-refs">
          <div class="trigger-config-form__point-refs-header">
            <el-button class="trigger-config-form__add-btn section__add-btn" type="primary" @click="addPointRef">
              <AppIcon name="i-tabler-plus" className="section__add-btn-icon" />
            </el-button>
          </div>

          <div class="trigger-config-form__point-refs-list">
            <div
              v-for="(ref, idx) in form.point_refs"
              :key="getPointRefKey(ref, idx)"
              class="trigger-config-form__point-ref-row"
            >
              <el-select
                v-model="ref.instance"
                filterable
                :fit-input-width="true"
                placeholder="Instance"
                class="trigger-config-form__select"
                popper-class="trigger-config-form__popper"
                @change="() => onInstanceChange(idx)"
              >
                <el-option
                  v-for="opt in instanceOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-select
                v-model="ref.point_type"
                placeholder="Point Type"
                class="trigger-config-form__select trigger-config-form__select--type"
                popper-class="trigger-config-form__popper trigger-config-form__popper--type"
                :disabled="!ref.instance"
                @change="() => onPointTypeChange(idx)"
              >
                <el-option label="measurement" value="measurement" />
                <el-option label="action" value="action" />
              </el-select>
              <el-select
                v-model="ref.point"
                filterable
                :fit-input-width="true"
                placeholder="Point"
                class="trigger-config-form__select"
                popper-class="trigger-config-form__popper"
                :disabled="!ref.instance || !ref.point_type"
              >
                <el-option
                  v-for="opt in getPointOptions(idx)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button
                class="trigger-config-form__remove-btn variable-row__delete"
                style="width: 32px !important"
                :disabled="form.point_refs.length <= 1"
                @click="removePointRef(idx)"
              >
                <AppIcon name="i-tabler-trash" className="variable-row__delete-icon" />
              </el-button>
            </div>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="Time Deadband (ms):">
        <el-input-number
          v-model="form.time_deadband_ms"
          :controls="false"
          align="left"
          :min="0"
          placeholder="Optional"
        />
        <!-- <span class="trigger-config-form__hint">Leave empty to omit</span> -->
      </el-form-item>

      <el-form-item label="Value Deadband:" class="trigger-config-form__deadband-item">
        <div class="trigger-config-form__deadband">
          <el-select
            v-model="form.value_deadband_mode"
            class="trigger-config-form__select trigger-config-form__select--deadband"
            popper-class="trigger-config-form__popper trigger-config-form__popper--deadband"
          >
            <el-option label="None" value="none" />
            <el-option label="Absolute" value="absolute" />
            <el-option label="Percent" value="percent" />
          </el-select>
          <el-input-number
            v-if="form.value_deadband_mode !== 'none'"
            v-model="form.value_deadband_threshold"
            class="trigger-config-form__deadband-input"
            :controls="false"
            align="left"
            :min="0"
            placeholder="Threshold"
          />
        </div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { getAllInstances, getInstancePoints } from '@/api/devicesManagement'
import type { TriggerConfigFormState, TriggerPointType } from '@/types/ruleConfiguration'
import { createEmptyPointRefRow } from '@/utils/triggerConfig'

const form = defineModel<TriggerConfigFormState>('modelValue', { required: true })

const instanceOptions = ref<Array<{ label: string; value: number }>>([])
const pointOptionsByRow = ref<Record<number, Array<{ label: string; value: number }>>>({})
const instancePointsCache = ref<Record<number, any>>({})

function getPointRefKey(
  ref: TriggerConfigFormState['point_refs'][number],
  idx: number,
): string {
  return `${idx}-${ref.instance ?? 'none'}-${ref.point_type || 'none'}-${ref.point ?? 'none'}`
}

function buildPointOptions(
  data: any,
  pointType: TriggerPointType,
): Array<{ label: string; value: number }> {
  if (pointType === 'action') {
    const raw = (
      Array.isArray(data?.actions) ? data.actions : Object.values(data?.actions || {})
    ) as any[]
    return raw
      .filter((a) => a && (a.action_id != null || a.id != null) && a.name != null)
      .map((a) => ({
        label: String(a.name || ''),
        value: Number(a.action_id ?? a.id),
      }))
      .filter((opt) => Number.isFinite(opt.value))
  }

  const measurements = Object.values(data?.elements || data?.measurements || {}) as any[]
  return measurements
    .filter((m) => m && m.measurement_id != null && m.name != null)
    .map((m) => ({
      label: String(m.name || ''),
      value: Number(m.measurement_id),
    }))
    .filter((opt) => Number.isFinite(opt.value))
}

async function loadInstances() {
  try {
    const res = await getAllInstances()
    const list = Array.isArray(res?.data?.list) ? res.data.list : []
    instanceOptions.value = list
      .map((item: any) => ({
        label: String(item?.name || item?.instance_name || item?.id || ''),
        value: Number(item?.id ?? item?.instance_id),
      }))
      .filter((opt) => !!opt.label && Number.isFinite(opt.value) && opt.value > 0)
  } catch {
    instanceOptions.value = []
  }
}

async function ensureInstancePoints(instanceId: number) {
  if (instancePointsCache.value[instanceId]) return instancePointsCache.value[instanceId]
  const res = await getInstancePoints(instanceId)
  const data = res?.data || {}
  instancePointsCache.value[instanceId] = data
  return data
}

function getPointOptions(idx: number) {
  return pointOptionsByRow.value[idx] || []
}

async function refreshPointOptions(idx: number) {
  const ref = form.value.point_refs[idx]
  if (!ref?.instance || !ref.point_type) {
    pointOptionsByRow.value[idx] = []
    return
  }
  try {
    const data = await ensureInstancePoints(Number(ref.instance))
    pointOptionsByRow.value[idx] = buildPointOptions(data, ref.point_type)
  } catch {
    pointOptionsByRow.value[idx] = []
  }
}

async function onInstanceChange(idx: number) {
  const ref = form.value.point_refs[idx]
  ref.point_type = ''
  ref.point = undefined
  pointOptionsByRow.value[idx] = []

  const instanceId = Number(ref.instance)
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    ref.instance = undefined
    return
  }

  try {
    await ensureInstancePoints(instanceId)
  } catch {
    // ignore preload failure; point type change will retry
  }
}

async function onPointTypeChange(idx: number) {
  const ref = form.value.point_refs[idx]
  ref.point = undefined
  await refreshPointOptions(idx)
}

function addPointRef() {
  form.value.point_refs.push(createEmptyPointRefRow())
}

function removePointRef(idx: number) {
  if (form.value.point_refs.length <= 1) return
  form.value.point_refs.splice(idx, 1)
  rebuildPointOptionsByRow()
}

function rebuildPointOptionsByRow() {
  const next: Record<number, Array<{ label: string; value: number }>> = {}
  form.value.point_refs.forEach((ref, idx) => {
    if (ref.instance && ref.point_type) {
      const cached = instancePointsCache.value[Number(ref.instance)]
      if (cached) {
        next[idx] = buildPointOptions(cached, ref.point_type)
        return
      }
    }
    next[idx] = pointOptionsByRow.value[idx] || []
  })
  pointOptionsByRow.value = next
}

async function preloadPointOptions() {
  await loadInstances()
  const tasks = form.value.point_refs.map(async (ref, idx) => {
    if (!ref.instance) return
    const instanceId = Number(ref.instance)
    if (!Number.isFinite(instanceId) || instanceId <= 0) return
    try {
      await ensureInstancePoints(instanceId)
      if (ref.point_type) await refreshPointOptions(idx)
    } catch {
      pointOptionsByRow.value[idx] = []
    }
  })
  await Promise.all(tasks)
}

watch(
  () => form.value.type,
  (type) => {
    if (type === 'on_change' && form.value.point_refs.length === 0) {
      form.value.point_refs = [createEmptyPointRefRow()]
    }
  },
)

onMounted(async () => {
  await preloadPointOptions()
})

defineExpose({ preloadPointOptions })
</script>

<style scoped lang="scss">
.trigger-config-form {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;

  .trigger-config-form__section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #303133;
  }

  .trigger-config-form__point-refs {
    width: 100%;
  }

  .trigger-config-form__point-refs-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
    padding-right: 4px;
  }

  .trigger-config-form__point-refs-list {
    max-height: clamp(40px, calc(100vh - 480px), 180px);
    overflow-y: auto;
    scrollbar-gutter: stable;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 4px;
  }

  .trigger-config-form__point-ref-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-shrink: 0;
  }

  .trigger-config-form__select {
    flex: 1 1 0;
    min-width: 0;
  }

  .trigger-config-form__select--type {
    flex: 0 0 130px;
    width: 130px;
  }

  .trigger-config-form__select--deadband {
    flex: 0 0 160px;
    width: 160px;
  }

  .trigger-config-form__add-btn.section__add-btn,
  .trigger-config-form__remove-btn.variable-row__delete {
    width: 32px !important;
    min-width: 32px !important;
    padding: 0 4px !important;
    flex: 0 0 32px;
  }

  .trigger-config-form__add-btn :deep(.section__add-btn-icon),
  .trigger-config-form__remove-btn :deep(.variable-row__delete-icon) {
    width: 16px;
    height: 16px;
  }

  .trigger-config-form__deadband-item {
    :deep(.el-form-item__content) {
      display: flex;
      align-items: center;
    }
  }

  .trigger-config-form__deadband {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    width: 100%;
  }

  .trigger-config-form__deadband-input {
    // width: 160px;
    flex: 0 0 352px;
  }

  .trigger-config-form__hint {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
  }

  :deep(.el-form-item .el-input-number) {
    width: 160px;
  }

  :deep(.el-select .el-select__selected-item) {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

<style lang="scss">
.trigger-config-form__popper--type {
  width: 130px !important;
  min-width: 130px !important;
}

.trigger-config-form__popper--deadband {
  width: 160px !important;
  min-width: 160px !important;
}
</style>
