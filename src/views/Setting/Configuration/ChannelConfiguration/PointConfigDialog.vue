<template>
  <FormDialog ref="formDialogRef" title="Point Mapping" width="600px" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class point-config-dialog">
        <el-form :model="configForm" :inline="true" label-width="140px">
          <el-form-item label="Slave ID:">
            <el-input-number
              v-model="configForm.slave_id"
              placeholder="Please enter slave ID"
              style="width: 100%"
              :controls="false"
              align="left"
            />
          </el-form-item>

          <el-form-item label="Function Code:">
            <el-select
              v-model="configForm.function_code"
              placeholder="Please select function code"
              style="width: 100%"
            >
              <el-option
                v-for="option in getFunctionCodeOptions()"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Register Address:">
            <el-input
              :model-value="getRegisterAddressStr()"
              :maxlength="5"
              placeholder="Please enter register address"
              style="width: 100%"
              @input="(val: any) => onRegisterAddressInput(String(val))"
            />
          </el-form-item>

          <el-form-item label="Data Type:">
            <el-select
              v-model="configForm.data_type"
              placeholder="Please select data type"
              style="width: 100%"
            >
              <el-option
                v-for="option in getDataTypeOptions()"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Byte Order:">
            <el-select
              v-model="configForm.byte_order"
              placeholder="Please select byte order"
              style="width: 100%"
            >
              <el-option
                v-for="option in BYTE_ORDER_OPTIONS"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="Bit Position:">
            <el-input-number
              v-model.number="(configForm as any).bit_position"
              :placeholder="bitPositionPlaceholder"
              :controls="false"
              align="left"
              style="width: 100%"
              :min="0"
              :max="15"
              :step="1"
              :disabled="!canEditBitPosition"
              @change="(val: any) => onBitPositionChange(Number(val))"
            />
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">Cancel</el-button>
        <el-button type="primary" @click="handleSubmit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type { modbusPointMapping, PointType } from '@/types/channelConfiguration'
import {
  DATA_TYPE_OPTIONS,
  BYTE_ORDER_OPTIONS,
  FUNCTION_CODE_OPTIONS,
} from '@/types/channelConfiguration'
import { getMappingPoints, batchUpdateMappingPoint } from '@/api/channelsManagement'
import { ChannelProtocolKey, ChannelIdKey } from '@/utils/key'
const formDialogRef = ref()
const pointId_Id = ref<number>(0)
const point_type = ref<PointType>('T')
const channelProtocol = inject(ChannelProtocolKey)
const channelId = inject(ChannelIdKey)

const open = async (pointId: number, pointType: PointType) => {
  pointId_Id.value = pointId
  point_type.value = pointType
  const res = await getMappingPoints(channelId!.value, pointType, pointId)
  if (res.success) {
    configForm.value = res.data.protocol_data
    formDialogRef.value.dialogVisible = true
  }
}
// 配置表单数据
const configForm = ref<modbusPointMapping>({
  slave_id: 1,
  function_code: 3,
  register_address: 0,
  data_type: 'float32',
  byte_order: 'ABCD',
})

// 取消
const handleCancel = () => {
  // 重置表单并关闭对话框
  configForm.value = {
    slave_id: 1,
    function_code: 3,
    register_address: 0,
    data_type: 'float32',
    byte_order: 'ABCD',
  }
  if (formDialogRef.value) {
    formDialogRef.value.dialogVisible = false
  }
}

// 提交
const handleSubmit = async () => {
  const { point_id, ...rest } = configForm.value
  const res = await batchUpdateMappingPoint(channelId!.value, {
    mappings: [
      {
        four_remote: point_type.value,
        point_id: pointId_Id.value,
        protocol_data: rest,
      },
    ],
    mode: 'merge',
    reload_channel: false,
    validate_only: false,
  })
  if (res.success) {
    ElMessage.success('Point mapping updated successfully')
    handleCancel()
  }
}

// 关闭
const handleClose = () => {
  configForm.value = {
    slave_id: 1,
    function_code: 3,
    register_address: 0,
    data_type: 'float32',
    byte_order: 'ABCD',
  }
}
defineExpose({
  open,
})

// ===== bit_position 与 register_address 规则 =====
function normalizeType(v: string): string {
  return (v || '').toLowerCase()
}

const canEditBitPosition = computed(() => {
  const fc = Number(configForm.value.function_code)
  const dt = normalizeType(configForm.value.data_type)
  const isBoolFC = (fc === 3 || fc === 4) && (dt === 'bool' || dt === 'boolean')
  const is16 = dt === 'float16' || dt === 'int16' || dt === 'uint16'
  return isBoolFC || is16
})

const bitPositionPlaceholder = computed(() =>
  canEditBitPosition.value
    ? 'Please enter bit position (0-15)'
    : 'Editable when FC is 3/4 with bool, or type is 16-bit',
)

function onBitPositionChange(v: number) {
  const nv = Math.max(0, Math.min(15, Math.round(Number(v))))
  ;(configForm.value as any).bit_position = nv
}

function getRegisterAddressStr() {
  const v: any = (configForm.value as any).register_address
  return v == null ? '' : String(v)
}

function onRegisterAddressInput(str: string) {
  const digits = (str || '').replace(/\D+/g, '').slice(0, 5)
  ;(configForm.value as any).register_address = digits === '' ? undefined : Number(digits)
}

watch(
  () => [configForm.value.function_code, configForm.value.data_type],
  () => {
    if (!canEditBitPosition.value && (configForm.value as any).bit_position != null) {
      ;(configForm.value as any).bit_position = undefined
    }
  },
)

// ===== 根据 point_type 限制 data_type 与 function_code =====
const DATA_TYPE_BY_POINT: Record<string, string[]> = {
  T: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64'],
  S: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64', 'bool'],
  C: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64', 'bool'],
  A: ['int16', 'float16', 'uint16', 'int32', 'float32', 'uint32', 'float64'],
}
const FC_BY_POINT: Record<string, number[] | ((dt: string) => number[])> = {
  T: [1, 2, 3, 4],
  S: [1, 2, 3, 4],
  C: (dt: string) => {
    const t = normalizeType(dt)
    return t === 'bool' || t === 'boolean' ? [5, 15] : [6, 16]
  },
  A: (dt: string) => {
    const t = normalizeType(dt)
    return t === 'bool' || t === 'boolean' ? [5, 15] : [6, 16]
  },
}

function getDataTypeOptions() {
  const allow = DATA_TYPE_BY_POINT[point_type.value] || []
  return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
}

function getFunctionCodeOptions() {
  const rule = FC_BY_POINT[point_type.value]
  if (!rule) return FUNCTION_CODE_OPTIONS
  const allowed = Array.isArray(rule) ? rule : rule(configForm.value.data_type)
  return FUNCTION_CODE_OPTIONS.filter((opt) => allowed.includes(Number(opt.value)))
}

// data_type 变动时，校验 function_code 合法性
watch(
  () => configForm.value.data_type,
  () => {
    const allowed = getFunctionCodeOptions().map((o) => Number(o.value))
    if (
      configForm.value.function_code != null &&
      !allowed.includes(Number(configForm.value.function_code))
    ) {
      ;(configForm.value as any).function_code = undefined
    }
  },
)
</script>

<style scoped lang="scss">
.voltage-class .point-config-dialog {
  .el-form-item {
    margin-bottom: 20px;
  }
}
</style>
