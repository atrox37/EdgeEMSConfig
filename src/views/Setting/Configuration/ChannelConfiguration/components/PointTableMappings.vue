<template>
  <div class="voltage-class point-table">
    <!-- 按钮控制区域 -->
    <div v-if="props.viewMode === 'mappings'" class="table-action-controls">
      <div
        class="table-action-controls__filters"
        style="flex: 1; display: flex; gap: 8px; align-items: center"
      >
        <span class="filter-label">Point Name:</span>
        <el-select
          v-model="signalNameFilterRaw"
          filterable
          allow-create
          clearable
          placeholder="Search Point Name"
          style="width: 280px"
          :fit-input-width="true"
        >
          <el-option v-for="name in signalNameOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </div>
      <!-- 非编辑模式：显示Export -->
      <template v-if="!props.isEditing && props.showActions">
        <el-button type="primary" @click="handleExport">Export</el-button>
      </template>

      <!-- 编辑模式：显示文件名和Import -->
      <template v-else-if="props.showActions">
        <span v-if="importedFileName" class="imported-file-name">{{ importedFileName }}</span>
        <el-button type="primary" @mousedown="handleImportClick">Import</el-button>
      </template>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".csv"
      style="display: none"
      @change="handleFileChange"
    />

    <div class="point-table__wrapper">
      <el-table
        :data="paginatedData"
        :row-key="(row: any) => row.point_id"
        :row-class-name="getRowClass"
        class="point-table__el-table"
        empty-text="no Data"
        v-loading="props.loading"
      >

        <!-- Point ID -->
        <el-table-column prop="point_id" label="Point ID" width="80" class-name="point-id-column">
          <template #default="{ row }">
            <span>{{ row.point_id }}</span>
          </template>
        </el-table-column>

        <!-- Point Name -->
        <el-table-column prop="signal_name" label="Point Name" min-width="220" show-overflow-tooltip class-name="signal-name-column">
          <template #default="{ row }">
            <span>{{ row.signal_name }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-for="col in mappingColumns"
          :key="col.key"
          :prop="col.prop"
          :label="col.label"
          :min-width="col.minWidth"
          :class-name="col.className"
        >
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template v-if="props.isEditing">
                <div
                  class="point-table-cell-content"
                  :class="[
                    getFieldClass(row, col.fieldClassKey),
                    getMappingFieldError(row, col.errorKey) ? 'field-has-error' : '',
                  ]"
                >
                  <div class="inline-edit-container">
                    <el-input
                      v-if="col.editor === 'input'"
                      :model-value="col.getValue ? col.getValue(row) : String((row.protocol_mapping as any)[col.key] ?? '')"
                      :placeholder="col.placeholder || ''"
                      :disabled="col.disabled ? col.disabled(row) : false"
                      style="width: 100% !important"
                      @input="(val: any) => col.onInput ? col.onInput(row, String(val)) : (col.onChange && col.onChange(row))"
                    />
                    <el-select
                      v-else-if="col.editor === 'select'"
                      v-model="(row.protocol_mapping as any)[col.key]"
                      :disabled="col.disabled ? col.disabled(row) : false"
                      :fit-input-width="true"
                      :filterable="true"
                      :clearable="true"
                      :placeholder="getSelectPlaceholder(row, col)"
                      @change="() => col.onChange && col.onChange(row)"
                    >
                      <el-option
                        v-for="option in col.getOptions ? col.getOptions(row) : []"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>
              </template>
              <span v-else :class="getFieldClass(row, col.fieldClassKey)">{{ col.display(row) }}</span>
              <div v-if="props.isEditing && getMappingFieldError(row, col.errorKey)" class="field-error">
                {{ getMappingFieldError(row, col.errorKey) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Operation：直接编辑模式下已移除行级 Edit/Confirm/Cancel，此列隐藏 -->
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="point-table__pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20]"
        :total="total"
        layout="total, prev, pager, next, sizes"
        @size-change="() => (currentPage = 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue'
// 移除 pxToResponsive，不再需要
import { ElMessage } from 'element-plus'
import { OriginalPointsKey, ChannelNameKey } from '@/utils/key'
import type { PointInfo, UpdateMappingPoint } from '@/types/channelConfiguration'
import { DATA_TYPE_OPTIONS, CAN_DATA_TYPE_BY_POINT } from '@/types/channelConfiguration'
import { getMappingCsvSchema } from '@/schemas/channelProtocols'
import { getMappingColumns } from '@/schemas/channelTableColumns'
import { buildCsv } from '@/utils/csvSchema'
import { buildChannelCsvFilename, downloadCsv, getTimestampCompact } from '@/utils/csvExport'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { usePointTableBase } from '@/composables/usePointTableBase'
import { useRowStatusHelpers } from '@/composables/useRowStatusHelpers'
import { useMappingCsvHandlers } from '@/composables/useMappingCsvHandlers'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { useMappingRowEditing } from '@/composables/useMappingRowEditing'
import {
  DATA_TYPE_BY_POINT,
  canEditMappingBitPosition,
  getMappingByteOrderOptions,
  validateMappingField,
  validateMappingRow,
} from '@/validators/channelMappings'
// lodash-es 替换

// Props 说明
// - pointType: 当前表所属的大类（T/S/C/A），决定映射可选范围与校验
// - points: 父组件传入的当前 Tab 可编辑点位集合（用于渲染）
// - originalPoints: 父组件传入的“接口原始点位数据”（作为变化对比基线）
// - viewMode/editFilters/isEditing: 控制渲染模式、筛选标签与编辑态
interface Props {
  pointType: 'T' | 'S' | 'C' | 'A'
  points: PointInfo[]
  originalPoints?: PointInfo[]
  viewMode: 'points' | 'mappings'
  editFilters: string[]
  isEditing: boolean
  showActions?: boolean
  loading?: boolean
  channelProtocol: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'mappings',
  editFilters: () => [],
  showActions: true,
  loading: false,
})

const emit = defineEmits<{
  'enter-edit-mode': []
  'change-edit-filter': [value: string]
}>()

// 从 provide/inject 获取回退用的原始点位数据与通道名称
const originalPoints = inject(OriginalPointsKey, ref<PointInfo[]>([]))
const injectedChannelName = inject(ChannelNameKey, ref(''))
// 原始点位对比基线：优先使用父组件透传 originalPoints；否则回退到注入值
const originalPointsList = computed<PointInfo[]>(() => {
  if (Array.isArray(props.originalPoints) && props.originalPoints.length >= 0) {
    return props.originalPoints as PointInfo[]
  }
  return (originalPoints?.value || []) as PointInfo[]
})

const editPoints = ref<PointInfo[]>([])
let filteredPoints = computed<PointInfo[]>(() => [])
const importedFileName = ref('')

// 监听筛选变化时重置到第一页


// 列表筛选：支持 signal name 关键字与“Status（modified/invalid）”
// Status 筛选由父组件通过 editFilters prop 传递

const {
  signalNameFilterRaw,
  signalNameFilter,
  signalNameOptions,
  currentPage,
  pageSize,
  paginatedData,
} = usePointTableBase<PointInfo>({
  listRef: editPoints,
  getSignalName: (p) => p.signal_name || '',
  getFiltered: () => filteredPoints.value,
})

watch(
  [signalNameFilter, () => props.editFilters],
  () => {
    currentPage.value = 1
  },
)

filteredPoints = computed(() => {
  const list = Array.isArray(editPoints.value) ? editPoints.value : []
  let result = [...list]
  if (signalNameFilter.value) {
    const kw = String(signalNameFilter.value || '').toLowerCase()
    result = result.filter((p) =>
      String(p.signal_name || '')
        .toLowerCase()
        .includes(kw),
    )
  }
  // 使用父组件传递的 editFilters 进行筛选
  if (props.editFilters && props.editFilters.length > 0) {
    const filterValue = props.editFilters[0]
    if (filterValue === 'invalid') {
      result = result.filter((p) => (p as any).isInvalid === true)
    } else {
      result = result.filter((p) => (p as any).rowStatus === filterValue)
    }
  }
  return result
})

const total = computed(() => filteredPoints.value.length)

const { getRowClass, getFieldClass, hasChanges } = useRowStatusHelpers<PointInfo>({
  listRef: editPoints,
  isEditing: () => props.isEditing,
  getBaseRowClass: (row) => `row-status-${(row as any).rowStatus || 'normal'}`,
})

const validateMappingFieldOnly = (item: PointInfo, field: string) =>
  validateMappingField(item, field, {
    pointType: props.pointType,
    channelProtocol: props.channelProtocol,
  })

const {
  getFieldError: getMappingFieldError,
  refreshFieldErrorsForRow: refreshMappingFieldErrorsForRow,
  refreshFieldErrorsForList: refreshMappingFieldErrorsForList,
  validateAndSetField: validateAndSetMappingField,
} = useFieldErrors<PointInfo>({
  listRef: editPoints,
  validateField: validateMappingFieldOnly,
  getFieldsForRow: () => {
    if (props.channelProtocol === 'can')
      return ['can_id', 'can_offset', 'can_bit_position', 'can_bit_length', 'can_data_type']
    if (props.channelProtocol === 'di_do')
      return ['gpio_number']
    return ['slave_id', 'function_code', 'register_address', 'data_type', 'byte_order', 'bit_position']
  },
  clearFields: () => {
    if (props.channelProtocol === 'can')
      return ['gpio_number', 'slave_id', 'function_code', 'register_address', 'data_type', 'byte_order', 'bit_position']
    if (props.channelProtocol === 'di_do')
      return ['slave_id', 'function_code', 'register_address', 'data_type', 'byte_order', 'bit_position']
    return ['gpio_number']
  },
})

const {
  updateMappingChangeStatus,
  resetBitPositionIfNeeded,
  adjustByteOrderForNewType,
} = useMappingRowEditing({
  channelProtocol: () => props.channelProtocol,
  originalPointsList,
  validateMappingValidity,
  refreshFieldErrorsForRow: refreshMappingFieldErrorsForRow,
  onCancelEdit: () => {
    signalNameFilter.value = ''
  },
})

const { handleMappingsCsvContent } = useMappingCsvHandlers({
  pointType: () => props.pointType,
  channelProtocol: () => props.channelProtocol,
  editPoints,
  originalPointsList,
  setImportedFileName: (name) => {
    importedFileName.value = name
  },
  enterEditMode: () => emit('enter-edit-mode'),
  validateMappingValidity,
  refreshMappingFieldErrorsForList,
  notify: {
    success: (msg) => ElMessage.success(msg),
    warning: (msg) => ElMessage.warning(msg),
    error: (msg) => ElMessage.error(msg),
    info: (msg) => ElMessage.info(msg),
  },
})

const { fileInputRef, handleImportClick, handleFileChange } = useCsvImportExport({
  onParse: handleMappingsCsvContent,
  onError: (message, error) => {
    if (error) console.error(error)
    ElMessage.error(message)
  },
})


// 深拷贝 point（包含 protocol_mapping），避免与原始基线共享引用导致二次编辑无法识别变更
function clonePointForEdit(item: PointInfo): PointInfo {
  const cp: any = {
    ...item,
    rowStatus: item.rowStatus || 'normal',
  }
  if (item.protocol_mapping && typeof item.protocol_mapping === 'object') {
    cp.protocol_mapping = JSON.parse(JSON.stringify(item.protocol_mapping))
  }
  // 新会话基线下不带上一次会话的 modifiedFields / isEditing / fieldErrors
  delete cp.modifiedFields
  delete cp.isEditing
  delete cp.fieldErrors
  delete cp.originalData
  return cp as PointInfo
}
watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.points)) {
      editPoints.value = val.points.map((item: PointInfo) => clonePointForEdit(item))
      // 首次载入或刷新后执行一次有效性检测
      if (Array.isArray(editPoints.value)) {
        editPoints.value.forEach((p) => validateMappingValidity(p))
        refreshMappingFieldErrorsForList()
      }
    }
  },
  { immediate: true, deep: true },
)

