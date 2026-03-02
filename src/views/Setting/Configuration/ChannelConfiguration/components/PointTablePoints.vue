<template>
  <div class="voltage-class point-table">
    <!-- 按钮控制区域 -->
    <div v-if="props.viewMode === 'points'" class="table-action-controls">
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
      <!-- 非编辑模式：显示Batch Publish和Export -->
      <template v-if="!props.isEditing && props.showActions">
        <el-button :type="props.publishMode ? 'default' : 'primary'" @click="handleTogglePublish">
          {{ props.publishMode ? 'Cancel Publish' : 'Batch Publish' }}
        </el-button>
        <el-button v-if="!props.publishMode" type="primary" @click="handleExport">
          Export
        </el-button>
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
        :row-key="(row: any) => row.rowKey"
        :row-class-name="getRowClass"
        class="point-table__el-table"
        empty-text="no Data"
        v-loading="props.loading"
      >
        <el-table-column
          v-for="col in pointColumns"
          :key="col.key"
          :prop="col.prop"
          :label="col.label"
          :min-width="col.minWidth"
          :class-name="col.className"
          :show-overflow-tooltip="(props.isEditing && col.key === 'signal_name') ? false : (col.showOverflow ?? false)"
        >
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template
                v-if="col.isEditable && (!col.canEdit || col.canEdit(row)) && props.isEditing && row.rowStatus !== 'deleted'"
              >
                <div class="point-table-cell-content" :class="getFieldClass(row, col.fieldClassKey)">
                  <div class="inline-edit-container">
                    <el-input
                      v-if="col.editor === 'input'"
                      :model-value="getCellInputValue(row, col)"
                      :placeholder="col.placeholder || ''"
                      style="width: 100% !important"
                      @input="(val: string) => handleNumberOrTextInput(row, col, val)"
                      @blur="() => handleNumberOrTextBlur(row, col)"
                    />
                    <el-select
                      v-else-if="col.editor === 'select'"
                      v-model="(row as any)[col.key]"
                      :fit-input-width="true"
                      filterable
                      :placeholder="col.placeholder || ''"
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
              <div
                v-if="props.isEditing && getFieldError(row, col.errorKey) && row.rowStatus !== 'deleted'"
                class="field-error"
              >
                {{ getFieldError(row, col.errorKey) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Operation / Publish Value -->
        <el-table-column
          v-if="props.showOperationColumn && !props.publishMode"
          label="Operation"
          width="169"
          fixed="right"
          class-name="operation-column"
        >
          <template #header>
            <div
              v-if="props.isEditing"
              class="point-table__add-btn"
              @click="handleAddNewPoint"
            >
              <el-icon><Plus /></el-icon>
              <span>Add</span>
            </div>
            <span v-else>Operation</span>
          </template>
          <template #default="{ row }">
            <div class="point-table__operation-cell">
              <template v-if="props.isEditing">
                <template v-if="row.rowStatus === 'deleted'">
                  <div class="point-table__restore-btn" @click="handleRestorePoint(row)">
                    <el-icon><RefreshLeft /></el-icon>
                    <span>Restore</span>
                  </div>
                </template>
                <template v-else>
                  <div class="point-table__delete-btn" @click="handleDeletePoint(row)">
                    <el-icon><Delete /></el-icon>
                    <span>Delete</span>
                  </div>
                </template>
              </template>
              <template v-else>
                <div class="point-table__publish-btn" @click="handlePublish(row)">
                  <el-icon><Position /></el-icon>
                  <span>Publish</span>
                </div>
              </template>
            </div>
          </template>
        </el-table-column>

        <!-- Publish Value（与 Operation 列宽一致） -->
        <el-table-column
          v-else-if="props.showOperationColumn"
          label="Publish Value"
          min-width="169"
          fixed="right"
          class-name="publish-value-column"
        >
          <template #default="{ row }">
            <template v-if="props.pointType === 'C' || props.pointType === 'S'">
              <el-select
                filterable
                v-model="publishValues[row.point_id]"
                placeholder="Select"
                popper-class="inline-publish-popper"
                :fit-input-width="true"
                @change="notifyPublishChange"
                clearable
              >
                <el-option label="1" :value="1" />
                <el-option label="0" :value="0" />
              </el-select>
            </template>
            <template v-else-if="props.pointType === 'A' || props.pointType === 'T'">
              <el-input-number
                v-model="publishValues[row.point_id]"
                :controls="false"
                align="left"
                @change="notifyPublishChange"
              />
            </template>
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

    <ValuePublishDialog ref="valuePublishDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { OriginalPointsKey, ChannelNameKey } from '@/utils/key'
import {
  Delete,
  Plus,
  Position,
  RefreshLeft,
} from '@element-plus/icons-vue'
import type { PointInfo } from '@/types/channelConfiguration'
import ValuePublishDialog from './ValuePublishDialog.vue'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { usePointTableBase } from '@/composables/usePointTableBase'
import { useRowStatusHelpers } from '@/composables/useRowStatusHelpers'
import { usePointRowEditing } from '@/composables/usePointRowEditing'
import { usePointCsvHandlers } from '@/composables/usePointCsvHandlers'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { usePointInlineEditing } from '@/composables/usePointInlineEditing'
import { getPointCsvSchema } from '@/schemas/channelProtocols'
import { getPointColumns } from '@/schemas/channelTableColumns'
import { buildCsv } from '@/utils/csvSchema'
import {
  buildChannelCsvFilename,
  downloadCsv,
  formatUpdateTimeForCsv,
  getTimestampCompact,
} from '@/utils/csvExport'
import { validatePointField, validatePointRow } from '@/validators/channelPoints'
// lodash-es 替换
const toLower = (v: any) => String(v ?? '').toLowerCase()
const isTA = computed(() => props.pointType === 'T' || props.pointType === 'A')

const pointColumns = computed(() =>
  getPointColumns({
    isEditing: props.isEditing,
    isTA: isTA.value,
    onFieldInput,
    canEditPointId: (row) =>
      (row as any).rowStatus === 'added' ||
      (row as any).isNewUnconfirmed ||
      (row as any).isImported,
  }),
)


// Props 说明
// - pointType: 当前表所属的大类（T/S/C/A），影响列与校验
// - points: 父组件传入的当前 Tab 点位集合（用于渲染）
// - originalPoints: 父组件传入的“接口原始点位数据”（仅用于非导入行的对比）
// - viewMode/editFilters/isEditing/publishMode: 控制渲染模式、筛选标签、编辑态与发布态
interface Props {
  pointType: 'T' | 'S' | 'C' | 'A'
  points: PointInfo[]
  originalPoints?: PointInfo[]
  viewMode: 'points' | 'mappings'
  editFilters: string[]
  isEditing: boolean
  publishMode?: boolean
  showOperationColumn?: boolean
  showActions?: boolean
  loading?: boolean
  channelProtocol?: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'points',
  editFilters: () => [],
  publishMode: false,
  showOperationColumn: true,
  showActions: true,
  loading: false,
  channelProtocol: 'modbus_tcp',
})
const emit = defineEmits<{
  'publish-change': [dirty: boolean]
  'toggle-publish': []
  'enter-edit-mode': [payload?: { fromImport?: boolean }]
  'change-edit-filter': [value: string]
}>()

const injectedOriginalPoints = inject(OriginalPointsKey, ref<PointInfo[]>([]))
const injectedChannelName = inject(ChannelNameKey, ref(''))
// 原始点位对比基线：优先使用父组件透传 originalPoints；否则回退到注入值
const originalPointsList = computed<PointInfo[]>(() => {
  if (Array.isArray(props.originalPoints) && props.originalPoints.length >= 0) {
    return props.originalPoints as PointInfo[]
  }
  return (injectedOriginalPoints?.value || []) as PointInfo[]
})

const editPoints = ref<PointInfo[]>([])
let filteredPoints = computed<PointInfo[]>(() => [])
const pendingNewRow = ref<PointInfo | null>(null)
const importedFileName = ref('')
const showSignalNameFilter = ref(false)
const publishValues = ref<Record<string, number | null>>({})
const numericInputDraft = ref<Record<string, string>>({})
const valuePublishDialogRef = ref<InstanceType<typeof ValuePublishDialog> | null>(null)
let rowKeySeed = 1
const createRowKey = () => `row_${Date.now()}_${rowKeySeed++}`

const getCellDraftKey = (row: any, col: any) => `${String((row as any).rowKey ?? row.point_id)}::${String(col.key)}`
const isNumericColumn = (col: any) =>
  col && (col.min !== undefined || col.max !== undefined || col.precision !== undefined)
const getCellInputValue = (row: any, col: any) => {
  if (isNumericColumn(col)) {
    const key = getCellDraftKey(row, col)
    if (Object.prototype.hasOwnProperty.call(numericInputDraft.value, key)) {
      return numericInputDraft.value[key]
    }
  }
  return typeof (row as any)[col.key] === 'number'
    ? String((row as any)[col.key])
    : String((row as any)[col.key] ?? '')
}

// 列表筛选：支持 signal name 关键字与"Status（modified/added/deleted/invalid）"
// Status 筛选由父组件通过 editFilters prop 传递
// 导入后，页面只显示导入的点位信息（不显示被删除的点位，除非用户主动筛选 deleted）

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

  // 如果当前有导入的文件名，且没有主动筛选 deleted 状态，则过滤掉 deleted 状态的点位
  // 这样页面只显示导入的点位信息
  if (
    importedFileName.value &&
    (!props.editFilters || props.editFilters.length === 0 || props.editFilters[0] !== 'deleted')
  ) {
    result = result.filter((p) => (p as any).rowStatus !== 'deleted')
  }

  if (signalNameFilter.value) {
    const kw = toLower(String(signalNameFilter.value || ''))
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
      result = result.filter((p) => (p as any).rowStatus !== 'deleted' && (p as any).isInvalid === true)
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
  getBaseRowClass: (row) =>
    (row as any).isImported ? 'row-status-added' : `row-status-${(row as any).rowStatus || 'normal'}`,
})

