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
      <template v-if="!props.isEditing">
        <el-button :type="props.publishMode ? 'warning' : 'primary'" @click="handleTogglePublish">
          {{ props.publishMode ? 'Cancel Publish' : 'Batch Publish' }}
        </el-button>
        <el-button v-if="!props.publishMode" type="primary" @click="handleExport">
          Export
        </el-button>
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
          :show-overflow-tooltip="col.showOverflow"
        >
          <template #default="{ row }">
            <div class="cell-content">
              <template v-if="col.isEditable && (!col.canEdit || col.canEdit(row)) && row.isEditing">
                <div class="inline-edit-container">
                  <el-input-number
                    v-if="col.editor === 'number'"
                    v-model="(row as any)[col.key]"
                    :min="col.min"
                    :max="col.max"
                    :controls="false"
                    align="left"
                    :precision="col.precision"
                    @change="() => col.onChange && col.onChange(row)"
                    style="width: 100% !important"
                  />
                  <el-input
                    v-else-if="col.editor === 'input'"
                    v-model="(row as any)[col.key]"
                    :placeholder="col.placeholder || ''"
                    @input="() => col.onInput && col.onInput(row)"
                    style="width: 100% !important"
                  />
                  <el-select
                    v-else-if="col.editor === 'select'"
                    v-model="(row as any)[col.key]"
                    :fit-input-width="true"
                    filterable
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
          v-if="!props.publishMode"
          label="Operation"
          min-width="169"
          fixed="right"
          class-name="operation-column"
        >
          <template #header>
            <el-icon
              v-if="props.isEditing"
              style="cursor: pointer; color: #67c23a"
              @click="handleAddNewPoint"
            >
              <Plus />
            </el-icon>
            <span v-else>Operation</span>
          </template>
          <template #default="{ row }">
            <div class="point-table__operation-cell">
              <template v-if="props.isEditing">
                <template v-if="row.isEditing">
                  <div class="point-table__confirm-btn" @click="handleConfirmInlineEdit(row)">
                    <el-icon><Check /></el-icon>
                  </div>
                  <div class="point-table__cancel-btn" @click="handleCancelInlineEdit(row)">
                    <el-icon><Close /></el-icon>
                  </div>
                </template>
                <template v-else-if="row.rowStatus === 'deleted'">
                  <div class="point-table__restore-btn" @click="restorePoint(row, originalPointsList)">
                    <el-icon><RefreshLeft /></el-icon>
                  </div>
                </template>
                <template v-else>
                  <div class="point-table__edit-btn" @click="handleStartInlineEdit(row)">
                    <el-icon><Edit /></el-icon>
                  </div>
                  <div class="point-table__delete-btn" @click="deletePoint(row)">
                    <el-icon><Delete /></el-icon>
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

        <!-- Publish Value -->
        <el-table-column
          v-else
          label="Publish Value"
          min-width="182"
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
  Edit,
  Plus,
  Position,
  RefreshLeft,
  Close,
  Check,
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
import { buildChannelCsvFilename, downloadCsv, getTimestampCompact } from '@/utils/csvExport'
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
  loading?: boolean
  channelProtocol?: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'points',
  editFilters: () => [],
  publishMode: false,
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
const valuePublishDialogRef = ref<InstanceType<typeof ValuePublishDialog> | null>(null)
let rowKeySeed = 1
const createRowKey = () => `row_${Date.now()}_${rowKeySeed++}`

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

const { handleStartInlineEdit, handleCancelInlineEdit, handleConfirmInlineEdit } =
  usePointInlineEditing({
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
      // 进入编辑状态：清理未确认的新增行，重置 pendingNewRow
      const unconfirmedIndex = editPoints.value.findIndex((p: any) => p.isNewUnconfirmed)
      if (unconfirmedIndex !== -1) {
        editPoints.value.splice(unconfirmedIndex, 1)
      }
      pendingNewRow.value = null
      // 执行有效性检测
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
  if (pendingNewRow.value) {
    scrollToTop()
    ElMessage.warning('Please confirm or cancel the pending new point first')
    return
  }
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
    isEditing: true,
    isNewUnconfirmed: true,
    rowStatus: 'normal',
  }
  ;(newPoint as any).rowKey = createRowKey()
  ;(newPoint as any).originalPointId = undefined
  ;(newPoint as any).hideErrorsOnce = true
  editPoints.value.unshift(newPoint)
  pendingNewRow.value = newPoint
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
  // 当 point_id 变化时，需要重新检查所有行的重复情况
  if (field === 'point_id') {
    applyDuplicatePointIdInvalid()
  }
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

// 实时值更新：根据 point_id 批量写入 value
function applyRealtimeValues(values: Record<string | number, number>) {
  if (!values || !Array.isArray(editPoints.value)) return
  const valueMap = new Map<number, number>()
  Object.entries(values).forEach(([k, v]) => {
    const id = Number(k)
    if (Number.isFinite(id)) valueMap.set(id, Number(v))
  })
  if (valueMap.size === 0) return
  editPoints.value.forEach((p: any) => {
    const newVal = valueMap.get(p.point_id)
    if (newVal !== undefined) {
      p.value = newVal
    }
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
  .inline-mapping-popper,
  .inline-publish-popper {
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
