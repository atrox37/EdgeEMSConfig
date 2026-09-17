<template>
  <PointTableShell variant="routing" pagination="bordered" :editing="props.isEditing">
    <template #toolbar>
      <PointTableToolbar
        v-if="props.viewMode === 'routing'"
        v-model:signal-name-filter="signalNameFilterRaw"
        :signal-name-options="signalNameOptions"
      >
        <template #actions>
          <template v-if="!props.isEditing">
            <el-button type="primary" @click="handleExport">Export</el-button>
          </template>
          <template v-else>
            <span v-if="importedFileName" class="point-table__import-name">{{ importedFileName }}</span>
            <el-button type="primary" @mousedown="handleImportClick">Import</el-button>
          </template>
        </template>
      </PointTableToolbar>
    </template>

    <template #prepend>
      <input ref="fileInputRef" type="file" accept=".csv" style="display: none" @change="handleFileChange" />
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
          v-for="col in routingColumns"
          :key="col.key"
          :label="col.label"
          :min-width="col.minWidth"
          :class-name="col.className"
        >
          <template #default="{ row }">
            <PointTableCell v-if="col.editor === 'readonly'">
              <template #display>{{ col.display(row, columnCtx) }}</template>
            </PointTableCell>
            <PointTableCell
              v-else
              :is-editing="props.isEditing"
              :field-class="getFieldClass(row, col.fieldClassKey)"
              :error="getRoutingFieldError(row, col.errorKey)"
            >
              <template #edit>
                <el-select
                  v-if="col.editor === 'channel'"
                  size="small"
                  v-model="row.routing.channel_id"
                  :fit-input-width="true"
                  :placeholder="col.placeholder"
                  :popper-class="col.popperClass"
                  @change="() => onSelectChannel(row)"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="opt in props.channels"
                    :key="opt.id"
                    :label="opt.name"
                    :value="opt.id"
                  />
                </el-select>
                <el-select
                  v-else-if="col.editor === 'channel-type'"
                  size="small"
                  v-model="row.routing.channel_type"
                  :fit-input-width="true"
                  :disabled="col.disabled?.(row)"
                  :popper-class="col.popperClass"
                  @change="() => onChannelTypeChange(row)"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="opt in getChannelTypeOptions()"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <el-select
                  v-else-if="col.editor === 'channel-point'"
                  size="small"
                  v-model="row.routing.channel_point_id"
                  :fit-input-width="true"
                  :placeholder="col.placeholder"
                  :disabled="col.disabled?.(row)"
                  :popper-class="col.popperClass"
                  @change="(val: string | number) => onSelectChannelPoint(row, val)"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="opt in getChannelPointOptions(row)"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
                <el-select
                  v-else-if="col.editor === 'enabled'"
                  size="small"
                  v-model="row.routing.enabled"
                  :fit-input-width="true"
                  :placeholder="col.placeholder"
                  :popper-class="col.popperClass"
                  @change="() => onRoutingFieldChange(row, 'enabled')"
                  clearable
                  filterable
                >
                  <el-option label="true" :value="true" />
                  <el-option label="false" :value="false" />
                </el-select>
              </template>
              <template #display>{{ col.display(row, columnCtx) }}</template>
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
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import { InstanceNameKey } from '@/utils/key'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { usePointTableFilters } from '@/composables/usePointTableFilters'
import { usePointTableBodyHeight } from '@/composables/usePointTableBodyHeight'
import { buildCsv } from '@/utils/csvSchema'
import { downloadCsv, getTimestampCompact } from '@/utils/csvExport'
import {
  getDeviceRoutingColumns,
  type DeviceRoutingColumnContext,
  type DeviceRoutingRow,
} from '@/schemas/deviceTableColumns'
import { deviceRoutingExportSchema } from '@/schemas/deviceRouting'
import {
  cloneDeviceRoutingEditRow,
  useDeviceRoutingEditor,
  type DeviceRoutingEditRow,
} from '@/composables/deviceRouting/useDeviceRoutingEditor'
import { useDeviceRoutingCsvImport } from '@/composables/deviceRouting/useDeviceRoutingCsvImport'

