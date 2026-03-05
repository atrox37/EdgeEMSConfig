<template>
  <div class="voltage-class action-period-delta-form">
    <el-form ref="formRef" label-width="90px" :model="cardData">
      <!-- 基础设置 -->
      <div class="section basic-section">
        <div class="section__header">
          <span class="section__title">Basic Settings</span>
        </div>
        <div class="section__body section__body--basic">
          <el-form-item label="label:" prop="label" class="basic-item basic-item--label">
            <el-input v-model="cardData.label" />
          </el-form-item>
          <el-form-item
            label="description:"
            prop="description"
            class="basic-item basic-item--description"
          >
            <el-input v-model="cardData.description" style="width: 100% !important" />
          </el-form-item>
        </div>
      </div>

      <div class="scroll-section">
        <div class="main-section">
          <!-- 输入点位 -->
          <div class="section input-section">
            <div class="section__header">
              <span class="section__title">Initial Parameters</span>
            </div>
            <div class="section__body input">
              <el-form-item label="instance:">
                <el-select
                  v-model="cardData.config.input.instance"
                  :fit-input-width="true"
                  placeholder="instance"
                  filterable
                  @change="onInputInstanceChange"
                >
                  <el-option
                    v-for="opt in instanceOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="pointType:">
                <el-select
                  v-model="cardData.config.input.pointType"
                  :fit-input-width="true"
                  placeholder="point type"
                  :disabled="!cardData.config.input.instance"
                  @change="onInputPointTypeChange"
                >
                  <el-option label="measurement" value="measurement" />
                  <el-option label="property" value="property" />
                </el-select>
              </el-form-item>
              <el-form-item label="point:">
                <el-select
                  v-model="cardData.config.input.point"
                  :fit-input-width="true"
                  placeholder="point"
                  filterable
                  :disabled="!cardData.config.input.instance || !cardData.config.input.pointType"
                  @change="onInputPointChange"
                >
                  <el-option
                    v-for="opt in inputPointOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </div>
          </div>

          <!-- 周期 -->
          <div class="section period-section">
            <div class="section__header">
              <span class="section__title">Period Parameters</span>
            </div>
            <div class="section__body period">
              <el-form-item label="period:">
                <el-select v-model="cardData.config.period" :fit-input-width="true" placeholder="period">
                  <el-option label="Daily" value="daily" />
                  <el-option label="Weekly" value="weekly" />
                  <el-option label="Monthly" value="monthly" />
                  <el-option label="Quarterly" value="quarterly" />
                </el-select>
              </el-form-item>
            </div>
          </div>

          <!-- 输出点位 -->
          <div class="section output-section">
            <div class="section__header">
              <span class="section__title">Target Parameters</span>
            </div>
            <div class="section__body output">
              <el-form-item label="instance:">
                <el-select
                  v-model="cardData.config.output.instance"
                  :fit-input-width="true"
                  placeholder="instance"
                  filterable
                  @change="onOutputInstanceChange"
                >
                  <el-option
                    v-for="opt in instanceOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="pointType:">
                <el-select
                  v-model="cardData.config.output.pointType"
                  :fit-input-width="true"
                  placeholder="point type"
                  :disabled="!cardData.config.output.instance"
                  @change="onOutputPointTypeChange"
                >
                  <el-option label="measurement" value="measurement" />
                  <el-option label="property" value="property" />
                </el-select>
              </el-form-item>
              <el-form-item label="point:">
                <el-input-number
                  v-model="cardData.config.output.point"
                  :min="1"
                  :step="1"
                  :precision="0"
                  :controls="false"
                  align="left"
                  :disabled="!cardData.config.output.instance || !cardData.config.output.pointType"
                  @change="onOutputPointChange"
                />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getInstancePoints, getAllInstances, getInstancesByIds } from '@/api/devicesManagement'

const formRef = ref()
const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})

const instanceOptions = ref<Array<{ label: string; value: number | string; d: any }>>([])
const inputPointOptions = ref<Array<{ label: string; value: number | string; unit?: string; raw?: any }>>([])
const outputPointOptions = ref<Array<{ label: string; value: number | string; unit?: string; raw?: any }>>([])
const inputPointsCache = ref<any>(null)
const outputPointsCache = ref<any>(null)

