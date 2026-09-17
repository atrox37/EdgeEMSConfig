<template>
  <PointTableShell pagination="bordered" :editing="props.isEditing">
    <template #toolbar>
      <PointTableToolbar
        v-if="props.viewMode === 'mappings'"
        v-model:signal-name-filter="signalNameFilterRaw"
        :signal-name-options="signalNameOptions"
      >
        <template #actions>
          <template v-if="!props.isEditing && props.showActions">
            <el-button type="primary" @click="handleExport">Export</el-button>
          </template>
          <template v-else-if="props.showActions">
            <span v-if="importedFileName" class="point-table__import-name">{{ importedFileName }}</span>
            <el-button type="primary" @mousedown="handleImportClick">Import</el-button>
          </template>
        </template>
      </PointTableToolbar>
    </template>

    <template #prepend>
      <input
        ref="fileInputRef"
        type="file"
        accept=".csv"
        style="display: none"
        @change="handleFileChange"
      />
    </template>

    <el-table
      :data="paginatedData"
      :row-key="(row: any) => row.point_id"
      :row-class-name="getRowClass"
      :height="tableBodyHeight"
      stripe
      class="point-table__table"
      empty-text="no Data"
      v-loading="props.loading"
    >
        <el-table-column
          prop="point_id"
          label="Point ID"
          min-width="120"
          :class-name="POINT_TABLE_COL.pointId"
        >
          <template #default="{ row }">
            <span>{{ row.point_id }}</span>
          </template>
        </el-table-column>

        <el-table-column
          prop="signal_name"
          label="Point Name"
          min-width="220"
          show-overflow-tooltip
          :class-name="POINT_TABLE_COL.signalName"
        >
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
          <template #default="{ row: rawRow }">
            <PointTableCell
              :is-editing="props.isEditing"
              :field-class="getFieldClass(pointRow(rawRow), col.fieldClassKey)"
              :invalid="!!getMappingFieldError(pointRow(rawRow), col.errorKey)"
              :error="getMappingFieldError(pointRow(rawRow), col.errorKey)"
            >
              <template #edit>
                <el-input
                  size="small"
                  v-if="col.editor === 'input'"
                  :model-value="
                    col.getValue
                      ? col.getValue(pointRow(rawRow))
                      : String((pointRow(rawRow).protocol_mapping as any)[col.key] ?? '')
                  "
                  :placeholder="col.placeholder || ''"
                  :disabled="col.disabled ? col.disabled(pointRow(rawRow)) : false"
                  style="width: 100% !important"
                  @input="
                    (val: any) =>
                      col.onInput
                        ? col.onInput(pointRow(rawRow), String(val))
                        : col.onChange && col.onChange(pointRow(rawRow))
                  "
                />
                <el-select
                  size="small"
                  v-else-if="col.editor === 'select'"
                  v-model="(pointRow(rawRow).protocol_mapping as any)[col.key]"
                  :disabled="col.disabled ? col.disabled(pointRow(rawRow)) : false"
                  :fit-input-width="true"
                  :filterable="true"
                  :clearable="true"
                  :placeholder="getSelectPlaceholder(pointRow(rawRow), col)"
                  :popper-class="col.popperClass"
                  @change="() => col.onChange && col.onChange(pointRow(rawRow))"
                >
                  <el-option
                    v-for="option in col.getOptions ? col.getOptions(pointRow(rawRow)) : []"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </template>
              <template #display>{{ col.display(pointRow(rawRow)) }}</template>
            </PointTableCell>
          </template>
        </el-table-column>
    </el-table>

    <template #pagination>
      <PointTablePagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @size-change="() => (currentPage = 1)"
      />
    </template>
  </PointTableShell>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue'