const validatePointFieldOnly = (item: PointInfo, field: string) =>
  validatePointField(item, field, {
    channelProtocol: props.channelProtocol,
    points: editPoints.value,
  })

const {
  getFieldError: getFieldErrorCore,
  refreshFieldErrorsForRow,
  refreshFieldErrorsForList,
  validateAndSetField,
} = useFieldErrors<PointInfo>({
  listRef: editPoints,
  validateField: validatePointFieldOnly,
  getFieldsForRow: () => {
    const fields = ['point_id', 'signal_name', 'reverse']
    if (props.channelProtocol !== 'di_do') fields.push('scale', 'offset', 'unit')
    return fields
  },
  clearFields: () =>
    props.channelProtocol === 'di_do' ? ['scale', 'offset', 'unit'] : [],
})

const {
  applyDuplicatePointIdInvalid,
  recomputeAllValidity,
  deletePoint,
  restorePoint,
} = usePointRowEditing({
  listRef: editPoints,
  channelProtocol: () => props.channelProtocol,
  validateRow: validateRowValidity,
  refreshFieldErrorsForRow,
})

const { updateRowChangeStatus } = usePointInlineEditing({
    editPoints,
    originalPointsList,
    pendingNewRow,
    signalNameFilter,
    showSignalNameFilter,
    validateRowValidity,
    applyDuplicatePointIdInvalid,
    recomputeAllValidity,
    refreshFieldErrorsForRow,
  })