watch(
  () => props.cardData,
  (v) => {
    if (!v) return
    cardData.value = v
    cardData.value.config = cardData.value.config || {}
    cardData.value.config.input = cardData.value.config.input || {
      name: 'X1',
      instance: undefined,
      instance_name: '',
      pointType: '',
      point: undefined,
      point_name: '',
      unit: '',
    }
    cardData.value.config.output = cardData.value.config.output || {
      name: 'Y1',
      instance: undefined,
      instance_name: '',
      pointType: '',
      point: undefined,
      point_name: '',
      unit: '',
    }
    // 确保 instance_name 字段存在
    if (!cardData.value.config.input.instance_name) {
      cardData.value.config.input.instance_name = ''
    }
    if (!cardData.value.config.output.instance_name) {
      cardData.value.config.output.instance_name = ''
    }
    cardData.value.config.output.name = 'Y1'
    if (cardData.value.config.input.point != null && cardData.value.config.input.point !== '') {
      const n = Number(cardData.value.config.input.point)
      if (Number.isFinite(n)) cardData.value.config.input.point = n
    }
    if (cardData.value.config.output.point != null && cardData.value.config.output.point !== '') {
      const n = Number(cardData.value.config.output.point)
      if (Number.isFinite(n)) cardData.value.config.output.point = n
    }
    if (!cardData.value.config.period) cardData.value.config.period = 'daily'
    cardData.value.config.wires = cardData.value.config.wires || { default: [] }
  },
  { immediate: true },
)

watch(
  () => [cardData.value?.config?.input?.instance, cardData.value?.config?.input?.pointType],
  ([instance, pointType]) => {
    if (instance && pointType) {
      onInputInstanceChange(true)
    }
  },
)
watch(
  () => [cardData.value?.config?.output?.instance, cardData.value?.config?.output?.pointType],
  ([instance, pointType]) => {
    if (instance && pointType) {
      onOutputInstanceChange(true)
    }
  },
)

function buildPointOptionsFromData(
  data: any,
  pointType: 'property' | 'measurement',
): Array<{ label: string; value: number | string; unit?: string; raw?: any }> {
  if (pointType === 'property') {
    const props = Object.values((data as any)?.properties || {}) as any[]
    return props
      .filter((p: any) => p && p.property_id && p.name != null)
      .map((p: any) => ({
        label: String(p.name || ''),
        value: Number(p.property_id),
        unit: p.unit || '',
        raw: p,
      }))
  }
  const measurements = Array.isArray((data as any)?.measurements)
    ? (data as any).measurements
    : []
  return measurements
    .filter((m: any) => m && m.measurement_id && m.name != null)
    .map((m: any) => ({
      label: String(m.name || ''),
      value: Number(m.measurement_id),
      unit: m.unit || '',
      raw: m,
    }))
}

async function fetchInstances() {
  try {
    const res = await getAllInstances()
    const list = Array.isArray(res?.data?.list) ? res.data.list : []
    instanceOptions.value = list
      .map((it: any) => ({
        label: String(it?.name || ''),
        value: Number(it?.id),
        d: it,
      }))
      .filter((opt: any) => !!opt.label && (Number.isFinite(opt.value) || String(opt.value)))
  } catch {
    instanceOptions.value = []
  }
}

async function onInputInstanceChange(preserveSelection: boolean = false) {
  const instanceId = Number(cardData.value.config.input.instance)
  const currentPoint = cardData.value.config.input.point
  const currentPointType = cardData.value.config.input.pointType
  if (!preserveSelection) {
    cardData.value.config.input.point = undefined
    cardData.value.config.input.point_name = ''
    cardData.value.config.input.unit = ''
  }
  inputPointOptions.value = []
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    inputPointsCache.value = null
    cardData.value.config.input.instance_name = ''
    return
  }
  // 保存实例名称
  const instanceOpt = instanceOptions.value.find((opt) => opt.value === instanceId)
  if (instanceOpt) {
    cardData.value.config.input.instance_name = instanceOpt.label || ''
  } else {
    cardData.value.config.input.instance_name = ''
  }
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    inputPointsCache.value = data
    if (currentPointType) {
      inputPointOptions.value = buildPointOptionsFromData(data, currentPointType)
      if (preserveSelection && currentPoint != null && currentPoint !== '') {
        onInputPointChange(currentPoint)
      }
    }
  } catch {
    inputPointsCache.value = null
    inputPointOptions.value = []
  }
}