import PointTableShell from '@/components/pointTable/PointTableShell.vue'
import PointTableToolbar from '@/components/pointTable/PointTableToolbar.vue'
import PointTableCell from '@/components/pointTable/PointTableCell.vue'
import PointTablePagination from '@/components/pointTable/PointTablePagination.vue'
import { ElMessage } from 'element-plus'
import { OriginalPointsKey, ChannelNameKey } from '@/utils/key'
import type { PointInfo } from '@/types/channelConfiguration'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { usePointTableFilters } from '@/composables/usePointTableFilters'
import { usePointTableBodyHeight } from '@/composables/usePointTableBodyHeight'
import { useRowStatusHelpers } from '@/composables/useRowStatusHelpers'
import { useMappingCsvHandlers } from '@/composables/useMappingCsvHandlers'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { useMappingRowEditing } from '@/composables/useMappingRowEditing'
import {
  cloneMappingPointForEdit,
  useMappingEditor,
} from '@/composables/useMappingEditor'
import { useMappingExport } from '@/composables/useMappingExport'
import { getMappingColumns } from '@/schemas/channelTableColumns'
import { POINT_TABLE_COL } from '@/constants/pointTable'
import { canEditMappingBitPosition, validateMappingField, validateMappingRow } from '@/validators/channelMappings'
import { asTableRow } from '@/utils/tableRow'

const pointRow = (row: unknown): PointInfo => asTableRow<PointInfo>(row);
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

const tableBodyHeight = usePointTableBodyHeight()

const emit = defineEmits<{
  'enter-edit-mode': []
  'change-edit-filter': [value: string]
}>()

const originalPoints = inject(OriginalPointsKey, ref<PointInfo[]>([]))
const injectedChannelName = inject(ChannelNameKey, ref(''))
const originalPointsList = computed<PointInfo[]>(() => {
  if (Array.isArray(props.originalPoints) && props.originalPoints.length >= 0) {
    return props.originalPoints as PointInfo[]
  }
  return (originalPoints?.value || []) as PointInfo[]
})

const editPoints = ref<PointInfo[]>([])
const importedFileName = ref('')

const validateMappingValidity = (point: PointInfo) =>
  validateMappingRow(point, {
    pointType: props.pointType,
    channelProtocol: props.channelProtocol,
  })

const {
  signalNameFilterRaw,
  signalNameFilter,
  signalNameOptions,
  currentPage,
  pageSize,
  paginatedData,
  total,
} = usePointTableFilters<PointInfo>({
  listRef: editPoints,
  getSignalName: (p) => p.signal_name || '',
  getEditFilters: () => props.editFilters,
})

const { getRowClass, getFieldClass, hasChanges } =
  useRowStatusHelpers<PointInfo>({
    listRef: editPoints,
    isEditing: () => props.isEditing,
    getBaseRowClass: (row) =>
      `row-status-${(row as any).rowStatus || "normal"}`,
  });

const validateMappingFieldOnly = (item: PointInfo, field: string) =>
  validateMappingField(item, field, {
    pointType: props.pointType,
    channelProtocol: props.channelProtocol,
  });

const {
  getFieldError: getMappingFieldError,
  refreshFieldErrorsForRow: refreshMappingFieldErrorsForRow,
  refreshFieldErrorsForList: refreshMappingFieldErrorsForList,
  validateAndSetField: validateAndSetMappingField,
} = useFieldErrors<PointInfo>({
  listRef: editPoints,
  validateField: validateMappingFieldOnly,
  getFieldsForRow: () => {
    if (props.channelProtocol === "can")
      return [
        "can_id",
        "can_offset",
        "can_bit_position",
        "can_bit_length",
        "can_data_type",
      ];
    if (props.channelProtocol === "di_do") return ["gpio_number"];
    return [
      "slave_id",
      "function_code",
      "register_address",
      "data_type",
      "byte_order",
      "bit_position",
    ];
  },
  clearFields: () => {
    if (props.channelProtocol === "can")
      return [
        "gpio_number",
        "slave_id",
        "function_code",
        "register_address",
        "data_type",
        "byte_order",
        "bit_position",
      ];
    if (props.channelProtocol === "di_do")
      return [
        "slave_id",
        "function_code",
        "register_address",
        "data_type",
        "byte_order",
        "bit_position",
      ];
    return ["gpio_number"];
  },
});

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

