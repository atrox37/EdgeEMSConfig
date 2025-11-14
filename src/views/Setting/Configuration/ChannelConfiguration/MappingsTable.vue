<template>
  <div class="voltage-class mappings-table">
    <el-table :data="editItems" class="mappings-table__content" table-layout="fixed" height="500px">
      <el-table-column prop="point_id" label="Point ID" width="100" />
      <el-table-column prop="signal_name" label="Signal Name" />

      <!-- Modbus 专属列 -->
      <template v-if="isModbus">
        <el-table-column prop="protocol_data.byte_order" label="Byte Order" width="140">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).byte_order"
                placeholder="Byte Order"
                @change="(val: any) => onProtocolFieldChange($index, 'byte_order', val)"
              >
                <el-option
                  v-for="option in getModbusByteOrderOptions(
                    ((editItems[$index].protocol_data as any).data_type as string) || '',
                  )"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).byte_order }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.data_type" label="Data Type" width="140">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).data_type"
                placeholder="Data Type"
                @change="(val: any) => onProtocolFieldChange($index, 'data_type', val, true)"
              >
                <el-option
                  v-for="option in getDataTypeOptions()"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).data_type }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.function_code" label="Function Code" width="280">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).function_code"
                placeholder="Function Code"
                @change="(val: any) => onProtocolFieldChange($index, 'function_code', Number(val))"
              >
                <el-option
                  v-for="option in getFunctionCodeOptions($index)"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
            <template v-else>
              <span>{{ getFunctionCodeLabel((itemRow.protocol_data as any).function_code) }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.register_address" label="Register Address" width="160">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input
                :model-value="getRegisterAddressStr($index)"
                :maxlength="5"
                placeholder="Register Address"
                @input="(val: any) => onRegisterAddressInput($index, String(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).register_address }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.bit_position" label="Bit Pos" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input-number
                v-model.number="(editItems[$index].protocol_data as any).bit_position"
                :controls="false"
                :min="0"
                :max="15"
                :step="1"
                :disabled="!canEditBitPosition($index)"
                align="left"
                @change="(val: any) => onBitPositionChange($index, Number(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).bit_position }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.slave_id" label="Slave ID" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).slave_id"
                filterable
                allow-create
                placeholder="Slave ID"
                @change="(val: any) => onSlaveIdChange($index, val)"
              >
                <el-option
                  v-for="id in defaultSlaveIdOptions"
                  :key="id"
                  :label="String(id)"
                  :value="id"
                />
              </el-select>
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).slave_id }}</span>
            </template>
          </template>
        </el-table-column>
      </template>

      <!-- Virt 专属列 -->
      <template v-else-if="isVirt">
        <el-table-column prop="protocol_data.expression" label="Expression" min-width="200">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input
                v-model="(editItems[$index].protocol_data as any).expression"
                placeholder="Expression"
                @change="(val: any) => onProtocolFieldChange($index, 'expression', val)"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).expression }}</span>
            </template>
          </template>
        </el-table-column>
      </template>

      <!-- CAN 专属列 -->
      <template v-else-if="isCan">
        <el-table-column prop="protocol_data.can_id" label="CAN ID" width="140">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).can_id"
                filterable
                allow-create
                placeholder="CAN ID"
                @change="(val: any) => onProtocolFieldChange($index, 'can_id', val)"
              >
                <el-option v-for="id in canIdOptions" :key="id" :label="String(id)" :value="id" />
              </el-select>
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).can_id }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.start_bit" label="Start Bit" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input-number
                v-model.number="(editItems[$index].protocol_data as any).start_bit"
                :controls="false"
                align="left"
                @change="(val: any) => onProtocolFieldChange($index, 'start_bit', Number(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).start_bit }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.bit_length" label="Bit Length" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input-number
                v-model.number="(editItems[$index].protocol_data as any).bit_length"
                :controls="false"
                align="left"
                @change="(val: any) => onProtocolFieldChange($index, 'bit_length', Number(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).bit_length }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.byte_order" label="Byte Order" width="140">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).byte_order"
                placeholder="Byte Order"
                @change="(val: any) => onProtocolFieldChange($index, 'byte_order', val)"
              >
                <el-option
                  v-for="option in BYTE_ORDER_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).byte_order }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.data_type" label="Data Type" width="140">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input
                v-model="(editItems[$index].protocol_data as any).data_type"
                placeholder="Data Type"
                @change="(val: any) => onProtocolFieldChange($index, 'data_type', val)"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).data_type }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.signed" label="Signed" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-select
                v-model="(editItems[$index].protocol_data as any).signed"
                placeholder="Signed"
                @change="(val: any) => onProtocolFieldChange($index, 'signed', Boolean(val))"
              >
                <el-option label="true" :value="true" />
                <el-option label="false" :value="false" />
              </el-select>
            </template>
            <template v-else>
              <span
                :style="{
                  color: (itemRow.protocol_data as any).signed ? '#67C23A' : '#409EFF',
                  fontWeight: 600,
                }"
              >
                {{ (itemRow.protocol_data as any).signed ? 'true' : 'false' }}
              </span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.scale" label="Scale" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input-number
                v-model.number="(editItems[$index].protocol_data as any).scale"
                :controls="false"
                align="left"
                @change="(val: any) => onProtocolFieldChange($index, 'scale', Number(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).scale }}</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="protocol_data.offset" label="Offset" width="120">
          <template #default="{ row: itemRow, $index }">
            <template v-if="isEditing">
              <el-input-number
                v-model.number="(editItems[$index].protocol_data as any).offset"
                :controls="false"
                align="left"
                @change="(val: any) => onProtocolFieldChange($index, 'offset', Number(val))"
              />
            </template>
            <template v-else>
              <span>{{ (itemRow.protocol_data as any).offset }}</span>
            </template>
          </template>
        </el-table-column>
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { mappingResponse } from '@/types/channelConfiguration'
import {
  BYTE_ORDER_OPTIONS,
  DATA_TYPE_OPTIONS,
  FUNCTION_CODE_OPTIONS,
} from '@/types/channelConfiguration'