function handleDeletePoint(row: PointInfo) {
  if ((row as any).isNewUnconfirmed) {
    const idx = editPoints.value.findIndex((p: any) => (p as any).rowKey === (row as any).rowKey)
    if (idx !== -1) editPoints.value.splice(idx, 1)
    recomputeAllValidity()
    refreshFieldErrorsForList()
  } else {
    deletePoint(row)
    recomputeAllValidity()
    refreshFieldErrorsForList()
  }
}
function handleRestorePoint(row: PointInfo) {
  restorePoint(row, originalPointsList.value)
  recomputeAllValidity()
  refreshFieldErrorsForList()
}

const { handlePointsCsvContent } = usePointCsvHandlers({
  pointType: () => props.pointType,
  channelProtocol: () => props.channelProtocol || 'modbus_tcp',
  editPoints,
  originalPointsList,
  createRowKey,
  setImportedFileName: (name) => {
    importedFileName.value = name
  },
  enterEditMode: (payload) => emit('enter-edit-mode', payload),
  refreshFieldErrorsForList,
  recomputeAllValidity,
  notify: {
    success: (msg) => ElMessage.success(msg),
    warning: (msg) => ElMessage.warning(msg),
    error: (msg) => ElMessage.error(msg),
  },
})

const { fileInputRef, handleImportClick, handleFileChange } = useCsvImportExport({
  onParse: handlePointsCsvContent,
  onError: (message, error) => {
    if (error) console.error(error)
    ElMessage.error(message)
  },
})



watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.points)) {
      // 非编辑状态：清理未确认的新增行引用
      pendingNewRow.value = null
      editPoints.value = val.points.map((item: PointInfo) => {
        const clone: any = {
          ...item,
          rowStatus: item.rowStatus || 'normal',
        }
        // 为每一行分配稳定且唯一的 rowKey（会覆盖缺失的情况）
        clone.rowKey = (item as any).rowKey || createRowKey()
        // 记录原始 point_id，用于确认时判断是否还原或标记为新增
        if (clone.originalPointId === undefined) clone.originalPointId = item.point_id
        return clone
      })
      // 首次载入或刷新后执行一次有效性检测
      if (Array.isArray(editPoints.value)) {
        editPoints.value.forEach((p) => validateRowValidity(p))
        refreshFieldErrorsForList()
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
      pendingNewRow.value = null
      editPoints.value.forEach((p) => validateRowValidity(p))
      refreshFieldErrorsForList()
    } else if (!editing) {
      // 退出编辑：恢复为原始对比基线（originalPointsList），清理所有未确认的新增行
      const baseline = (originalPointsList.value as PointInfo[]).map((item: PointInfo) => {
        const clone: any = {
          ...item,
          rowStatus: item.rowStatus || 'normal',
        }
        clone.rowKey = (item as any).rowKey || createRowKey()
        if (clone.originalPointId === undefined) clone.originalPointId = item.point_id
        return clone
      })
      editPoints.value = baseline
      // 清理未确认的新增行引用
      pendingNewRow.value = null
      refreshFieldErrorsForList()
    }
  },
)

// 退出批量发布模式时清空发布值（仅当前 Tab）
watch(
  () => props.publishMode,
  (val, oldVal) => {
    if (oldVal && !val) {
      clearCurrentTabPublish()
    }
  },
)

const getNextPointId = () => {
  const allIds = editPoints.value.map((p) => p.point_id).filter((id) => id > 0)
  return allIds.length > 0 ? Math.max(...allIds) + 1 : 1
}
const handleAddNewPoint = () => {
  const newId = getNextPointId()
  const newPoint: PointInfo = {
    point_id: newId,
    signal_name: '',
    scale: 1,
    offset: 0,
    unit: '',
    data_type: 'float',
    reverse: false,
    description: '',
    isNewUnconfirmed: true,
    rowStatus: 'added',
  }
  ;(newPoint as any).rowKey = createRowKey()
  ;(newPoint as any).originalPointId = undefined
  ;(newPoint as any).hideErrorsOnce = false
  editPoints.value.unshift(newPoint)
  validateRowValidity(newPoint)
  refreshFieldErrorsForRow(newPoint)
  applyDuplicatePointIdInvalid()
  scrollToTop()
}
const scrollToTop = () => {
  // 重置到第一页
  currentPage.value = 1
}



// 校验当前行是否有效；返回 true 表示有效，false 表示无效
// 规则：
// - 公共：point_id 为正整数；signal_name 非空；reverse 为布尔
// - modbus 协议：scale/offset 必须为数字；unit 无限制
// - di_do 协议：无需校验 scale/offset/unit
function validateRowValidity(point: PointInfo): boolean {
  return validatePointRow(point, { channelProtocol: props.channelProtocol })
}

// 检查并标记重复的 point_id（正整数）


// handlePointIdChange 已不再使用，保留用于未来可能的扩展
// function handlePointIdChange(item: PointInfo) {
//   // 基础校验 + 全表重复校验
//   validateRowValidity(item)
//   applyDuplicatePointIdInvalid()
// }