interface Props {
  category: 'measurement' | 'action' | 'property'
  points: Array<InstanceActionItem | InstanceMeasurementItem | InstancePropertyItem>
  originalPoints?: Array<InstanceActionItem | InstanceMeasurementItem | InstancePropertyItem>
  viewMode: 'points' | 'routing'
  editFilters: string[]
  isEditing: boolean
  channels?: Array<{ id: number; name: string }>
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'routing',
  editFilters: () => [],
  channels: () => [],
  loading: false,
})

const tableBodyHeight = usePointTableBodyHeight()

const editPoints = ref<DeviceRoutingEditRow[]>([])
const importedFileName = ref('')
const injectedInstanceName = inject(InstanceNameKey, ref(''))

const routingEditor = useDeviceRoutingEditor({
  category: () => props.category,
  isEditing: () => props.isEditing,
  channels: () => props.channels,
  originalPoints: () => props.originalPoints,
  editPoints,
})

const {
  getPointId,
  getChannelTypeOptions,
  getRoutingFieldError,
  onRoutingFieldChange,
  onSelectChannel,
  getChannelPointOptions,
  onSelectChannelPoint,
  onChannelTypeChange,
  getRowClass,
  getFieldClass,
  getEditedData,
  hasChanges,
  preloadChannelPointsForRows,
} = routingEditor

const { handleRoutingCsvContent } = useDeviceRoutingCsvImport({
  category: () => props.category,
  isEditing: () => props.isEditing,
  channels: () => props.channels,
  originalPoints: () => props.originalPoints,
  editPoints,
  importedFileName,
  editor: routingEditor,
  notify: {
    success: (message) => ElMessage.success(message),
    warning: (message) => ElMessage.warning(message),
    error: (message) => ElMessage.error(message),
  },
})

const {
  signalNameFilterRaw,
  signalNameFilter,
  signalNameOptions,
  currentPage,
  pageSize,
  paginatedData,
  total,
} = usePointTableFilters<DeviceRoutingEditRow>({
  listRef: editPoints,
  getSignalName: (p) => String(p?.name || ''),
  getEditFilters: () => props.editFilters,
})

watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  (val) => {
    if (!Array.isArray(val.points)) return

    editPoints.value = val.points.map((item) => cloneDeviceRoutingEditRow(item))

    if (val.isEditing) {
      importedFileName.value = ''
      preloadChannelPointsForRows()
    }
  },
  { immediate: true, deep: true },
)

const columnCtx = computed<DeviceRoutingColumnContext>(() => ({
  category: props.category,
  getPointId: (row: DeviceRoutingRow) => getPointId(row as DeviceRoutingEditRow),
}))

const routingColumns = computed(() => getDeviceRoutingColumns(columnCtx.value))

const { fileInputRef, handleImportClick, handleFileChange } = useCsvImportExport({
  onParse: handleRoutingCsvContent,
  onError: (message) => {
    ElMessage.error(message)
  },
})
void fileInputRef

const clearImportedFileName = () => {
  importedFileName.value = ''
}

const handleExport = async () => {
  const allPoints = Array.isArray(props.points) ? props.points : editPoints.value || []
  if (!allPoints || allPoints.length === 0) {
    ElMessage.warning('No data to export')
    return
  }
  const rows = allPoints.map((item) => {
    const r = (item as DeviceRoutingRow).routing || {}
    return {
      point_id: getPointId(item as DeviceRoutingEditRow),
      point_name: String(item.name || ''),
      channel_id: r.channel_id ?? '',
      channel_name: String(r.channel_name || ''),
      channel_point_type: String(r.channel_type || ''),
      channel_point_id: r.channel_point_id ?? '',
      channel_point_name: String(r.channel_point_name || ''),
      enabled: r.enabled === true ? 'true' : r.enabled === false ? 'false' : '',
    }
  })
  const csvContent = buildCsv(deviceRoutingExportSchema, rows)
  const safeName =
    String(injectedInstanceName?.value || '')
      .trim()
      .replace(/[^\w-]+/g, '_') || 'device'
  const filename = `${safeName}_${props.category}_routing_${getTimestampCompact()}.csv`
  const saveResult = await downloadCsv(csvContent, filename)
  ElMessage.success(`Exported to ${saveResult.displayPath}`)
}

defineExpose({
  getEditedData,
  clearImportedFileName,
  clearSignalNameFilter: () => {
    signalNameFilter.value = ''
  },
  hasInvalid: () => {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some((p) => p && p.isInvalid === true)
      : false
  },
  hasChanges,
})
</script>