async function onInputPointTypeChange() {
  cardData.value.config.input.point = undefined
  cardData.value.config.input.point_name = ''
  cardData.value.config.input.unit = ''
  inputPointOptions.value = []
  if (!cardData.value.config.input.pointType) return
  if (inputPointsCache.value) {
    inputPointOptions.value = buildPointOptionsFromData(
      inputPointsCache.value,
      cardData.value.config.input.pointType,
    )
    return
  }
  await onInputInstanceChange()
}

function onInputPointChange(val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  cardData.value.config.input.point = Number.isFinite(n) ? n : s
  const opt = inputPointOptions.value.find((o) => o.value === cardData.value.config.input.point)
  if (opt) {
    cardData.value.config.input.point_name = opt.label || ''
    cardData.value.config.input.unit = opt.unit || ''
    cardData.value.config.output.unit = opt.unit || ''
  }
}

async function onOutputInstanceChange(preserveSelection: boolean = false) {
  const instanceId = Number(cardData.value.config.output.instance)
  const currentPoint = cardData.value.config.output.point
  const currentPointType = cardData.value.config.output.pointType
  if (!preserveSelection) {
    cardData.value.config.output.point = undefined
    cardData.value.config.output.point_name = ''
    cardData.value.config.output.unit = ''
  }
  outputPointOptions.value = []
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    outputPointsCache.value = null
    cardData.value.config.output.instance_name = ''
    return
  }
  // 保存实例名称
  const instanceOpt = instanceOptions.value.find((opt) => opt.value === instanceId)
  if (instanceOpt) {
    cardData.value.config.output.instance_name = instanceOpt.label || ''
  } else {
    cardData.value.config.output.instance_name = ''
  }
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    outputPointsCache.value = data
    if (currentPointType) {
      outputPointOptions.value = buildPointOptionsFromData(data, currentPointType)
      if (preserveSelection && currentPoint != null && currentPoint !== '') {
        onOutputPointChange(currentPoint)
      }
    }
  } catch {
    outputPointsCache.value = null
    outputPointOptions.value = []
  }
}

async function onOutputPointTypeChange() {
  cardData.value.config.output.point = undefined
  cardData.value.config.output.point_name = ''
  cardData.value.config.output.unit = ''
  outputPointOptions.value = []
  if (!cardData.value.config.output.pointType) return
  if (outputPointsCache.value) {
    outputPointOptions.value = buildPointOptionsFromData(
      outputPointsCache.value,
      cardData.value.config.output.pointType,
    )
    return
  }
  await onOutputInstanceChange()
}

function onOutputPointChange(val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  cardData.value.config.output.point = Number.isFinite(n) ? n : s
  const opt = outputPointOptions.value.find((o) => o.value === cardData.value.config.output.point)
  if (opt) {
    cardData.value.config.output.point_name = opt.label || ''
    cardData.value.config.output.unit = opt.unit || ''
  } else {
    cardData.value.config.output.point_name = String(cardData.value.config.output.point ?? '')
    cardData.value.config.output.unit = ''
  }
}

function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as any
    if (form && typeof form.validate === 'function') {
      form.validate((valid: boolean) => {
        resolve({ valid: !!valid, data: cardData.value })
      })
    } else {
      resolve({ valid: true, data: cardData.value })
    }
  })
}

defineExpose({ validateForm })