// 进入编辑状态时，为缺少 protocol_mapping 的行初始化，并执行有效性检测
function ensureProtocolMappingForEdit(p: PointInfo) {
  if (!p.protocol_mapping) {
    if (props.channelProtocol === 'can') {
      ;(p as any).protocol_mapping = {
        can_id: undefined,
        byte_offset: undefined,
        bit_position: undefined,
        bit_length: undefined,
        data_type: undefined,
      }
    } else if (props.channelProtocol === 'di_do') {
      ;(p as any).protocol_mapping = {}
    } else {
      p.protocol_mapping = {
        slave_id: undefined,
        function_code: undefined,
        register_address: undefined,
        data_type: undefined,
        byte_order: undefined,
        bit_position: undefined,
      }
    }
  }
}
watch(
  () => props.isEditing,
  (editing) => {
    if (editing && Array.isArray(editPoints.value)) {
      editPoints.value.forEach(ensureProtocolMappingForEdit)
      editPoints.value.forEach((p) => validateMappingValidity(p))
      refreshMappingFieldErrorsForList()
    } else if (!editing) {
      // 退出编辑：恢复为最初基线（originalPointsList）的 protocol_mapping
      const baseline = (originalPointsList.value as PointInfo[]).map((item: PointInfo) =>
        clonePointForEdit(item),
      )
      editPoints.value = baseline
      refreshMappingFieldErrorsForList()
    }
  },
)


