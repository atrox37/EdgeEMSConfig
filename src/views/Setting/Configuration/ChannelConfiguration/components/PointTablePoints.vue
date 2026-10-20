<template>
  <PointTableShell :editing="props.isEditing">
    <template #toolbar>
      <PointTableToolbar
        v-if="props.viewMode === 'points'"
        v-model:signal-name-filter="signalNameFilterRaw"
        :signal-name-options="signalNameOptions"
      >
        <template #actions>
          <template v-if="!props.isEditing && props.showActions">
            <el-button :type="props.publishMode ? 'default' : 'primary'" @click="emit('toggle-publish')">
              {{ props.publishMode ? 'Cancel Publish' : 'Batch Publish' }}
            </el-button>
            <el-button v-if="!props.publishMode" type="primary" @click="handleExport">
              Export
            </el-button>
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
      :row-key="(row: any) => row.rowKey"
      :row-class-name="getRowClass"
      :height="tableBodyHeight"
      stripe
      class="point-table__table"
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
          <template #default="{ row: rawRow }">
            <PointTableCell
              :is-editing="
                !!(col.isEditable && (!col.canEdit || col.canEdit(pointRow(rawRow))) && props.isEditing && pointRow(rawRow).rowStatus !== 'deleted')
              "
              :field-class="getFieldClass(pointRow(rawRow), col.fieldClassKey)"
              :error="
                pointRow(rawRow).rowStatus !== 'deleted'
                  ? getFieldError(pointRow(rawRow), col.errorKey)
                  : ''
              "
            >
              <template #edit>
                <el-input
                  size="small"
                  v-if="col.editor === 'input'"
                  :model-value="getCellInputValue(pointRow(rawRow), col)"
                  :placeholder="col.placeholder || ''"
                  style="width: 100% !important"
                  @input="(val: string) => handleNumberOrTextInput(pointRow(rawRow), col, val)"
                  @blur="() => handleNumberOrTextBlur(pointRow(rawRow), col)"
                />
                <el-select
                  size="small"
                  v-else-if="col.editor === 'select'"
                  v-model="(pointRow(rawRow) as any)[col.key]"
                  :fit-input-width="true"
                  filterable
                  :placeholder="col.placeholder || ''"
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

        <el-table-column
          v-if="props.showOperationColumn && !props.publishMode"
          label="Operation"
          width="169"
          fixed="right"
          :class-name="POINT_TABLE_COL.operation"
        >
          <template #header>
            <PointTableOpBtn
              v-if="props.isEditing"
              variant="add"
              icon="i-tabler-plus"
              label="Add"
              @click="handleAddNewPoint"
            />
            <span v-else>Operation</span>
          </template>
          <template #default="{ row: rawRow }">
            <PointTableOpCell>
              <template v-if="props.isEditing">
                <PointTableOpBtn
                  v-if="pointRow(rawRow).rowStatus === 'deleted'"
                  variant="restore"
                  icon="i-tabler-refresh"
                  label="Restore"
                  @click="handleRestorePoint(pointRow(rawRow))"
                />
                <PointTableOpBtn
                  v-else
                  variant="delete"
                  icon="i-tabler-trash"
                  label="Delete"
                  @click="handleDeletePoint(pointRow(rawRow))"
                />
              </template>
              <PointTableOpBtn
                v-else
                variant="publish"
                icon="i-tabler-send"
                label="Publish"
                @click="handlePublish(pointRow(rawRow))"
              />
            </PointTableOpCell>
          </template>
        </el-table-column>

        <el-table-column
          v-else-if="props.showOperationColumn"
          label="Publish Value"
          min-width="169"
          fixed="right"
          :class-name="POINT_TABLE_COL.publishValue"
        >
          <template #default="{ row }">
            <PointTablePublishCell
              :kind="
                props.pointType === 'C' || props.pointType === 'S'
                  ? 'channel-binary'
                  : props.pointType === 'A' || props.pointType === 'T'
                    ? 'channel-numeric'
                    : 'empty'
              "
              v-model="publishValues[row.point_id]"
              @change="notifyPublishChange"
            />
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

    <template #append>
      <ValuePublishDialog ref="valuePublishDialogRef" />
    </template>
  </PointTableShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PointTableOpBtn from '@/components/pointTable/PointTableOpBtn.vue'
import PointTableOpCell from '@/components/pointTable/PointTableOpCell.vue'
import PointTablePublishCell from '@/components/pointTable/PointTablePublishCell.vue'
import PointTableShell from '@/components/pointTable/PointTableShell.vue'
import PointTableToolbar from '@/components/pointTable/PointTableToolbar.vue'
import PointTableCell from '@/components/pointTable/PointTableCell.vue'
import PointTablePagination from '@/components/pointTable/PointTablePagination.vue'
import { POINT_TABLE_COL } from '@/constants/pointTable'
import type { PointInfo } from '@/types/channelConfiguration'
import ValuePublishDialog from './ValuePublishDialog.vue'
import { useChannelPointTableEditor } from '@/composables/useChannelPointTableEditor'
import { usePointTableBodyHeight } from '@/composables/usePointTableBodyHeight'

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
  channelProtocol?: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do' | 'iec61850'
  showRealtimeColumns?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'points',
  editFilters: () => [],
  publishMode: false,
  showOperationColumn: true,
  showActions: true,
  loading: false,
  channelProtocol: 'modbus_tcp',
  showRealtimeColumns: true,
})

const emit = defineEmits<{
  'publish-change': [dirty: boolean]
  'toggle-publish': []
  'enter-edit-mode': [payload?: { fromImport?: boolean }]
  'change-edit-filter': [value: string]
}>()

const valuePublishDialogRef = ref<InstanceType<typeof ValuePublishDialog> | null>(null)
const tableBodyHeight = usePointTableBodyHeight()

const {
  pointRow,
  pointColumns,
  importedFileName,
  signalNameFilterRaw,
  signalNameOptions,
  currentPage,
  pageSize,
  paginatedData,
  total,
  publishValues,
  notifyPublishChange,
  fileInputRef,
  getRowClass,
  getFieldClass,
  getCellInputValue,
  handleNumberOrTextInput,
  handleNumberOrTextBlur,
  getFieldError,
  handleDeletePoint,
  handleRestorePoint,
  handleAddNewPoint,
  handleImportClick,
  handleFileChange,
  handleExport,
  handlePublish,
  applyRealtimeValues,
  getEditedData,
  addPoint,
  getPublishCommands,
  resetPublish,
  hasPublishChanges,
  clearImportedFileName,
  scrollToTop,
  hasInvalid,
  getInvalidDetails,
  hasChanges,
  clearSignalNameFilter,
} = useChannelPointTableEditor({
  pointType: () => props.pointType,
  points: () => props.points,
  originalPoints: () => props.originalPoints,
  editFilters: () => props.editFilters,
  isEditing: () => props.isEditing,
  publishMode: () => !!props.publishMode,
  channelProtocol: () => props.channelProtocol,
  showRealtimeColumns: () => props.showRealtimeColumns,
  onPublishChange: (dirty) => emit('publish-change', dirty),
  onEnterEditMode: (payload) => emit('enter-edit-mode', payload),
  openValuePublishDialog: (params) => {
    valuePublishDialogRef.value?.open(params)
  },
})

defineExpose({
  getEditedData,
  addPoint,
  getPublishCommands,
  resetPublish,
  hasPublishChanges,
  fileInputRef,
  clearImportedFileName,
  applyRealtimeValues,
  clearSignalNameFilter,
  scrollToTop,
  hasInvalid,
  getInvalidDetails,
  hasChanges,
})
</script>
