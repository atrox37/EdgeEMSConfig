<template>
  <PointTableShell variant="device">
    <template #toolbar>
      <PointTableToolbar
        v-if="props.viewMode === 'points'"
        v-model:signal-name-filter="signalNameFilterRaw"
        :signal-name-options="signalNameOptions"
      >
        <template #actions>
          <el-button v-if="!props.publishMode" type="primary" @click="handleExport">Export</el-button>
        </template>
      </PointTableToolbar>
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
          :label="col.label"
          :min-width="col.minWidth"
          :width="col.width"
          :class-name="col.className"
        >
          <template #default="{ row }">
            <PointTableCell :field-class="col.valueClassName">
              <template #display>{{ col.display(row, columnCtx) }}</template>
            </PointTableCell>
          </template>
        </el-table-column>

        <el-table-column
          v-if="!props.publishMode"
          label="Operation"
          min-width="169"
          :class-name="POINT_TABLE_COL.operation"
        >
          <template #default="{ row }">
            <PointTableOpCell>
              <PointTableOpBtn
                v-if="
                  props.category === 'action' ||
                  props.category === 'measurement' ||
                  props.category === 'property'
                "
                :variant="props.category === 'property' ? 'execute' : 'publish'"
                icon="i-tabler-send"
                :label="props.category === 'property' ? 'Execute' : 'Publish'"
                @click="handleExecute(row)"
              />
            </PointTableOpCell>
          </template>
        </el-table-column>

        <el-table-column
          v-else
          label="Publish Value"
          min-width="182"
          fixed="right"
          :class-name="POINT_TABLE_COL.publishValue"
        >
          <template #default="{ row }">
            <PointTablePublishCell
              :kind="props.category === 'action' ? 'device-action' : 'empty'"
              v-model="publishValues[getPointId(row)]"
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
      <ExecuteDialog ref="executeDialogRef" />
    </template>
  </PointTableShell>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import PointTableOpBtn from '@/components/pointTable/PointTableOpBtn.vue'
import PointTableOpCell from '@/components/pointTable/PointTableOpCell.vue'
import PointTableCell from '@/components/pointTable/PointTableCell.vue'
import PointTablePublishCell from '@/components/pointTable/PointTablePublishCell.vue'
import PointTableShell from '@/components/pointTable/PointTableShell.vue'
import PointTableToolbar from '@/components/pointTable/PointTableToolbar.vue'
import PointTablePagination from '@/components/pointTable/PointTablePagination.vue'
import ExecuteDialog from './ExecuteDialog.vue'
import { POINT_TABLE_COL } from '@/constants/pointTable'
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import { InstanceNameKey } from '@/utils/key'
import { usePointTableFilters } from '@/composables/usePointTableFilters'
import { usePointTableBodyHeight } from '@/composables/usePointTableBodyHeight'
import { buildCsv } from '@/utils/csvSchema'
import {
  downloadCsv,
  formatUpdateTimeForCsv,
  getTimestampCompact,
} from '@/utils/csvExport'
import { devicePointCsvSchema } from '@/schemas/devicePoints'
import {
  getDevicePointColumns,
  type DevicePointColumnContext,
  type DevicePointRow,
} from '@/schemas/deviceTableColumns'

interface Props {
  category: 'measurement' | 'action' | 'property'
  points: Array<InstanceActionItem | InstanceMeasurementItem | InstancePropertyItem>
  originalPoints?: Array<InstanceActionItem | InstanceMeasurementItem | InstancePropertyItem>
  viewMode: 'points' | 'routing'
  editFilters: string[]
  isEditing: boolean
  publishMode?: boolean
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  viewMode: 'points',
  editFilters: () => [],
  publishMode: false,
  loading: false,
})
const tableBodyHeight = usePointTableBodyHeight()
const emit = defineEmits<{
  'publish-change': [dirty: boolean]
  'toggle-publish': []
}>()