// getMappingFunctionCodeOptions 已不再使用，保留用于未来可能的扩展
// const getMappingFunctionCodeOptions = (item: PointInfo) => {
//   const dt = normalizeType(item.protocol_mapping?.data_type || '')
//   const allowed = FC_BY_POINT[props.pointType] || []
//   let validCodes: number[] = []
//   if (dt === 'bool' || dt === 'boolean')
//     validCodes = [1, 2, 5, 15].filter((c) => allowed.includes(c))
//   else validCodes = [3, 4, 6, 16].filter((c) => allowed.includes(c))
//   return validCodes.map((code) => ({ label: String(code), value: code }))
// }
const getMappingFunctionCodeLabel = (fc: number | undefined) => (fc == null ? '' : String(fc))
const getMappingDataTypeOptions = () => {
  if (props.channelProtocol === 'can') {
    const allow = CAN_DATA_TYPE_BY_POINT[props.pointType] || []
    return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
  }
  const allow = DATA_TYPE_BY_POINT[props.pointType] || []
  return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
}

const getMappingByteOrderOptionsSafe = (row: PointInfo) =>
  Array.from(getMappingByteOrderOptions(row)) as Array<{ label: string; value: any }>

const mappingColumns = computed(() =>
  getMappingColumns({
    channelProtocol: props.channelProtocol,
    pointType: props.pointType,
    onMappingFieldChange,
    onFunctionCodeChange,
    getMappingDataTypeOptions,
    getMappingRegisterAddressStr,
    onMappingRegisterAddressInput,
    onMappingDataTypeChange,
    getMappingByteOrderOptions: getMappingByteOrderOptionsSafe,
    canEditMappingBitPosition,
    getMappingFunctionCodeLabel,
  }),
)

