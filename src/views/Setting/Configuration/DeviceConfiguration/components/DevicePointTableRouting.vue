<template>
  <div class="voltage-class point-table device-routing-table">
    <!-- 操作区：编辑时显示导入，否则显示导出 -->
    <div v-if="props.viewMode === 'routing'" class="table-action-controls">
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
      <template v-if="!props.isEditing">
        <el-button type="primary" @click="handleExport">Export</el-button>
      </template>
      <template v-else>
        <span v-if="importedFileName" class="imported-file-name">{{ importedFileName }}</span>
        <el-button type="primary" @mousedown="handleImportClick">Import</el-button>
      </template>
    </div>

    <input ref="fileInputRef" type="file" accept=".csv" style="display: none" @change="handleFileChange" />

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
        <el-table-column label="Point ID" width="120" class-name="point-id-column">
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

        <!-- Channel -->
        <el-table-column label="Channel" min-width="180">
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template v-if="props.isEditing">
                <div class="point-table-cell-content" :class="getFieldClass(row, 'routing_channel_id')">
                  <div class="inline-edit-container">
                    <el-select
                      v-model="row.routing.channel_id"
                      popper-class="inline-mapping-popper"
                      :fit-input-width="true"
                      placeholder="Select channel"
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
                  </div>
                </div>
              </template>
              <span v-else :class="getFieldClass(row, 'routing_channel_id')">{{
                row.routing?.channel_name ?? ''
              }}</span>
              <div v-if="props.isEditing && getRoutingFieldError(row, 'channel_id')" class="field-error">
                {{ getRoutingFieldError(row, 'channel_id') }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Channel Point Type -->
        <el-table-column label="Channel Point Type" min-width="180">
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template v-if="props.isEditing">
                <div class="point-table-cell-content" :class="getFieldClass(row, 'routing_channel_type')">
                  <div class="inline-edit-container">
                    <el-select
                      v-model="row.routing.channel_type"
                      popper-class="inline-mapping-popper"
                      :fit-input-width="true"
                      :disabled="!row.routing?.channel_id"
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
                  </div>
                </div>
              </template>
              <span v-else :class="getFieldClass(row, 'routing_channel_type')">{{
                getDeviceRoutingTypeLabel(row.routing?.channel_type)
              }}</span>
              <div v-if="props.isEditing && getRoutingFieldError(row, 'channel_type')" class="field-error">
                {{ getRoutingFieldError(row, 'channel_type') }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Channel Point -->
        <el-table-column label="Channel Point" min-width="220">
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template v-if="props.isEditing">
                <div class="point-table-cell-content" :class="getFieldClass(row, 'routing_channel_point_id')">
                  <div class="inline-edit-container">
                    <el-select
                      v-model="row.routing.channel_point_id"
                      popper-class="inline-mapping-popper"
                      :fit-input-width="true"
                      placeholder="Select point"
                      :disabled="!row.routing?.channel_id || !row.routing?.channel_type"
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
                  </div>
                </div>
              </template>
              <span v-else :class="getFieldClass(row, 'routing_channel_point_id')">{{
                row.routing?.channel_point_name ?? ''
              }}</span>
              <div v-if="props.isEditing && getRoutingFieldError(row, 'channel_point_id')" class="field-error">
                {{ getRoutingFieldError(row, 'channel_point_id') }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- Enabled -->
        <el-table-column label="Enabled" min-width="120">
          <template #default="{ row }">
            <div class="point-table-cell-wrapper">
              <template v-if="props.isEditing">
                <div class="point-table-cell-content" :class="getFieldClass(row, 'routing_enabled')">
                  <div class="inline-edit-container">
                    <el-select
                      v-model="row.routing.enabled"
                      popper-class="inline-mapping-popper"
                      :fit-input-width="true"
                      placeholder="Select"
                      @change="() => onRoutingFieldChange(row, 'enabled')"
                      clearable
                      filterable
                    >
                    <el-option label="true" :value="true" />
                    <el-option label="false" :value="false" />
                  </el-select>
                  </div>
                </div>
              </template>
              <span v-else :class="getFieldClass(row, 'routing_enabled')">{{
                row.routing?.enabled === true
                  ? 'true'
                  : row.routing?.enabled === false
                    ? 'false'
                    : ''
              }}</span>
              <div v-if="props.isEditing && getRoutingFieldError(row, 'enabled')" class="field-error">
                {{ getRoutingFieldError(row, 'enabled') }}
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
        layout="total, sizes, prev, pager, next"
        @size-change="() => (currentPage = 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, inject } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
  InstancePointRouting,
} from '@/types/deviceConfiguration'
import { InstanceNameKey } from '@/utils/key'
import { getPointsTables, getChannelsByIds } from '@/api/channelsManagement'
import type { PointInfoResponse, PointType } from '@/types/channelConfiguration'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { usePointTableBase } from '@/composables/usePointTableBase'
import { buildCsv } from '@/utils/csvSchema'
import { downloadCsv, getTimestampCompact } from '@/utils/csvExport'
import {
  getDeviceRoutingTypeLabel,
  getDeviceRoutingTypeOptions,
  parseDeviceRoutingTypeStrict,
  validateDeviceRoutingField,
  validateDeviceRoutingRow,
} from '@/validators/deviceRouting'
import {
  deviceRoutingExportSchema,
  parseDeviceRoutingCsv,
} from '@/schemas/deviceRouting'

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

const editPoints = ref<any[]>([])
const importedFileName = ref('')
const injectedInstanceName = inject(InstanceNameKey, ref(''))

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

// 通道与点位缓存（通道列表来自父组件）
const channelPointsCache = ref<Record<number, PointInfoResponse>>({})

onMounted(() => {})
onUnmounted(() => {})

watch(
  () => ({ points: props.points, isEditing: props.isEditing }),
  async (val) => {
    if (!Array.isArray(val.points)) return

    editPoints.value = val.points.map((item: any) => {
      const clone: any = {
        ...item,
        routing: item.routing
          ? { ...item.routing }
          : {
              channel_id: undefined,
              channel_point_id: undefined,
              channel_type: '',
              enabled: undefined,
              channel_name: '',
              channel_point_name: '',
            },
        rowStatus: 'normal',
        isEditing: false,
        isInvalid: false,
        modifiedFields: [],
        fieldErrors: {},
      }
      clone.rowKey = (item as any).rowKey || createRowKey()
      return clone
    })

    if (val.isEditing) {
      importedFileName.value = ''
      // 预加载已有 channel_id 的行的通道点位，以便 Channel Point 下拉可选
      editPoints.value.forEach((p: any) => {
        const chId = Number(p.routing?.channel_id || 0)
        if (chId > 0) ensureChannelPoints(chId)
      })
      editPoints.value.forEach((p: any) => {
        validateRoutingValidity(p)
        refreshRoutingFieldErrorsForRow(p)
      })
    }
  },
  { immediate: true, deep: true },
)

async function ensureChannelPoints(channelId: number) {
  if (!channelId) return
  try {
    const res = await getPointsTables(channelId, undefined, { skipGlobalLoading: true })
    if (res?.success && res.data) {
      channelPointsCache.value[channelId] = res.data as PointInfoResponse
    } else if (res && (res.telemetry || res.signal || res.control || res.adjustment)) {
      channelPointsCache.value[channelId] = res as unknown as PointInfoResponse
    }
    // 点位缓存到位后，重新计算该通道下所有行的存在性与错误状态，避免旧错误残留
    editPoints.value.forEach((row: any) => {
      if (Number(row?.routing?.channel_id || 0) !== Number(channelId)) return
      recomputeRoutingMeta(row)
      validateRoutingValidity(row)
      refreshRoutingFieldErrorsForRow(row)
    })
  } catch {}
}

function getPointId(item: any): number {
  if (props.category === 'measurement') return Number(item.measurement_id)
  if (props.category === 'action') return Number(item.action_id)
  if (props.category === 'property') return Number(item.property_id)
  return 0
}
function getPointTypeChar(): 'M' | 'A' | 'P' {
  if (props.category === 'measurement') return 'M'
  if (props.category === 'action') return 'A'
  return 'P'
}

const getChannelTypeOptions = () => getDeviceRoutingTypeOptions(props.category)

function getRowClass({ row }: { row?: any }) {
  const item = row || {}
  const classes = [`row-status-${item.rowStatus || 'normal'}`]
  if (props.isEditing && (item as any).isInvalid) classes.push('row-invalid')
  if (!props.isEditing) {
    return 'row-status-normal'
  }
  return classes.join(' ')
}
function getFieldClass(item: any, fieldName: string) {
  if (!props.isEditing) return ''
  const status = item.rowStatus
  if (status === 'modified' && item.modifiedFields?.includes(fieldName)) return 'field-modified'
  return ''
}

function recomputeRoutingMeta(item: any) {
  if (!item) return
  const chId = Number(item?.routing?.channel_id || 0)
  const tp = String(item?.routing?.channel_type || '').trim() as PointType
  const pointId = Number(item?.routing?.channel_point_id || 0)
  const cache = channelPointsCache.value[chId]
  const channelExists = chId > 0 ? props.channels?.some((c) => Number(c.id) === chId) ?? false : undefined

  const nextMeta: { channelExists?: boolean; pointExists?: boolean } = {}
  if (channelExists !== undefined) {
    nextMeta.channelExists = channelExists
  }

  // 仅在“通道存在 + 类型存在 + 点位ID存在 + 已拿到缓存”时判定 pointExists，避免过早报错
  if (channelExists && tp && pointId > 0 && cache) {
    let list: any[] = []
    if (tp === 'T') list = cache.telemetry || []
    else if (tp === 'S') list = cache.signal || []
    else if (tp === 'C') list = cache.control || []
    else if (tp === 'A') list = cache.adjustment || []
    nextMeta.pointExists = (list || []).some((p: any) => Number(p.point_id) === pointId)
  } else {
    nextMeta.pointExists = undefined
  }

  ;(item as any).__routingMeta = {
    ...(item as any).__routingMeta,
    ...nextMeta,
  }
}

function onSelectChannel(item: any) {
  const chId = Number(item.routing?.channel_id || 0)
  const ch = props.channels?.find((c) => Number(c.id) === chId)
  item.routing.channel_name = ch ? ch.name : ''
  item.routing.channel_type = ''
  item.routing.channel_point_id = undefined
  item.routing.channel_point_name = ''
  onRoutingFieldChange(item, 'channel_id')
  if (chId > 0) ensureChannelPoints(chId)
}
function getChannelPointOptions(item: any) {
  const chId = Number(item.routing?.channel_id || 0)
  const tp = String(item.routing?.channel_type || '') as PointType
  const cache = channelPointsCache.value[chId]
  if (!chId || !tp || !cache) return []
  let list: any[] = []
  if (tp === 'T') list = cache.telemetry || []
  else if (tp === 'S') list = cache.signal || []
  else if (tp === 'C') list = cache.control || []
  else if (tp === 'A') list = cache.adjustment || []
  return (list || []).map((p) => ({
    label: p.signal_name || `#${p.point_id}`,
    value: p.point_id,
  }))
}
function onSelectChannelPoint(item: any, val: string | number) {
  const chId = Number(item.routing?.channel_id || 0)
  const tp = String(item.routing?.channel_type || '') as PointType
  const cache = channelPointsCache.value[chId]
  if (!cache) {
    onRoutingFieldChange(item, 'channel_point_id')
    return
  }
  let list: any[] = []
  if (tp === 'T') list = cache.telemetry || []
  else if (tp === 'S') list = cache.signal || []
  else if (tp === 'C') list = cache.control || []
  else if (tp === 'A') list = cache.adjustment || []
  const found = (list || []).find((p) => Number(p.point_id) === Number(val))
  item.routing.channel_point_name = found ? found.signal_name : ''
  onRoutingFieldChange(item, 'channel_point_id')
}
function onChannelTypeChange(item: any) {
  item.routing.channel_point_id = undefined
  item.routing.channel_point_name = ''
  onRoutingFieldChange(item, 'channel_type')
}

function validateRoutingValidity(item: any): boolean {
  const meta = (item as any).__routingMeta as
    | { channelExists?: boolean; pointExists?: boolean }
    | undefined
  return validateDeviceRoutingRow(item, props.category, meta)
}

function getRoutingFieldError(item: any, field: string): string {
  return (item.fieldErrors && item.fieldErrors[field]) || ''
}
function setRoutingFieldError(item: any, field: string, message: string) {
  if (!item.fieldErrors) item.fieldErrors = {}
  if (message) item.fieldErrors[field] = message
  else delete item.fieldErrors[field]
}
function validateRoutingFieldOnly(item: any, field: string): string {
  const meta = (item as any).__routingMeta as
    | { channelExists?: boolean; pointExists?: boolean }
    | undefined
  return validateDeviceRoutingField(item, field, props.category, meta)
}
function refreshRoutingFieldErrorsForRow(item: any) {
  setRoutingFieldError(item, 'channel_id', validateRoutingFieldOnly(item, 'channel_id'))
  setRoutingFieldError(item, 'channel_type', validateRoutingFieldOnly(item, 'channel_type'))
  setRoutingFieldError(item, 'channel_point_id', validateRoutingFieldOnly(item, 'channel_point_id'))
  setRoutingFieldError(item, 'enabled', validateRoutingFieldOnly(item, 'enabled'))
}
function refreshRoutingFieldErrorsForList() {
  if (!Array.isArray(editPoints.value)) return
  editPoints.value.forEach((p: any) => refreshRoutingFieldErrorsForRow(p))
}
function onRoutingFieldChange(item: any, _field: string) {
  recomputeRoutingMeta(item)
  updateRoutingChangeStatus(item)
  validateRoutingValidity(item)
  refreshRoutingFieldErrorsForRow(item)
}
function updateRoutingChangeStatus(item: any) {
  const baseline = getOriginalBaselineByPointId(getPointId(item))
  const prev = {
    routing_channel_id: baseline?.routing?.channel_id,
    routing_channel_type: baseline?.routing?.channel_type,
    routing_channel_point_id: baseline?.routing?.channel_point_id,
    routing_enabled: baseline?.routing?.enabled,
  } as any
  const cur = item.routing || {}
  const changes: string[] = []
  const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
  const normStr = (v: any) => String(v || '')
  const normBool = (v: any) => (v === true ? 'true' : v === false ? 'false' : '')
  if (normInt(cur.channel_id) !== normInt(prev.routing_channel_id)) changes.push('routing_channel_id')
  if (normStr(cur.channel_type) !== normStr(prev.routing_channel_type)) changes.push('routing_channel_type')
  if (normInt(cur.channel_point_id) !== normInt(prev.routing_channel_point_id))
    changes.push('routing_channel_point_id')
  if (normBool(cur.enabled) !== normBool(prev.routing_enabled)) changes.push('routing_enabled')

  if (changes.length > 0) {
    item.rowStatus = 'modified'
    item.modifiedFields = changes
  } else {
    item.rowStatus = 'normal'
    item.modifiedFields = []
  }
}

function getOriginalBaselineByPointId(pid: number): any | undefined {
  if (!Array.isArray((props as any).originalPoints)) return undefined
  return (props as any).originalPoints.find((p: any) => {
    if (!p) return false
    if (props.category === 'measurement') return Number(p.measurement_id) === pid
    if (props.category === 'action') return Number(p.action_id) === pid
    if (props.category === 'property') return Number(p.property_id) === pid
    return false
  })
}

function resolveChannelNameById(id?: number) {
  if (!id) return ''
  const ch = props.channels?.find((c) => Number(c.id) === Number(id))
  return ch ? String(ch.name || '') : ''
}
function resolvePointName(channelId?: number, type?: string, pointId?: number) {
  const chId = Number(channelId || 0)
  const tp = String(type || '') as PointType
  const pid = Number(pointId || 0)
  const cache = channelPointsCache.value[chId]
  if (!chId || !tp || !pid || !cache) return ''
  let list: any[] = []
  if (tp === 'T') list = cache.telemetry || []
  else if (tp === 'S') list = cache.signal || []
  else if (tp === 'C') list = cache.control || []
  else if (tp === 'A') list = cache.adjustment || []
  const found = (list || []).find((p) => Number(p.point_id) === pid)
  return found ? String(found.signal_name || '') : ''
}
function fillRoutingNames(item: any) {
  if (!item || !item.routing) return
  const r = item.routing
  r.channel_name = resolveChannelNameById(r.channel_id) || r.channel_name || ''
  r.channel_point_name =
    resolvePointName(r.channel_id, r.channel_type, r.channel_point_id) || r.channel_point_name || ''
}

function getEditedData() {
  const updates: Array<{
    point_id: number
    point_type: 'M' | 'A'
    routing: InstancePointRouting
  }> = []
  editPoints.value.forEach((item: any) => {
    if (!item.routing) return
    fillRoutingNames(item)
    const changed = item.modifiedFields || []
    const consider =
      changed.includes('routing_channel_id') ||
      changed.includes('routing_channel_type') ||
      changed.includes('routing_channel_point_id') ||
      changed.includes('routing_enabled')
    const pt = getPointTypeChar()
    if (consider && (pt === 'M' || pt === 'A')) {
      const pid = getPointId(item)
      if (pid > 0) {
        updates.push({
          point_id: pid,
          point_type: pt,
          routing: {
            channel_id: Number(item.routing.channel_id),
            channel_type: String(item.routing.channel_type) as any,
            channel_point_id: Number(item.routing.channel_point_id),
            enabled: !!item.routing.enabled,
            channel_name: item.routing.channel_name,
            channel_point_name: item.routing.channel_point_name,
          },
        })
      }
    }
  })
  return updates
}

const handleRoutingCsvContent = async (content: string, file: File) => {
  if (!props.channels || props.channels.length === 0) {
    ElMessage.error('Channels not loaded. Please wait for channels to load before importing.')
    return
  }

  const { byId, invalidRows, error } = parseDeviceRoutingCsv(content)
  if (error) {
    ElMessage.error(error)
    return
  }

  importedFileName.value = file.name

  editPoints.value = await Promise.all(
    (editPoints.value as any[]).map(async (item: any) => {
      const pid = getPointId(item)
      const inc = byId[pid]

      if (!inc) {
        item.routing = {
          channel_id: undefined,
          channel_type: '',
          channel_point_id: undefined,
          enabled: undefined,
          channel_name: '',
          channel_point_name: '',
        }
        const baseline = getOriginalBaselineByPointId(pid)
        const prev = {
          routing_channel_id: baseline?.routing?.channel_id,
          routing_channel_type: baseline?.routing?.channel_type,
          routing_channel_point_id: baseline?.routing?.channel_point_id,
          routing_enabled: baseline?.routing?.enabled,
        } as any
        const cur = item.routing || {}
        const changes: string[] = []
        const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
        const normStr = (v: any) => String(v || '')
        const normBool = (v: any) => (v === true ? 'true' : v === false ? 'false' : '')
        if (normInt(cur.channel_id) !== normInt(prev.routing_channel_id))
          changes.push('routing_channel_id')
        if (normStr(cur.channel_type) !== normStr(prev.routing_channel_type))
          changes.push('routing_channel_type')
        if (normInt(cur.channel_point_id) !== normInt(prev.routing_channel_point_id))
          changes.push('routing_channel_point_id')
        if (normBool(cur.enabled) !== normBool(prev.routing_enabled))
          changes.push('routing_enabled')

        if (changes.length > 0) {
          item.rowStatus = 'modified'
          item.modifiedFields = Array.from(new Set([...(item.modifiedFields || []), ...changes]))
        } else {
          item.rowStatus = 'normal'
          item.modifiedFields = []
        }
        return item
      }

      let finalChannelPointId = inc.channel_point_id
      let finalChannelPointName = ''

      const chId = Number(inc.channel_id || 0)
      let channelExists = false
      if (chId > 0) {
        channelExists = props.channels?.some((ch) => Number(ch.id) === chId) ?? false
      }

      const channelTypeStr = String(inc.channel_type || '').trim()
      const allowedTypes = getChannelTypeOptions().map((o) => o.value)
      let finalChannelType = inc.channel_type as any
      let channelTypeError = ''

      if (channelTypeStr) {
        const allowedTypesLabels = getChannelTypeOptions()
          .map((o) => o.label)
          .join(' / ')

        const parsed = parseDeviceRoutingTypeStrict(channelTypeStr)
        if (!parsed.isValidLiteral || !parsed.abbr) {
          finalChannelType = channelTypeStr
          channelTypeError = `Must be ${allowedTypesLabels}`
          item.isInvalid = true
        } else {
          finalChannelType = parsed.abbr
          if (!allowedTypes.includes(parsed.abbr)) {
            channelTypeError = `Must be ${allowedTypesLabels}`
            item.isInvalid = true
          }
        }
      }

      if (!channelExists && chId > 0) {
        finalChannelPointName =
          finalChannelPointId !== undefined && finalChannelPointId !== null
            ? String(finalChannelPointId)
            : ''
        item.isInvalid = true
        item.routing = {
          channel_id: inc.channel_id,
          channel_type: finalChannelType,
          channel_point_id: finalChannelPointId,
          enabled: inc.enabled,
          channel_name: inc.channel_id ? String(inc.channel_id) : '',
          channel_point_name: finalChannelPointName,
        }
      } else {
        item.routing = {
          channel_id: inc.channel_id,
          channel_type: finalChannelType,
          channel_point_id: finalChannelPointId,
          enabled: inc.enabled,
          channel_name: '',
          channel_point_name: finalChannelPointName,
        }
      }

      ;(item as any).__routingMeta = {
        channelExists: channelExists ? true : chId > 0 ? false : undefined,
        pointExists: !channelExists && chId > 0 ? false : undefined,
        importedChannelId: inc.channel_id,
        importedChannelPointId: finalChannelPointId,
      }

      if (channelTypeError) {
        setRoutingFieldError(item, 'channel_type', channelTypeError)
        const pointIdNum = Number(finalChannelPointId || 0)
        if (channelExists && pointIdNum > 0) {
          ;(item as any).__routingMeta.pointExists = false
          item.isInvalid = true
        }
      }

      const baseline = getOriginalBaselineByPointId(pid)
      const prev = {
        routing_channel_id: baseline?.routing?.channel_id,
        routing_channel_type: baseline?.routing?.channel_type,
        routing_channel_point_id: baseline?.routing?.channel_point_id,
        routing_enabled: baseline?.routing?.enabled,
      } as any
      const cur = item.routing || {}
      const changes: string[] = []
      const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
      const normStr = (v: any) => String(v || '')
      const normBool = (v: any) => (v === true ? 'true' : v === false ? 'false' : '')
      if (normInt(cur.channel_id) !== normInt(prev.routing_channel_id))
        changes.push('routing_channel_id')
      if (normStr(cur.channel_type) !== normStr(prev.routing_channel_type))
        changes.push('routing_channel_type')
      if (normInt(cur.channel_point_id) !== normInt(prev.routing_channel_point_id))
        changes.push('routing_channel_point_id')
      if (normBool(cur.enabled) !== normBool(prev.routing_enabled)) changes.push('routing_enabled')

      if (changes.length > 0) {
        item.rowStatus = 'modified'
        item.modifiedFields = Array.from(new Set([...(item.modifiedFields || []), ...changes]))
      } else {
        item.rowStatus = 'normal'
        item.modifiedFields = []
      }
      return item
    }),
  )

  editPoints.value.forEach((p: any) => validateRoutingValidity(p))

  const channelIdsToFetch = new Set<number>()
  editPoints.value.forEach((item: any) => {
    const chId = Number(item.routing?.channel_id || 0)
    if (chId > 0) {
      const channelExists = props.channels?.some((ch) => Number(ch.id) === chId) ?? false
      if (channelExists) {
        channelIdsToFetch.add(chId)
      }
    }
  })

  if (channelIdsToFetch.size > 0) {
    try {
      const idsArray = Array.from(channelIdsToFetch)
      const res = await getChannelsByIds(idsArray, { skipGlobalLoading: true })
      const channelsList = Array.isArray(res?.data?.list) ? res.data.list : []

      const channelMap = new Map<number, any>()
      channelsList.forEach((ch: any) => {
        const chId = Number(ch?.id)
        if (Number.isFinite(chId) && chId > 0) {
          channelMap.set(chId, ch)
        }
      })

      editPoints.value.forEach((item: any) => {
        const chId = Number(item.routing?.channel_id || 0)
        const meta = (item as any).__routingMeta as
          | { channelExists?: boolean; pointExists?: boolean }
          | undefined

        if (chId <= 0) return

        const channelExistsInList =
          props.channels?.some((ch) => Number(ch.id) === chId) ?? false
        if (meta) meta.channelExists = channelExistsInList ? true : false

        const channelFromApi = channelMap.get(chId)
        if (channelFromApi) {
          item.routing.channel_name = channelFromApi.name || item.routing.channel_name || ''
        } else {
          const channelFromList = props.channels?.find((ch) => Number(ch.id) === chId)
          item.routing.channel_name = channelFromList?.name || item.routing.channel_name || String(chId)
        }

        const rawType = String(item.routing?.channel_type || '').trim()
        const pointId = Number(item.routing?.channel_point_id || 0)
        const points = channelFromApi?.points
        const hasPoints = points && typeof points === 'object'

        if (pointId > 0 && !item.routing.channel_point_name) {
          item.routing.channel_point_name = String(pointId)
        }

        const allowedOptions = getChannelTypeOptions()
        const allowed = allowedOptions.map((o) => o.value)
        const parsedType = parseDeviceRoutingTypeStrict(rawType)
        const channelTypeValid = !!parsedType.abbr && allowed.includes(parsedType.abbr)
        if (pointId > 0 && !channelTypeValid) {
          if (meta) {
            meta.pointExists = false
          } else {
            ;(item as any).__routingMeta = {
              ...(item as any).__routingMeta,
              pointExists: false,
            }
          }
          item.routing.channel_point_name = String(pointId)
          item.isInvalid = true
          return
        }

        if (!hasPoints || pointId <= 0) {
          if (meta && meta.channelExists === true) meta.pointExists = undefined
          return
        }

        if (!parsedType.abbr) return

        let list: any[] = []
        if (parsedType.abbr === 'T') list = points.telemetry || []
        else if (parsedType.abbr === 'S') list = points.signal || []
        else if (parsedType.abbr === 'C') list = points.control || []
        else if (parsedType.abbr === 'A') list = points.adjustment || []

        const found = (list || []).find((p: any) => Number(p.point_id) === pointId)
        if (found) {
          item.routing.channel_point_name = found.signal_name || String(pointId)
          if (meta) meta.pointExists = true
        } else {
          item.routing.channel_point_name = String(pointId)
          if (meta) meta.pointExists = false
          item.isInvalid = true
        }
      })
    } catch (error) {
      console.error('Failed to fetch channel information:', error)
    }
  }

  refreshRoutingFieldErrorsForList()

  if (invalidRows > 0) {
    ElMessage.warning(`CSV file has ${invalidRows} invalid row(s). Please check the format.`)
  }

  const invalidCount = editPoints.value.filter((p: any) => (p as any).isInvalid).length
  if (invalidCount === 0) {
    ElMessage.success('Imported routing successfully')
  } else {
    ElMessage.warning(
      `Imported routing, but ${invalidCount} point(s) have errors. Please check the rows marked in red.`,
    )
  }
}

const { fileInputRef, handleImportClick, handleFileChange } = useCsvImportExport({
  onParse: handleRoutingCsvContent,
  onError: (message, error) => {
    if (error) console.error(error)
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
  const rows = allPoints.map((item: any) => {
    const r = item.routing || {}
    return {
      point_id: getPointId(item),
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

// 检查是否有修改
const hasChanges = () => {
  if (!Array.isArray(editPoints.value)) return false
  return editPoints.value.some((p: any) => p && p.rowStatus === 'modified')
}

defineExpose({
  getEditedData,
  clearImportedFileName,
  clearSignalNameFilter: () => {
    signalNameFilter.value = ''
  },
  hasInvalid: () => {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some((p: any) => p && (p as any).isInvalid === true)
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
    // 新增/修改/删除：在 Point ID 单元格左侧显示 10px 状态条（与 PointTableMappings 一致）
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
    :deep(.point-table-cell-content) {
      flex: 1;
      // padding-bottom: 9px;
      // box-sizing: border-box;
      // .inline-edit-container :deep(.el-input__inner),
      // .inline-edit-container :deep(.el-select .el-input__inner) {
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
    .point-table__setting-btn,
    .point-table__publish-btn,
    .point-table__restore-btn {
      cursor: pointer;
      .point-table__restore-btn:hover {
        color: inherit;
      }
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
  }

  .inline-edit-container {
    width: 100%;
    position: relative;

    :deep(.el-input),
    :deep(.el-input-number),
    :deep(.el-select) {
      width: 100%;
    }
  }
  .inline-mapping-popper {
    z-index: 9999 !important;
  }

  // 字段状态颜色（保持原色用于区分）
  .field-modified {
    color: #409eff !important;
    :deep(.el-select .el-select__placeholder),
    :deep(.el-select .el-select__wrapper) {
      color: #409eff;
    }
    :deep(.el-select .el-select__wrapper) {
      box-shadow: 0 0 0 1px #409eff inset !important;
    }
  }
  .field-added {
    color: #67c23a !important;
    :deep(.el-select .el-select__placeholder),
    :deep(.el-select .el-select__wrapper) {
      color: #67c23a !important;
    }
    :deep(.el-select .el-select__wrapper) {
      box-shadow: 0 0 0 1px #67c23a inset !important;
    }
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