function notifyPublishChange() {
  emit('publish-change', hasPublishChanges())
}
// 字段级即时校验（仅字段本身，不改变整行校验逻辑）
function getFieldError(item: any, field: string): string {
  if (item && (item as any).hideErrorsOnce) return ''
  return getFieldErrorCore(item, field)
}
function onFieldInput(item: any, field: string) {
  if (item && (item as any).hideErrorsOnce) (item as any).hideErrorsOnce = false
  validateAndSetField(item, field)
  updateRowChangeStatus(item)
}
function handleNumberOrTextInput(row: any, col: any, val: string) {
  const isNum = isNumericColumn(col)
  if (isNum) {
    const allowDecimal = col.precision !== undefined && col.precision > 0
    const draftKey = getCellDraftKey(row, col)
    let sanitized = String(val ?? '').replace(/[^\d.-]/g, '')
    sanitized = sanitized.replace(/(?!^)-/g, '')
    const firstDot = sanitized.indexOf('.')
    if (firstDot >= 0) {
      sanitized = sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '')
    }
    numericInputDraft.value[draftKey] = sanitized
    if (sanitized === '' || sanitized === '-') {
      row[col.key] = undefined
    } else {
      const parsed = allowDecimal ? parseFloat(sanitized) : parseInt(sanitized, 10)
      if (!isNaN(parsed)) {
        let v = parsed
        if (col.min !== undefined && v < col.min) v = col.min
        if (col.max !== undefined && v > col.max) v = col.max
        row[col.key] = v
      }
    }
  } else {
    row[col.key] = val
  }
  ;(col.onInput || col.onChange)?.(row)
}
function handleNumberOrTextBlur(row: any, col: any) {
  if (!isNumericColumn(col)) return
  const draftKey = getCellDraftKey(row, col)
  const draft = numericInputDraft.value[draftKey]
  if (typeof draft !== 'string') return
  if (draft === '' || draft === '-' || draft === '.' || draft === '-.') {
    row[col.key] = undefined
  } else {
    const allowDecimal = col.precision !== undefined && col.precision > 0
    const parsed = allowDecimal ? parseFloat(draft) : parseInt(draft, 10)
    if (!isNaN(parsed)) {
      let v = parsed
      if (col.min !== undefined && v < col.min) v = col.min
      if (col.max !== undefined && v > col.max) v = col.max
      row[col.key] = v
    }
  }
  delete numericInputDraft.value[draftKey]
  ;(col.onInput || col.onChange)?.(row)
}
function getPublishCommands(): Array<{ id: string; value: number }> {
  const commands: Array<{ id: string; value: number }> = []
  Object.entries(publishValues.value).forEach(([key, val]) => {
    if (val !== null && val !== undefined) {
      const num = Number(val)
      // // 对 Adjustment 保证为浮点语义（允许小数）
      // if (props.pointType === 'A' && Number.isInteger(num)) {
      //   num = Number(`${num}.0`)
      // }
      if (Number.isFinite(num)) commands.push({ id: key, value: num })
    }
  })
  return commands
}
function hasPublishChanges(): boolean {
  return getPublishCommands().length > 0
}
function resetPublish() {
  publishValues.value = {}
  notifyPublishChange()
}

function clearCurrentTabPublish() {
  if (Array.isArray(editPoints.value)) {
    editPoints.value.forEach((p) => {
      publishValues.value[p.point_id] = null
    })
  }
  notifyPublishChange()
}

// 实时值更新：根据 point_id 批量写入 value 和 update_ts（时间戳）
function applyRealtimeValues(
  values: Record<string | number, number>,
  ts?: Record<string | number, number>,
) {
  if (!values || !Array.isArray(editPoints.value)) return
  const valueMap = new Map<number, number>()
  Object.entries(values).forEach(([k, v]) => {
    const id = Number(k)
    if (Number.isFinite(id)) valueMap.set(id, Number(v))
  })
  const tsMap = new Map<number, number>()
  if (ts && typeof ts === 'object') {
    Object.entries(ts).forEach(([k, v]) => {
      const id = Number(k)
      if (Number.isFinite(id)) tsMap.set(id, Number(v))
    })
  }
  if (valueMap.size === 0 && tsMap.size === 0) return
  editPoints.value.forEach((p: any) => {
    const newVal = valueMap.get(p.point_id)
    if (newVal !== undefined) p.value = newVal
    const newTs = tsMap.get(p.point_id)
    if (newTs !== undefined) p.update_ts = newTs
  })
}

const handlePublish = (pointRow: PointInfo) => {
  if (!valuePublishDialogRef.value) return
  valuePublishDialogRef.value.open({
    pointId: pointRow.point_id,
    dataType: pointRow.data_type,
    category: props.pointType as 'C' | 'A' | 'T' | 'S',
  })
}

const addPoint = (point: PointInfo) => {
  editPoints.value.push({ ...point, rowStatus: 'added' })
}
const getEditedData = () => editPoints.value

const handleTogglePublish = () => {
  emit('toggle-publish')
}

const clearImportedFileName = () => {
  importedFileName.value = ''
}

