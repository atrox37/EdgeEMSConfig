<template>
  <div class="voltage-class point-table device-point-table">
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
      <el-button v-if="!props.publishMode" type="primary" @click="handleExport">Export</el-button>
    </div>

    <div class="point-table__wrapper">
      <el-table
        :data="paginatedData"
        :row-key="(row: any) => row.rowKey"
        :row-class-name="getRowClass"
        class="point-table__el-table"
        empty-text="no Data"
        v-loading="props.loading"
      >
        <!-- Point ID -->
        <el-table-column label="Point ID" width="120">
          <template #default="{ row }">
            <span>{{ getPointId(row) }}</span>
          </template>
        </el-table-column>

        <!-- Point Name -->
        <el-table-column label="Point Name" min-width="220">
          <template #default="{ row }">
            <span>{{ row.name }}</span>
          </template>
        </el-table-column>

        <!-- Value -->
        <el-table-column label="Value" min-width="120">
          <template #default="{ row }">
            <span class="value-field">{{ row.value ?? '-' }}</span>
          </template>
        </el-table-column>

        <!-- Unit -->
        <el-table-column label="Unit" min-width="120">
          <template #default="{ row }">
            <span>{{ row.unit || '' }}</span>
          </template>
        </el-table-column>

        <!-- Description -->
        <el-table-column label="Description" min-width="220">
          <template #default="{ row }">
            <span>{{ row.description || '' }}</span>
          </template>
        </el-table-column>

        <!-- Operation -->
        <el-table-column
          v-if="!props.publishMode"
          label="Operation"
          min-width="169"
          fixed="right"
          class-name="operation-column"
        >
          <template #default="{ row }">
            <div class="point-table__operation-cell">
              <div
                class="point-table__publish-btn"
                v-if="props.category === 'action' || props.category === 'measurement'"
                @click="handlePublish(row)"
              >
                <el-icon><Position /></el-icon>
                <span>Execute</span>
              </div>
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
            <el-input-number
              v-if="props.category === 'action'"
              v-model="publishValues[getPointId(row)]"
              :controls="false"
              align="left"
              @change="notifyPublishChange"
            />
            <span v-else>-</span>
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

    <ExecuteDialog ref="executeDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { Position } from '@element-plus/icons-vue'
import ExecuteDialog from './ExecuteDialog.vue'
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import { InstanceNameKey } from '@/utils/key'
import { usePointTableBase } from '@/composables/usePointTableBase'
import { buildCsv } from '@/utils/csvSchema'
import { downloadCsv, getTimestampCompact } from '@/utils/csvExport'
import { devicePointCsvSchema } from '@/schemas/devicePoints'

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
const emit = defineEmits<{
  'publish-change': [dirty: boolean]
  'toggle-publish': []
}>()

const editPoints = ref<any[]>([])
const publishValues = ref<Record<number | string, any>>({})
const injectedInstanceName = inject(InstanceNameKey, ref(''))
const executeDialogRef = ref<{
  open: (point_id: string, category: 'action' | 'measurement') => void
} | null>(null)

const { signalNameFilterRaw, signalNameFilter, signalNameOptions, currentPage, pageSize, paginatedData } =
  usePointTableBase<any>({
    listRef: editPoints,
    getSignalName: (p) => String(p?.name || ''),
    getFiltered: () => filteredPoints.value,
  })

watch(
  [signalNameFilter, () => props.editFilters],
  () => {
    currentPage.value = 1
  },
)

const filteredPoints = computed(() => {
  const list = Array.isArray(editPoints.value) ? editPoints.value : []
  let result = [...list]
  if (signalNameFilter.value) {
    const kw = String(signalNameFilter.value || '').toLowerCase()
    result = result.filter((p) =>
      String(p.name || '')
        .toLowerCase()
        .includes(kw),
    )
  }
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

function getPointId(item: any): number {
  if (props.category === 'measurement') return Number(item.measurement_id)
  if (props.category === 'action') return Number(item.action_id)
  if (props.category === 'property') return Number(item.property_id)
  return 0
}

function getRowClass(item: any) {
  const baseClass = (item as any).isImported
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

function applyRealtimeValues(values: Record<string | number, number>) {
  if (!values || !Array.isArray(editPoints.value)) return
  const valueMap = new Map<number, number>()
  Object.entries(values).forEach(([k, v]) => {
    const id = Number(k)
    if (Number.isFinite(id)) valueMap.set(id, Number(v))
  })
  if (valueMap.size === 0) return
  editPoints.value.forEach((p: any) => {
    const id = getPointId(p)
    const newVal = valueMap.get(id)
    if (newVal !== undefined) {
      p.value = newVal
    }
  })
}

function handlePublish(item: any) {
  const id = getPointId(item)
  executeDialogRef.value?.open(String(id), props.category as 'action' | 'measurement')
}

const handleExport = () => {
  const allPoints = Array.isArray(props.points) ? props.points : editPoints.value || []
  if (!allPoints || allPoints.length === 0) {
    ElMessage.warning('No data to export')
    return
  }
  const rows = allPoints.map((item: any) => ({
    point_id: getPointId(item),
    point_name: String(item.name || ''),
    value: item.value ?? '',
    unit: String(item.unit || ''),
    description: String(item.description || ''),
  }))
  const csvContent = buildCsv(devicePointCsvSchema, rows)
  const safeName =
    String(injectedInstanceName?.value || '')
      .trim()
      .replace(/[^\w-]+/g, '_') || 'device'
  const filename = `${safeName}_${props.category}_points_${getTimestampCompact()}.csv`
  downloadCsv(csvContent, filename)
  ElMessage.success(`Exported to ${filename}`)
}

defineExpose({
  getPublishCommands,
  resetPublish,
  hasPublishChanges,
  applyRealtimeValues,
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

    .point-table__publish-btn {
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

    .point-table__publish-btn {
      color: #000;
      &:hover {
        color: #ff6900;
      }
    }
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