const getSelectPlaceholder = (_row: PointInfo, col: any) => {
  const key = String(col?.key || '')
  if (key === 'function_code') return 'Select code'
  if (key === 'data_type') return 'Select type'
  if (key === 'byte_order') return 'Select order'
  return col.placeholder || 'Select'
}

function onMappingFieldChange(item: any, field: string) {
  updateMappingChangeStatus(item)
  validateMappingValidity(item)
  refreshMappingFieldErrorsForRow(item)
}
function onFunctionCodeChange(item: any) {
  resetBitPositionIfNeeded(item)
  updateMappingChangeStatus(item)
  validateMappingValidity(item)
  refreshMappingFieldErrorsForRow(item)
}

// 当不满足位编辑能力时，重置 bit_position
// 注意：如果原来的值是 0，应该保留，而不是清空
const getMappingRegisterAddressStr = (item: PointInfo) => {
  const v = item.protocol_mapping?.register_address
  return v == null ? '' : String(v)
}
// 寄存器地址输入限制：仅数字、最大 65535，并触发变更检测
const onMappingRegisterAddressInput = (item: PointInfo, str: string) => {
  if (!item.protocol_mapping) return
  const trimmed = (str || '').trim()
  // 允许完全清空（设置为 undefined）
  if (trimmed === '') {
    item.protocol_mapping.register_address = undefined
  } else {
    const digits = trimmed.replace(/\D+/g, '').slice(0, 5)
    if (digits === '') {
      item.protocol_mapping.register_address = undefined
    } else {
      const num = Number(digits)
      item.protocol_mapping.register_address = Math.min(65535, Math.max(0, num))
    }
  }
  updateMappingChangeStatus(item)
  validateMappingValidity(item)
  refreshMappingFieldErrorsForRow(item)
}