interface Props {
  protocol: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can'
  items: mappingResponse[]
  channelId: number
  isEditing: boolean
  pointType: 'T' | 'S' | 'C' | 'A'
}

const props = defineProps<Props>()

const editItems = ref<mappingResponse[]>([])
// 仅记录被修改过的字段：{ [point_id]: { protocol_data: { key: value } } }
const changedMap = ref<Record<number, { protocol_data: Record<string, any> }>>({})

const isModbus = computed(() => props.protocol === 'modbus_tcp' || props.protocol === 'modbus_rtu')
const isVirt = computed(() => props.protocol === 'virt')
const isCan = computed(() => props.protocol === 'can')

// CAN ID 选项：基于已有数据去重，并允许创建
const canIdOptions = computed(() => {
  const ids = new Set<string>()
  ;(props.items || []).forEach((r) => {
    const pid = (r.protocol_data as any)?.can_id
    if (pid) ids.add(String(pid))
  })
  return Array.from(ids)
})

// Modbus 默认从 1-10 提供选项（数字），允许创建
const defaultSlaveIdOptions = Array.from({ length: 10 }).map((_, i) => i + 1)

const BYTE16 = [
  { label: 'AB', value: 'AB' },
  { label: 'BA', value: 'BA' },
]
const BYTE32 = [
  { label: 'ABCD', value: 'ABCD' },
  { label: 'DCBA', value: 'DCBA' },
  { label: 'CDAB', value: 'CDAB' },
  { label: 'BADC', value: 'BADC' },
]

const BYTEALL = [...BYTE16, ...BYTE32]
function getFunctionCodeLabel(function_code: number) {
  return FUNCTION_CODE_OPTIONS.find((o) => o.value === function_code)?.label
}
function normalizeType(v: string): string {
  return (v || '').toLowerCase()
}

function getModbusByteOrderOptions(dataType: string) {
  const t = normalizeType(dataType)
  if (t === 'bool' || t === 'boolean') return BYTEALL
  if (t === 'float16' || t === 'int16' || t === 'uint16') return BYTE16
  if (t === 'float64' || t === 'float32' || t === 'int32' || t === 'uint32') return BYTE32
  return BYTE32
}

// 规则配置：不同 pointType 的 data_type 与 function_code 可选项
const DATA_TYPE_BY_POINT: Record<string, string[]> = {
  T: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64'],
  S: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64', 'bool'],
  C: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64', 'bool'],
  A: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64'],
}

const FC_BY_POINT: Record<string, number[] | ((dt: string) => number[])> = {
  // Telemetry, Signal: 01/02/03/04
  T: [1, 2, 3, 4],
  S: [1, 2, 3, 4],
  // Control: bool -> 05/15, 其他数值型 -> 06/16
  C: (dt: string) => {
    const t = normalizeType(dt)
    return t === 'bool' || t === 'boolean' ? [5, 15] : [6, 16]
  },
  // Adjustment: bool -> 05/15, 其他数值型 -> 06/16
  A: (dt: string) => {
    const t = normalizeType(dt)
    return t === 'bool' || t === 'boolean' ? [5, 15] : [6, 16]
  },
}

function getDataTypeOptions() {
  const allow = DATA_TYPE_BY_POINT[props.pointType] || []
  return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
}

function getFunctionCodeOptions(index: number) {
  const rule = FC_BY_POINT[props.pointType]
  if (!rule) return FUNCTION_CODE_OPTIONS
  const pd = (editItems.value[index].protocol_data as any) || {}
  const allowed = Array.isArray(rule) ? rule : rule(String(pd.data_type || ''))
  return FUNCTION_CODE_OPTIONS.filter((opt) => allowed.includes(Number(opt.value)))
}

