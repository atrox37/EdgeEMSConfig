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
          :teleported="false"
          popper-class="signal-name-popper"
          style="width: 280px"
          :fit-input-width="true"
        >
          <el-option v-for="name in signalNameOptions" :key="name" :label="name" :value="name" />
        </el-select>
      </div>
      <!-- 非编辑模式：显示Export -->
      <template v-if="!props.isEditing">
        <el-button type="primary" @click="handleExport">Export</el-button>
      </template>

      <!-- 编辑模式：显示文件名和Import -->
      <template v-else>
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
            <div class="cell-content">
              <template v-if="props.isEditing && row.isEditing">
                <div class="inline-edit-container">
                  <el-input-number
                    v-if="col.editor === 'number'"
                    v-model="(row.protocol_mapping as any)[col.key]"
                    :min="col.min"
                    :max="col.max"
                    :step="col.step || 1"
                    :controls="false"
                    align="left"
                    :disabled="col.disabled ? col.disabled(row) : false"
                    @change="() => col.onChange && col.onChange(row)"
                    style="width: 100% !important"
                  />
                  <el-input
                    v-else-if="col.editor === 'input'"
                    :model-value="col.getValue ? col.getValue(row) : (row.protocol_mapping as any)[col.key]"
                    :placeholder="col.placeholder || ''"
                    style="width: 100% !important"
                    @input="(val: any) => col.onInput && col.onInput(row, String(val))"
                  />
                  <el-select
                    v-else-if="col.editor === 'select'"
                    v-model="(row.protocol_mapping as any)[col.key]"
                    :fit-input-width="true"
                    :filterable="true"
                    :clearable="true"
                    :popper-class="col.popperClass || 'inline-mapping-popper'"
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
              </template>
              <template v-else>
                <span :class="getFieldClass(row, col.fieldClassKey)">{{ col.display(row) }}</span>
              </template>
              <div v-if="props.isEditing && getMappingFieldError(row, col.errorKey)" class="field-error">
                {{ getMappingFieldError(row, col.errorKey) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Operation -->
        <el-table-column
          v-if="props.isEditing"
          label="Operation"
          min-width="150"
          fixed="right"
          class-name="operation-column"
        >
          <template #default="{ row }">
            <div class="point-table__operation-cell">
              <template v-if="row.isEditing">
                <div class="point-table__cancel-btn" @click="handleCancelMappingEdit(row)">
                  <el-icon><Close /></el-icon>
                </div>
                <div class="point-table__confirm-btn" @click="handleConfirmMappingEdit(row)">
                  <el-icon><Check /></el-icon>
                </div>
              </template>
              <template v-else>
                <div class="point-table__edit-btn" @click="handleStartMappingEdit(row)">
                  <el-icon><Edit /></el-icon>
                </div>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="point-table__pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20]"
        :total="total"
        layout="total, sizes, prev, pager, next"
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
import { Edit, Close, Check } from '@element-plus/icons-vue'
import type { PointInfo, UpdateMappingPoint } from '@/types/channelConfiguration'
import { DATA_TYPE_OPTIONS } from '@/types/channelConfiguration'
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
  loading?: boolean
  channelProtocol: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'mappings',
  editFilters: () => [],
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
  getFieldsForRow: () =>
    props.channelProtocol === 'di_do'
      ? ['gpio_number']
      : [
          'slave_id',
          'function_code',
          'register_address',
          'data_type',
          'byte_order',
          'bit_position',
        ],
  clearFields: () =>
    props.channelProtocol === 'di_do'
      ? ['slave_id', 'function_code', 'register_address', 'data_type', 'byte_order', 'bit_position']
      : ['gpio_number'],
})

const {
  updateMappingChangeStatus,
  resetBitPositionIfNeeded,
  adjustByteOrderForNewType,
  handleStartMappingEdit,
  handleCancelMappingEdit,
  handleConfirmMappingEdit,
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

// 进入编辑状态时，再次执行有效性检测，确保无效项高亮
watch(
  () => props.isEditing,
  (editing) => {
    if (editing && Array.isArray(editPoints.value)) {
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

function onMappingFieldChange(item: any, field: string) {
  updateMappingChangeStatus(item)
  validateAndSetMappingField(item, field)
}
function onFunctionCodeChange(item: any) {
  resetBitPositionIfNeeded(item)
  updateMappingChangeStatus(item)
  validateAndSetMappingField(item, 'function_code')
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
  validateAndSetMappingField(item, 'register_address')
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
  // 同步更新与数据类型相关的字段错误
  validateAndSetMappingField(item, 'data_type')
  validateAndSetMappingField(item, 'byte_order')
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
    if (props.channelProtocol === 'di_do') {
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
const handleExport = () => {
  if (!editPoints.value || editPoints.value.length === 0) {
    ElMessage.warning('No data to export')
    return
  }

  const schema = getMappingCsvSchema(props.channelProtocol)
  const rows = (editPoints.value || []).map((point) => {
    const m = point.protocol_mapping || ({} as any)
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
  downloadCsv(csvContent, filename)

  ElMessage.success(`Exported to ${filename}`)
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
    :deep(.row-status-added) {
      background-color: rgba(103, 194, 58, 0.1);
    }
    :deep(.row-status-modified) {
      background-color: rgba(64, 158, 255, 0.1);
    }
    :deep(.row-status-deleted) {
      background-color: rgba(245, 108, 108, 0.1);
      opacity: 0.6;
    }
    :deep(.row-invalid) {
      background-color: rgba(245, 108, 108, 0.1);
    }

    :deep(td .cell) {
      position: relative;
      height: 32px;
    }

    .cell-content {
      position: relative;
    }
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
      &:hover {
        color: #66b1ff;
      }
    }
    .point-table__delete-btn {
      color: #f56c6c;
      &:hover {
        color: #f78989;
      }
    }
    .point-table__restore-btn {
      color: #67c23a;
      &:hover {
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
      &:hover {
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
      &:hover {
        color: #85ce61;
      }
    }

    .point-table__setting-btn,
    .point-table__publish-btn {
      color: #000;
      &:hover {
        color: #ff6900;
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
    &:has(.el-select.is-focus),
    &:has(.el-select:hover) {
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
    color: #409eff !important;
  }
  .field-added {
    color: #67c23a !important;
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
      background-color: $primary-color;
      border-color: $primary-color;
      color: #fff;
      font-weight: 600;
      border-radius: 6px;
    }
  }

  .field-error {
    position: absolute;
    top: 100%;
    left: 12px;
    margin-top: 2px;
    width: 100%;
    color: #ff4d4f;
    font-size: 12px;
    line-height: 1;
  }
}

</style>