// 校验当前映射行有效性；返回 true 表示有效
function validateMappingValidity(point: PointInfo): boolean {
  return validateMappingRow(point, {
    pointType: props.pointType,
    channelProtocol: props.channelProtocol,
  })
}

// 进入单行编辑：保存原值快照以支持取消与差异可视化
function onMappingDataTypeChange(item: PointInfo) {
  resetBitPositionIfNeeded(item)
  adjustByteOrderForNewType(item)
  updateMappingChangeStatus(item)
  validateMappingValidity(item)
  // 数据类型联动后（byte_order/bit_position 可能变化），整行错误要立即重算
  refreshMappingFieldErrorsForRow(item)
}
const getEditedData = () => {
  const updates: UpdateMappingPoint[] = []
  editPoints.value.forEach((item) => {
    if (!item.protocol_mapping || !item.modifiedFields || item.modifiedFields.length === 0) return
    const changed = item.modifiedFields.filter((f) => f.startsWith('mapping_'))
    if (changed.length === 0) return
    const data: Record<string, any> = {}
    // 归一化：将“清空/未填”的值转成 null，确保请求中携带清空操作
    const normIntOrNull = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
    const normStrOrNull = (v: any) => (v === '' || v === null || v === undefined ? null : String(v))
    if (props.channelProtocol === 'can') {
      const m = item.protocol_mapping as any
      if (changed.includes('mapping_can_id')) data.can_id = normStrOrNull(m.can_id)
      if (changed.includes('mapping_can_offset')) data.byte_offset = normIntOrNull(m.byte_offset)
      if (changed.includes('mapping_can_bit_position')) data.bit_position = normIntOrNull(m.bit_position)
      if (changed.includes('mapping_can_bit_length')) data.bit_length = normIntOrNull(m.bit_length)
      if (changed.includes('mapping_can_data_type')) data.data_type = normStrOrNull(m.data_type)
    } else if (props.channelProtocol === 'di_do') {
      if (changed.includes('mapping_gpio_number')) {
        const v = (item.protocol_mapping as any).gpio_number
        data.gpio_number = normIntOrNull(v)
      }
    } else {
      if (changed.includes('mapping_slave_id'))
        data.slave_id = normIntOrNull(item.protocol_mapping.slave_id)
      if (changed.includes('mapping_function_code'))
        data.function_code = normIntOrNull(item.protocol_mapping.function_code)
      if (changed.includes('mapping_register_address'))
        data.register_address = normIntOrNull(item.protocol_mapping.register_address)
      if (changed.includes('mapping_data_type'))
        data.data_type = normStrOrNull(item.protocol_mapping.data_type)
      if (changed.includes('mapping_byte_order'))
        data.byte_order = normStrOrNull(item.protocol_mapping.byte_order)
      if (changed.includes('mapping_bit_position'))
        data.bit_position = normIntOrNull(item.protocol_mapping.bit_position)
    }
    if (Object.keys(data).length > 0 && item.point_id > 0) {
      updates.push({
        four_remote: props.pointType,
        point_id: item.point_id,
        protocol_data: data as any,
      })
    }
  })
  return updates
}