const editPoints = ref<any[]>([])
const publishValues = ref<Record<number | string, any>>({})
const injectedInstanceName = inject(InstanceNameKey, ref(''))
const executeDialogRef = ref<{
  open: (point_id: string, category: 'action' | 'measurement' | 'property') => void
} | null>(null)

const {
  signalNameFilterRaw,
  signalNameOptions,
  currentPage,
  pageSize,
  paginatedData,
  total,
} = usePointTableFilters<any>({
  listRef: editPoints,
  getSignalName: (p) => String(p?.name || ''),
  getEditFilters: () => props.editFilters,
})

let rowKeySeed = 1
function createRowKey(): string {
  rowKeySeed += 1
  return `${Date.now()}-${rowKeySeed}-${Math.random().toString(36).slice(2, 8)}`
}

watch(
  () => ({ points: props.points }),
  (val) => {
    if (!Array.isArray(val.points)) return
    editPoints.value = val.points.map((item: any) => {
      const clone = { ...item }
      clone.rowKey = (item as any).rowKey || createRowKey()
      clone.rowStatus = clone.rowStatus || 'normal'
      return clone
    })
  },
  { immediate: true, deep: true },
)

function getPointId(item: DevicePointRow): number {
  if (props.category === 'measurement') return Number(item.measurement_id)
  if (props.category === 'action') return Number(item.action_id)
  if (props.category === 'property') return Number(item.property_id)
  return 0
}

const columnCtx = computed<DevicePointColumnContext>(() => ({
  category: props.category,
  getPointId,
}))

const pointColumns = computed(() => getDevicePointColumns(columnCtx.value))

function getRowClass({ row }: { row?: any }) {
  const item = row || {}
  const baseClass = (item as any)?.isImported
    ? 'row-status-added'
    : `row-status-${item.rowStatus || 'normal'}`
  const classes: string[] = [baseClass]
  if (props.isEditing && (item as any).isInvalid) classes.push('row-invalid')
  return classes.join(' ')
}

function notifyPublishChange() {
  emit('publish-change', hasPublishChanges())
}
function hasPublishChanges(): boolean {
  const cmds = getPublishCommands()
  return cmds.length > 0
}
function resetPublish() {
  publishValues.value = {}
  notifyPublishChange()
}
function getPublishCommands(): Array<{ id: string; value: number }> {
  if (props.category !== 'action') return []
  const commands: Array<{ id: string; value: number }> = []
  Object.entries(publishValues.value).forEach(([key, val]) => {
    if (val !== '' && val !== null && val !== undefined) {
      const num = Number(val)
      commands.push({ id: key, value: num })
    }
  })
  return commands
}

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
    const id = getPointId(p)
    const newVal = valueMap.get(id)
    if (newVal !== undefined) p.value = newVal
    const newTs = tsMap.get(id)
    if (newTs !== undefined) p.update_ts = newTs
  })
}

function handleExecute(item: any) {
  const id = getPointId(item)
  executeDialogRef.value?.open(String(id), props.category)
}

const handleExport = async () => {
  const allPoints = Array.isArray(props.points) ? props.points : editPoints.value || []
  if (!allPoints || allPoints.length === 0) {
    ElMessage.warning('No data to export')
    return
  }
  const rows = allPoints.map((item: any) => ({
    point_id: getPointId(item),
    point_name: String(item.name || ''),
    value: item.value ?? '',
    update_time:
      props.category === 'property' ? '' : formatUpdateTimeForCsv(item.update_ts),
    unit: String(item.unit || ''),
    description: String(item.description || ''),
  }))
  const csvContent = buildCsv(devicePointCsvSchema, rows)
  const safeName =
    String(injectedInstanceName?.value || '')
      .trim()
      .replace(/[^\w-]+/g, '_') || 'device'
  const filename = `${safeName}_${props.category}_points_${getTimestampCompact()}.csv`
  const saveResult = await downloadCsv(csvContent, filename)
  ElMessage.success(`Exported to ${saveResult.displayPath}`)
}

defineExpose({
  getPublishCommands,
  resetPublish,
  hasPublishChanges,
  applyRealtimeValues,
})
</script>