onMounted(() => {
  fetchInstances().then(async () => {
    // 收集所有需要批量获取的 instance_id
    const instanceIdsToFetch = new Set<number>()
    
    // 检查 input 部分
    const inputInstanceId = Number(cardData.value.config.input.instance)
    if (Number.isFinite(inputInstanceId) && inputInstanceId > 0 && cardData.value.config.input.pointType) {
      instanceIdsToFetch.add(inputInstanceId)
    }
    
    // 检查 output 部分
    const outputInstanceId = Number(cardData.value.config.output.instance)
    if (Number.isFinite(outputInstanceId) && outputInstanceId > 0 && cardData.value.config.output.pointType) {
      instanceIdsToFetch.add(outputInstanceId)
    }

    // 批量获取实例信息
    if (instanceIdsToFetch.size > 0) {
      try {
        const idsArray = Array.from(instanceIdsToFetch)
        const res = await getInstancesByIds(idsArray)
        const instancesList = Array.isArray(res?.data?.list) ? res.data.list : []

        // 处理 input 部分
        if (inputInstanceId > 0 && cardData.value.config.input.pointType) {
          const instance = instancesList.find((inst: any) => Number(inst?.instance_id) === inputInstanceId)
          if (instance) {
            const pointsData = instance?.points || {}
            inputPointsCache.value = pointsData
            inputPointOptions.value = buildPointOptionsFromData(
              pointsData,
              cardData.value.config.input.pointType as any,
            )
            
            // 回显时同步保存 instance_name
            if (!cardData.value.config.input.instance_name) {
              cardData.value.config.input.instance_name = instance?.instance_name || ''
            }
            
            // 回显时同步保存 point_name 和 unit
            if (cardData.value.config.input.point != null && cardData.value.config.input.point !== '') {
              onInputPointChange(cardData.value.config.input.point)
            }
          }
        }

        // 处理 output 部分
        if (outputInstanceId > 0 && cardData.value.config.output.pointType) {
          const instance = instancesList.find((inst: any) => Number(inst?.instance_id) === outputInstanceId)
          if (instance) {
            const pointsData = instance?.points || {}
            outputPointsCache.value = pointsData
            outputPointOptions.value = buildPointOptionsFromData(
              pointsData,
              cardData.value.config.output.pointType as any,
            )
            
            // 回显时同步保存 instance_name
            if (!cardData.value.config.output.instance_name) {
              cardData.value.config.output.instance_name = instance?.instance_name || ''
            }
            
            // 回显时同步保存 point_name 和 unit
            if (cardData.value.config.output.point != null && cardData.value.config.output.point !== '') {
              onOutputPointChange(cardData.value.config.output.point)
            }
          }
        }
      } catch {
        // 如果批量请求失败，回退到逐个请求
        if (inputInstanceId > 0 && cardData.value.config.input.pointType) {
          try {
            const res = await getInstancePoints(inputInstanceId)
            const data = res?.data || {}
            inputPointsCache.value = data
            inputPointOptions.value = buildPointOptionsFromData(
              data,
              cardData.value.config.input.pointType as any,
            )
            if (cardData.value.config.input.point != null && cardData.value.config.input.point !== '') {
              onInputPointChange(cardData.value.config.input.point)
            }
            // 回显时同步保存 instance_name
            const instanceOpt = instanceOptions.value.find((opt) => opt.value === inputInstanceId)
            if (instanceOpt && !cardData.value.config.input.instance_name) {
              cardData.value.config.input.instance_name = instanceOpt.label || ''
            }
          } catch {
            inputPointsCache.value = null
            inputPointOptions.value = []
          }
        }
        
        if (outputInstanceId > 0 && cardData.value.config.output.pointType) {
          try {
            const res = await getInstancePoints(outputInstanceId)
            const data = res?.data || {}
            outputPointsCache.value = data
            outputPointOptions.value = buildPointOptionsFromData(
              data,
              cardData.value.config.output.pointType as any,
            )
            if (cardData.value.config.output.point != null && cardData.value.config.output.point !== '') {
              onOutputPointChange(cardData.value.config.output.point)
            }
            // 回显时同步保存 instance_name
            const instanceOpt = instanceOptions.value.find((opt) => opt.value === outputInstanceId)
            if (instanceOpt && !cardData.value.config.output.instance_name) {
              cardData.value.config.output.instance_name = instanceOpt.label || ''
            }
          } catch {
            outputPointsCache.value = null
            outputPointOptions.value = []
          }
        }
      }
    }
  })
})
</script>

<style lang="scss" scoped>
.voltage-class {
  &.action-period-delta-form {
    width: 100%;
    height: 100%;
    .scroll-section {
      height: calc(100% - 120px);
      overflow-y: auto;
    }
    .main-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section {
      margin-bottom: 16px;
      .section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        .section__title {
          font-weight: $font-weight-semibold;
          font-size: $font-size-base;
          color: $text-color-primary;
        }
      }
      .section__body {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        &.input,
        &.output,
        &.period {
          align-items: center;
        }
      }
    }
    .section__body--basic {
      display: flex;
      gap: 8px;
    }
    .basic-item {
      margin-bottom: 0;
      flex: 1 1 0;
    }
    .basic-item--label {
      flex: 1 1 0;
    }
    .basic-item--description {
      flex: 2 1 0;
    }
    .input-section .section__body .el-form-item,
    .period-section .section__body .el-form-item,
    .output-section .section__body .el-form-item {
      width: calc((100% - 24px) / 3);
      margin-bottom: 0;
    }
    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-input-number){
        width: 100% !important;
    }
  }
}
</style>