// CSV 导入功能
// 期望表头：
// - di_do：至少包含 point_id、gpio_number（其他列可有可无，顺序不限）
// - modbus_tcp/modbus_rtu：必须包含 point_id、slave_id、function_code、register_address、data_type、byte_order、bit_position；
//   point_name 可有可无（其他列也可有可无，顺序不限）
// - 校验字段取值范围并标注 isInvalid，用于“invalid”筛选
// - 仅更新当前 Tab 存在的 point_id 的映射
// - 应用后与“接口原始数据”对比，计算 modified 状态
const clearImportedFileName = () => {
  importedFileName.value = ''
}

// 导出功能（导出当前tab的映射）
// 文件名：{channelName}_{tab}_mapping_{timestamp}.csv
const handleExport = async () => {
  if (!editPoints.value || editPoints.value.length === 0) {
    ElMessage.warning('No data to export')
    return
  }

  const schema = getMappingCsvSchema(props.channelProtocol)
  const rows = (editPoints.value || []).map((point) => {
    const m = point.protocol_mapping || ({} as any)
    if (props.channelProtocol === 'can') {
      return {
        point_id: String(point.point_id ?? ''),
        point_name: String(point.signal_name ?? ''),
        can_id: String(m.can_id ?? ''),
        byte_offset: String(m.byte_offset ?? ''),
        bit_position: String(m.bit_position ?? ''),
        bit_length: String(m.bit_length ?? ''),
        data_type: String(m.data_type ?? ''),
      }
    }
    return {
      point_id: String(point.point_id ?? ''),
      point_name: String(point.signal_name ?? ''),
      slave_id: String(m.slave_id ?? ''),
      function_code: String(m.function_code ?? ''),
      register_address: String(m.register_address ?? ''),
      data_type: String(m.data_type ?? ''),
      byte_order: String(m.byte_order ?? ''),
      bit_position: String(m.bit_position ?? ''),
      gpio_number: String(m.gpio_number ?? ''),
    }
  })
  const tabNames: Record<string, string> = {
    T: 'telemetry',
    S: 'signal',
    C: 'control',
    A: 'adjustment',
  }
  const filename = buildChannelCsvFilename(String(injectedChannelName?.value || ''), [
    tabNames[props.pointType],
    'mapping',
    getTimestampCompact(),
  ])
  const csvContent = buildCsv(schema, rows)
  const saveResult = await downloadCsv(csvContent, filename)
  ElMessage.success(`Exported to ${saveResult.displayPath}`)
}