const {
  ensureProtocolMappingForEdit,
  onMappingFieldChange,
  onFunctionCodeChange,
  onMappingDataTypeChange,
  getMappingRegisterAddressStr,
  onMappingRegisterAddressInput,
  getMappingFunctionCodeLabel,
  getMappingDataTypeOptions,
  getMappingByteOrderOptionsSafe,
  getSelectPlaceholder,
  getEditedData,
  getInvalidDetails,
} = useMappingEditor({
  pointType: () => props.pointType,
  channelProtocol: () => props.channelProtocol,
  editPoints,
  mappingRow: {
    updateMappingChangeStatus,
    resetBitPositionIfNeeded,
    adjustByteOrderForNewType,
  },
  fieldErrors: {
    refreshFieldErrorsForRow: refreshMappingFieldErrorsForRow,
  },
})

const { handleMappingsCsvContent } = useMappingCsvHandlers({
  pointType: () => props.pointType,
  channelProtocol: () => props.channelProtocol,
  editPoints,
  originalPointsList,
  setImportedFileName: (name) => {
    importedFileName.value = name;
  },
  enterEditMode: () => emit("enter-edit-mode"),
  validateMappingValidity,
  refreshMappingFieldErrorsForList,
  notify: {
    success: (msg) => ElMessage.success(msg),
    warning: (msg) => ElMessage.warning(msg),
    error: (msg) => ElMessage.error(msg),
    info: (msg) => ElMessage.info(msg),
  },
});

const { fileInputRef, handleImportClick, handleFileChange } =
  useCsvImportExport({
    onParse: handleMappingsCsvContent,
    onError: (message) => {
      ElMessage.error(message);
    },
  });

const { handleExport } = useMappingExport({
  editPoints,
  pointType: () => props.pointType,
  channelProtocol: () => props.channelProtocol,
  channelName: () => String(injectedChannelName?.value || ''),
  notify: {
    warning: (message) => ElMessage.warning(message),
    success: (message) => ElMessage.success(message),
  },
})

watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  (val) => {
    if (!val.isEditing && Array.isArray(val.points)) {
      editPoints.value = val.points.map((item) => cloneMappingPointForEdit(item))
      if (Array.isArray(editPoints.value)) {
        editPoints.value.forEach((point) => validateMappingValidity(point))
        refreshMappingFieldErrorsForList()
      }
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.isEditing,
  (editing) => {
    if (editing && Array.isArray(editPoints.value)) {
      editPoints.value.forEach(ensureProtocolMappingForEdit)
      editPoints.value.forEach((point) => validateMappingValidity(point))
      refreshMappingFieldErrorsForList()
    } else if (!editing) {
      editPoints.value = originalPointsList.value.map((item) => cloneMappingPointForEdit(item))
      refreshMappingFieldErrorsForList()
    }
  },
)

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

const clearImportedFileName = () => {
  importedFileName.value = ''
}

defineExpose({
  getEditedData,
  fileInputRef,
  clearImportedFileName,
  clearSignalNameFilter: () => {
    signalNameFilter.value = "";
  },
  hasInvalid: () => {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some(
          (p: any) =>
            (p && p.rowStatus !== "deleted" && (p as any).isInvalid === true) ||
            (p &&
              p.rowStatus !== "deleted" &&
              !validateMappingValidity(p as PointInfo)),
        )
      : false;
  },
  getInvalidDetails: () => getInvalidDetails(refreshMappingFieldErrorsForList),
  scrollToTop: () => {
    // 重置到第一页
    currentPage.value = 1;
  },
  hasChanges,
});
</script>