function recordChange(pointId: number, key: string, value: any) {
  if (!changedMap.value[pointId]) {
    changedMap.value[pointId] = { protocol_data: {} }
  }
  changedMap.value[pointId].protocol_data[key] = value
}

function onProtocolFieldChange(index: number, key: string, value: any, affectByteOrder = false) {
  const pid = editItems.value[index]?.point_id
  if (pid == null) return
  recordChange(pid, key, value)
  // 当 data_type 变化时，校验 function_code 是否仍然合法；不合法置空
  if (key === 'data_type') {
    const allowedFC = getFunctionCodeOptions(index).map((o) => Number(o.value))
    const currentFC = Number((editItems.value[index].protocol_data as any).function_code)
    if (currentFC && !allowedFC.includes(currentFC)) {
      ;(editItems.value[index].protocol_data as any).function_code = undefined
      recordChange(pid, 'function_code', undefined)
    }
  }
  if (affectByteOrder) {
    // 当 Data Type 变更时，校验当前 Byte Order 是否仍然可选；若不合法则清空
    const current = (editItems.value[index].protocol_data as any).byte_order
    const options = getModbusByteOrderOptions(
      (editItems.value[index].protocol_data as any).data_type,
    )
    const allowed = options.map((o) => o.value)
    if (current && !allowed.includes(current)) {
      ;(editItems.value[index].protocol_data as any).byte_order = undefined
      recordChange(pid, 'byte_order', undefined)
    }
  }
}

function onSlaveIdChange(index: number, val: any) {
  const num = Number(val)
  const v = Number.isFinite(num) ? num : val
  ;(editItems.value[index].protocol_data as any).slave_id = v
  onProtocolFieldChange(index, 'slave_id', v)
}

watch(
  () => ({ items: props.items, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.items)) {
      editItems.value = val.items.map((item) => ({
        ...item,
        protocol_data: { ...(item as any).protocol_data },
      }))
      changedMap.value = {}
    }
  },
  { immediate: true, deep: true },
)

const getEditedData = () => {
  const results: any[] = []
  for (const item of editItems.value as any[]) {
    const diff = changedMap.value[item.point_id]?.protocol_data || {}
    // 仅当存在修改项时返回
    const keys = Object.keys(diff).filter((k) => diff[k] !== undefined)
    if (keys.length > 0) {
      results.push({
        point_id: item.point_id,
        four_remote: props.pointType,
        protocol_data: keys.reduce((acc: Record<string, any>, k: string) => {
          acc[k] = diff[k]
          return acc
        }, {}),
      })
    }
  }
  return results
}

function canEditBitPosition(index: number): boolean {
  const pd = (editItems.value[index].protocol_data as any) || {}
  const fc = Number(pd.function_code)
  const dt = String(pd.data_type || '').toLowerCase()
  const isBoolFC = (fc === 3 || fc === 4) && (dt === 'bool' || dt === 'boolean')
  const is16 = dt === 'float16' || dt === 'int16' || dt === 'uint16'
  return isBoolFC || is16
}

function onBitPositionChange(index: number, val: number) {
  const v = Math.max(0, Math.min(15, Math.round(Number(val))))
  ;(editItems.value[index].protocol_data as any).bit_position = v
  recordChange(editItems.value[index].point_id, 'bit_position', v)
}

function getRegisterAddressStr(index: number) {
  const v = (editItems.value[index].protocol_data as any).register_address
  return v == null ? '' : String(v)
}

function onRegisterAddressInput(index: number, str: string) {
  const digits = (str || '').replace(/\D+/g, '').slice(0, 5)
  const num = digits === '' ? undefined : Number(digits)
  ;(editItems.value[index].protocol_data as any).register_address = num
  recordChange(editItems.value[index].point_id, 'register_address', num)
}

watch(
  () =>
    editItems.value.map((i: any) => ({
      fc: (i.protocol_data as any)?.function_code,
      dt: String((i.protocol_data as any)?.data_type || '').toLowerCase(),
    })),
  () => {
    // 上游 function_code 或 data_type 改变，若不再满足编辑条件则清空 bit_position
    editItems.value.forEach((_, idx) => {
      if (!canEditBitPosition(idx)) {
        if ((editItems.value[idx].protocol_data as any).bit_position != null) {
          ;(editItems.value[idx].protocol_data as any).bit_position = undefined
          recordChange(editItems.value[idx].point_id, 'bit_position', undefined)
        }
      }
    })
  },
  { deep: true },
)

defineExpose({ getEditedData })
</script>

<style scoped lang="scss">
.voltage-class .mappings-table {
  .mappings-table__content {
    :deep(.el-table__body-wrapper) {
      td {
        .cell {
          min-height: 32px;
        }
      }
    }
  }
}
</style>