// 导出功能（Points）
// 文件名：{channelName}_{tab}_{timestamp}.csv
const handleExport = () => {
  if (!editPoints.value || editPoints.value.length === 0) {
    ElMessage.warning('No data to export')
    return
  }

  const schema = getPointCsvSchema(props.pointType, props.channelProtocol || 'modbus_tcp')
  const rows = (editPoints.value || []).map((point) => ({
    point_id: String(point.point_id ?? ''),
    point_name: String(point.signal_name ?? ''),
    value: String(point.value ?? ''),
    update_time: formatUpdateTimeForCsv((point as any).update_ts),
    scale: String(point.scale ?? ''),
    offset: String(point.offset ?? ''),
    unit: String(point.unit ?? ''),
    reverse: point.reverse ? 'true' : 'false',
  }))
  const tabNames: Record<string, string> = {
    T: 'telemetry',
    S: 'signal',
    C: 'control',
    A: 'adjustment',
  }
  const filename = buildChannelCsvFilename(String(injectedChannelName?.value || ''), [
    tabNames[props.pointType],
    getTimestampCompact(),
  ])
  const csvContent = buildCsv(schema, rows)
  downloadCsv(csvContent, filename)

  ElMessage.success(`Exported to ${filename}`)
}



// 对外暴露：供父组件进行提交/发布/清理调用
defineExpose({
  getEditedData,
  addPoint,
  getPublishCommands,
  resetPublish,
  hasPublishChanges,
  fileInputRef,
  clearImportedFileName,
  applyRealtimeValues,
  clearSignalNameFilter: () => {
    signalNameFilter.value = ''
    showSignalNameFilter.value = false
  },
  scrollToTop,
  hasInvalid: () => {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some(
          (p: any) =>
            p &&
            p.rowStatus !== 'deleted' &&
            ((p as any).isInvalid === true ||
              !validateRowValidity(p as PointInfo)) /* 保守校验一次 */,
        )
      : false
  },
  getInvalidDetails: () => {
    ;(editPoints.value || []).forEach((p: any) => {
      if (p && p.rowStatus !== 'deleted') (p as any).hideErrorsOnce = false
    })
    refreshFieldErrorsForList()
    applyDuplicatePointIdInvalid()
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
  width: 100%;

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
      padding: 9px 12px;
    }

    :deep(.el-table__row) {
      position: relative;
    }

    // 新增/修改/删除：在 Point ID 单元格左侧显示 10px 状态条
    :deep(.row-status-added td.point-id-column),
    :deep(.row-status-modified td.point-id-column),
    :deep(.row-status-deleted td.point-id-column) {
      position: relative;
      padding-left: 14px;
      &::before {
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

    // :deep(td.el-table__cell) {
    //   position: relative;
    //   height: 32px;
    // }
    :deep(.point-table-cell-wrapper) {
      position: static;
      display: flex;
      align-items: center;
      min-height: 32px;
      width: 100%;
    }
    :deep(.point-table-cell-content) {
      flex: 1;
      // padding-bottom: 9px;
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
      left: 12px;
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

  // 表头 Add 按钮（在 Operation 列 header）
  :deep(.point-table__add-btn) {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    color: #67c23a;
    font-size: 16px;
    span {
      font-size: 12px;
    }
    &:hover {
      color: #85ce61;
    }
  }

  // 顶部工具栏中的筛选下拉与输入框左侧对齐
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

    .point-table__setting-btn {
      color: #000;
      &:hover {
        color: #ff6900;
      }
    }
    .point-table__publish-btn {
      color: #000;
      cursor: pointer;
      &:hover {
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
    &:has(.el-select.is-focus),
    &:has(.el-select:hover) {
      z-index: 100;
    }
  }

  .inline-reverse-popper,
  .inline-mapping-popper,
  .inline-publish-popper {
    z-index: 9999 !important;
    position: absolute !important;
  }

  // 行状态样式（已在上面的 el-table 样式中处理）

  // 字段状态颜色（保持原色用于区分）
  .field-modified {
    color: #409eff !important;
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
    color: #67c23a !important;
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
    display: flex;
    justify-content: flex-end;
    align-items: center;
    :deep(.el-pagination .el-pager .number.is-active) {
      background-color: $primary-color;
      border-color: $primary-color;
      color: #fff;
      font-weight: 600;
      border-radius: 6px;
    }
  }

}
</style>