defineExpose({
  getEditedData,
  fileInputRef,
  clearImportedFileName,
  clearSignalNameFilter: () => {
    signalNameFilter.value = ''
  },
  hasInvalid: () => {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some(
          (p: any) =>
            (p && p.rowStatus !== 'deleted' && (p as any).isInvalid === true) ||
            (p && p.rowStatus !== 'deleted' && !validateMappingValidity(p as PointInfo)),
        )
      : false
  },
  getInvalidDetails: () => {
    refreshMappingFieldErrorsForList()
    const tabNames: Record<string, string> = {
      T: 'Telemetry',
      S: 'Signal',
      C: 'Control',
      A: 'Adjustment',
    }
    const tab = tabNames[props.pointType] || props.pointType
    const lines: string[] = []
    ;(editPoints.value || []).forEach((p: any) => {
      if (!p || p.rowStatus === 'deleted') return
      const errs = (p.fieldErrors && Object.entries(p.fieldErrors).filter(([, v]: [string, unknown]) => v)) || []
      if (errs.length > 0) {
        const id = p.point_id ?? '-'
        const name = p.signal_name ? ` (${String(p.signal_name).slice(0, 20)}${String(p.signal_name).length > 20 ? '...' : ''})` : ''
        errs.forEach(([field, msg]: [string, string]) => {
          lines.push(`${tab} Point ${id}${name} - ${field}: ${msg}`)
        })
      }
    })
    return lines
  },
  scrollToTop: () => {
    // 重置到第一页
    currentPage.value = 1
  },
  hasChanges,
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.table-action-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;

  .imported-file-name {
    color: #ff6900;
    font-size: 14px;
    padding: 0 10px;
  }
}

.voltage-class .point-table {
  color: #000;
  height: 100%;
  display: flex;
  flex-direction: column;

  .point-table__wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .point-table__el-table {
    flex: 1;
    overflow: hidden;
    min-height: 0;

    // 表头和固定列统一设置
    :deep(.el-table__header th),
    :deep(.el-table__body td),
    :deep(.el-table__fixed-right th),
    :deep(.el-table__fixed-right td) {
      color: #000;
      padding: 9px 12px;
    }

    :deep(.el-table__row) {
      position: relative;
    }

    // 根据行状态着色（移除左侧状态条，改为行背景色）
    // 新增/修改/删除：在 Point ID 单元格左侧显示 10px 状态条
    :deep(.row-status-added td.point-id-column),
    :deep(.row-status-modified td.point-id-column),
    :deep(.row-status-deleted td.point-id-column) {
      position: relative;
      padding-left: 14px;
      :deep(.row-status-deleted td.point-id-column)::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 10px;
      }
    }
    :deep(.row-status-added td.point-id-column::before) {
      background-color: #67c23a;
    }
    :deep(.row-status-modified td.point-id-column::before) {
      background-color: #409eff;
    }
    :deep(.row-status-deleted td.point-id-column::before) {
      background-color: #f56c6c;
    }
    :deep(.row-status-deleted) {
      opacity: 0.7;
    }
    // 错误行：整行背景色（更透明）
    :deep(.row-invalid) {
      background-color: rgba(167, 0, 0, 0.18);
    }

    :deep(td.el-table__cell) {
      position: relative;
      height: 32px;
    }
    :deep(.point-table-cell-wrapper) {
      position: static;
      display: flex;
      align-items: center;
      min-height: 32px;
      width: 100%;
    }
    :deep(.point-table-cell-content.field-has-error) {
      .el-input__wrapper,
      .el-select .el-select__wrapper {
        box-shadow: 0 0 0 1px #f56c6c inset;
      }
    }
    :deep(.point-table-cell-content) {
      flex: 1;
      box-sizing: border-box;
      // .inline-edit-container :deep(.el-input__inner),
      // .inline-edit-container :deep(.el-input-number .el-input__inner) {
      //   height: 22px !important;
      //   line-height: 22px !important;
      // }
    }
    :deep(.point-table-cell-wrapper .field-error) {
      position: absolute;
      bottom: 0;
      left:12px;
      right: 0;
      height: 9px;
      line-height: 9px;
      font-size: 9px;
      color: #ff4d4f;
      overflow: hidden;
    }

    // .cell-content {
    //   position: relative;
    // }
  }

  // 让筛选下拉与输入框左侧对齐
  :deep(.signal-name-popper) {
    left: 0 !important;
    transform: none !important;
    min-width: 100% !important;
  }

  .point-table__operation-cell {
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: center;

    .point-table__error-tip {
      color: #f56c6c;
      font-size: 18px;
      margin-right: 4px;
    }

    .point-table__edit-btn,
    .point-table__delete-btn,
    .point-table__setting-btn,
    .point-table__publish-btn,
    .point-table__restore-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 16px;
      transition: color 0.3s;

      span {
        font-size: 12px;
      }
    }

    .point-table__edit-btn {
      color: #409eff;
      .point-table__edit-btn:hover {
        color: #66b1ff;
      }
    }
    .point-table__delete-btn {
      color: #f56c6c;
      .point-table__delete-btn:hover {
        color: #f78989;
      }
    }
    .point-table__restore-btn {
      color: #67c23a;
      .point-table__restore-btn:hover {
        color: #85ce61;
      }
    }

    .point-table__cancel-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      font-size: 18px;
      color: #f56c6c;
      transition: color 0.3s;
      .point-table__cancel-btn:hover {
        color: #f78989;
      }
    }
    .point-table__confirm-btn {
      cursor: pointer;
      display: flex;
      align-items: center;
      font-size: 18px;
      color: #67c23a;
      transition: color 0.3s;
      .point-table__confirm-btn:hover {
        color: #85ce61;
      }
    }

    .point-table__setting-btn {
      color: #000;
      .point-table__setting-btn:hover {
        color: #ff6900;
      }
    }
    .point-table__publish-btn {
      color: #000;
      .point-table__publish-btn:hover {
        color: #000;
      }
    }
  }

  .inline-edit-container {
    width: 100%;
    position: relative;
    z-index: 10;

    :deep(.el-input),
    :deep(.el-input-number),
    :deep(.el-select) {
      width: 100% !important;
    }

    :deep(.el-input__inner) {
      padding: 2px 8px;
      height: 28px;
      line-height: 28px;
    }

    // 编辑状态时提升层级
    .inline-edit-container:has(.el-select.is-focus),
    .inline-edit-container:has(.el-select:hover) {
      z-index: 100;
    }
  }

  .inline-reverse-popper,
  .inline-mapping-popper {
    z-index: 9999 !important;
    position: absolute !important;
  }

  // 行状态样式（已在上面的 el-table 样式中处理）

  // 字段状态颜色（保持原色用于区分）
  .field-modified {
    color: #409eff;
    :deep(.el-input__inner),
    :deep(.el-input__wrapper),
    :deep(.el-input-number .el-input__inner),
    :deep(.el-input-number .el-input__wrapper),
    :deep(.el-select .el-select__placeholder),
    :deep(.el-select .el-select__wrapper) {
      color: #409eff !important;
    }
    :deep(.el-input__wrapper),
    :deep(.el-select .el-select__wrapper) {
      box-shadow: 0 0 0 1px #409eff inset !important;
    }
  }
  .field-added {
    color: #67c23a;
    :deep(.el-input__inner),
    :deep(.el-input__wrapper),
    :deep(.el-input-number .el-input__inner),
    :deep(.el-input-number .el-input__wrapper),
    :deep(.el-select .el-select__placeholder),
    :deep(.el-select .el-select__wrapper) {
      color: #67c23a !important;
    }
    :deep(.el-input__wrapper),
    :deep(.el-select .el-select__wrapper) {
      box-shadow: 0 0 0 1px #67c23a inset !important;
    }
  }
  .field-deleted {
    color: #f56c6c !important;
  }

  .value-field {
    color: #000 !important;
  }

  // 分页样式（固定高度，独立出去）
  .point-table__pagination {
    flex-shrink: 0;
    height: 56px;
    padding: 16px 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    border-top: 1px solid #ebeef5;
    :deep(.el-pagination .el-pager .number.is-active) {
      background-color: var(--vt-color-primary);
      border-color: var(--vt-color-primary);
      color: #fff;
      font-weight: 600;
      border-radius: 6px;
    }
  }

}

</style>
