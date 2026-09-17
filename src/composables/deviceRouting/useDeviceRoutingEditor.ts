import { ref, type Ref } from 'vue'
import type { InstancePointRouting } from '@/types/deviceConfiguration'
import type { PointInfoResponse, PointType } from '@/types/channelConfiguration'
import {
  getDeviceRoutingTypeOptions,
  validateDeviceRoutingField,
  validateDeviceRoutingRow,
} from '@/validators/deviceRouting'
import { getPointsTables } from '@/api/channelsManagement'
import type { DevicePointCategory } from '@/schemas/deviceTableColumns'

export interface DeviceRoutingEditState {
  channel_id?: number
  channel_point_id?: number
  channel_type?: string
  enabled?: boolean
  channel_name?: string
  channel_point_name?: string
}

export interface DeviceRoutingEditRow {
  name?: string
  measurement_id?: number
  action_id?: number
  property_id?: number
  rowKey?: string
  rowStatus?: string
  isInvalid?: boolean
  modifiedFields?: string[]
  fieldErrors?: Record<string, string>
  routing?: DeviceRoutingEditState
  __routingMeta?: {
    channelExists?: boolean
    pointExists?: boolean
    importedChannelId?: number
    importedChannelPointId?: number
  }
}

export interface UseDeviceRoutingEditorOptions {
  category: () => DevicePointCategory
  isEditing: () => boolean
  channels: () => Array<{ id: number; name: string }>
  originalPoints: () => Array<any> | undefined
  editPoints: Ref<DeviceRoutingEditRow[]>
}

let rowKeySeed = 1

export function createDeviceRoutingRowKey(): string {
  rowKeySeed += 1
  return `${Date.now()}-${rowKeySeed}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyDeviceRouting(): DeviceRoutingEditState {
  return {
    channel_id: undefined,
    channel_point_id: undefined,
    channel_type: '',
    enabled: undefined,
    channel_name: '',
    channel_point_name: '',
  }
}

export function cloneDeviceRoutingEditRow(item: any): DeviceRoutingEditRow {
  return {
    ...item,
    routing: item.routing ? { ...item.routing } : createEmptyDeviceRouting(),
    rowStatus: 'normal',
    isEditing: false,
    isInvalid: false,
    modifiedFields: [],
    fieldErrors: {},
    rowKey: item.rowKey || createDeviceRoutingRowKey(),
  }
}

function normInt(v: unknown) {
  return v === '' || v === null || v === undefined ? null : Number(v)
}

function normStr(v: unknown) {
  return String(v || '')
}

function normBool(v: unknown) {
  return v === true ? 'true' : v === false ? 'false' : ''
}

export function useDeviceRoutingEditor(options: UseDeviceRoutingEditorOptions) {
  const channelPointsCache = ref<Record<number, PointInfoResponse>>({})

  function getPointId(item: DeviceRoutingEditRow): number {
    if (options.category() === 'measurement') return Number(item.measurement_id)
    if (options.category() === 'action') return Number(item.action_id)
    if (options.category() === 'property') return Number(item.property_id)
    return 0
  }

  function getPointTypeChar(): 'M' | 'A' | 'P' {
    if (options.category() === 'measurement') return 'M'
    if (options.category() === 'action') return 'A'
    return 'P'
  }

  function getChannelTypeOptions() {
    return getDeviceRoutingTypeOptions(options.category())
  }

  function getOriginalBaselineByPointId(pid: number) {
    const list = options.originalPoints()
    if (!Array.isArray(list)) return undefined
    return list.find((p) => {
      if (!p) return false
      if (options.category() === 'measurement') return Number(p.measurement_id) === pid
      if (options.category() === 'action') return Number(p.action_id) === pid
      if (options.category() === 'property') return Number(p.property_id) === pid
      return false
    })
  }

  function getRoutingFieldError(item: DeviceRoutingEditRow, field: string) {
    return (item.fieldErrors && item.fieldErrors[field]) || ''
  }

  function setRoutingFieldError(item: DeviceRoutingEditRow, field: string, message: string) {
    if (!item.fieldErrors) item.fieldErrors = {}
    if (message) item.fieldErrors[field] = message
    else delete item.fieldErrors[field]
  }

  function validateRoutingFieldOnly(item: DeviceRoutingEditRow, field: string) {
    const meta = item.__routingMeta
    return validateDeviceRoutingField(item, field, options.category(), meta)
  }

  function validateRoutingValidity(item: DeviceRoutingEditRow) {
    return validateDeviceRoutingRow(item, options.category(), item.__routingMeta)
  }

  function refreshRoutingFieldErrorsForRow(item: DeviceRoutingEditRow) {
    setRoutingFieldError(item, 'channel_id', validateRoutingFieldOnly(item, 'channel_id'))
    setRoutingFieldError(item, 'channel_type', validateRoutingFieldOnly(item, 'channel_type'))
    setRoutingFieldError(item, 'channel_point_id', validateRoutingFieldOnly(item, 'channel_point_id'))
    setRoutingFieldError(item, 'enabled', validateRoutingFieldOnly(item, 'enabled'))
  }

  function refreshRoutingFieldErrorsForList() {
    options.editPoints.value.forEach((row) => refreshRoutingFieldErrorsForRow(row))
  }

  function getPointsListByType(cache: PointInfoResponse, tp: PointType) {
    if (tp === 'T') return cache.telemetry || []
    if (tp === 'S') return cache.signal || []
    if (tp === 'C') return cache.control || []
    if (tp === 'A') return cache.adjustment || []
    return []
  }

  function recomputeRoutingMeta(item: DeviceRoutingEditRow) {
    if (!item?.routing) return
    const chId = Number(item.routing.channel_id || 0)
    const tp = String(item.routing.channel_type || '').trim() as PointType
    const pointId = Number(item.routing.channel_point_id || 0)
    const cache = channelPointsCache.value[chId]
    const channelExists =
      chId > 0 ? options.channels()?.some((c) => Number(c.id) === chId) ?? false : undefined

    const nextMeta: DeviceRoutingEditRow['__routingMeta'] = {}
    if (channelExists !== undefined) {
      nextMeta.channelExists = channelExists
    }

    if (channelExists && tp && pointId > 0 && cache) {
      nextMeta.pointExists = getPointsListByType(cache, tp).some(
        (p) => Number(p.point_id) === pointId,
      )
    } else {
      nextMeta.pointExists = undefined
    }

    item.__routingMeta = {
      ...item.__routingMeta,
      ...nextMeta,
    }
  }

  async function ensureChannelPoints(channelId: number) {
    if (!channelId) return
    try {
      const res = await getPointsTables(channelId, undefined, { skipGlobalLoading: true })
      if (res?.success && res.data) {
        channelPointsCache.value[channelId] = res.data as PointInfoResponse
      } else if (res && (res.telemetry || res.signal || res.control || res.adjustment)) {
        channelPointsCache.value[channelId] = res as unknown as PointInfoResponse
      }
      options.editPoints.value.forEach((row) => {
        if (Number(row?.routing?.channel_id || 0) !== Number(channelId)) return
        recomputeRoutingMeta(row)
        validateRoutingValidity(row)
        refreshRoutingFieldErrorsForRow(row)
      })
    } catch {
      // ignore fetch errors; validation will surface missing cache
    }
  }

  function updateRoutingChangeStatus(item: DeviceRoutingEditRow) {
    const baseline = getOriginalBaselineByPointId(getPointId(item))
    const prev = {
      routing_channel_id: baseline?.routing?.channel_id,
      routing_channel_type: baseline?.routing?.channel_type,
      routing_channel_point_id: baseline?.routing?.channel_point_id,
      routing_enabled: baseline?.routing?.enabled,
    }
    const cur = item.routing ?? createEmptyDeviceRouting()
    const changes: string[] = []
    if (normInt(cur.channel_id) !== normInt(prev.routing_channel_id)) {
      changes.push('routing_channel_id')
    }
    if (normStr(cur.channel_type) !== normStr(prev.routing_channel_type)) {
      changes.push('routing_channel_type')
    }
    if (normInt(cur.channel_point_id) !== normInt(prev.routing_channel_point_id)) {
      changes.push('routing_channel_point_id')
    }
    if (normBool(cur.enabled) !== normBool(prev.routing_enabled)) {
      changes.push('routing_enabled')
    }

    if (changes.length > 0) {
      item.rowStatus = 'modified'
      item.modifiedFields = changes
    } else {
      item.rowStatus = 'normal'
      item.modifiedFields = []
    }
  }

  function applyRoutingChangeFromCurrent(item: DeviceRoutingEditRow) {
    updateRoutingChangeStatus(item)
  }

  function onRoutingFieldChange(item: DeviceRoutingEditRow, _field: string) {
    recomputeRoutingMeta(item)
    updateRoutingChangeStatus(item)
    validateRoutingValidity(item)
    refreshRoutingFieldErrorsForRow(item)
  }

  function onSelectChannel(item: DeviceRoutingEditRow) {
    const chId = Number(item.routing?.channel_id || 0)
    const ch = options.channels()?.find((c) => Number(c.id) === chId)
    if (!item.routing) item.routing = createEmptyDeviceRouting()
    item.routing.channel_name = ch ? ch.name : ''
    item.routing.channel_type = ''
    item.routing.channel_point_id = undefined
    item.routing.channel_point_name = ''
    onRoutingFieldChange(item, 'channel_id')
    if (chId > 0) void ensureChannelPoints(chId)
  }

  function getChannelPointOptions(item: DeviceRoutingEditRow) {
    const chId = Number(item.routing?.channel_id || 0)
    const tp = String(item.routing?.channel_type || '') as PointType
    const cache = channelPointsCache.value[chId]
    if (!chId || !tp || !cache) return []
    return getPointsListByType(cache, tp).map((p) => ({
      label: p.signal_name || `#${p.point_id}`,
      value: p.point_id,
    }))
  }

  function onSelectChannelPoint(item: DeviceRoutingEditRow, val: string | number) {
    const chId = Number(item.routing?.channel_id || 0)
    const tp = String(item.routing?.channel_type || '') as PointType
    const cache = channelPointsCache.value[chId]
    if (!item.routing) item.routing = createEmptyDeviceRouting()
    if (!cache) {
      onRoutingFieldChange(item, 'channel_point_id')
      return
    }
    const found = getPointsListByType(cache, tp).find((p) => Number(p.point_id) === Number(val))
    item.routing.channel_point_name = found ? found.signal_name : ''
    onRoutingFieldChange(item, 'channel_point_id')
  }

  function onChannelTypeChange(item: DeviceRoutingEditRow) {
    if (!item.routing) item.routing = createEmptyDeviceRouting()
    item.routing.channel_point_id = undefined
    item.routing.channel_point_name = ''
    onRoutingFieldChange(item, 'channel_type')
  }

  function resolveChannelNameById(id?: number) {
    if (!id) return ''
    const ch = options.channels()?.find((c) => Number(c.id) === Number(id))
    return ch ? String(ch.name || '') : ''
  }

  function resolvePointName(channelId?: number, type?: string, pointId?: number) {
    const chId = Number(channelId || 0)
    const tp = String(type || '') as PointType
    const pid = Number(pointId || 0)
    const cache = channelPointsCache.value[chId]
    if (!chId || !tp || !pid || !cache) return ''
    const found = getPointsListByType(cache, tp).find((p) => Number(p.point_id) === pid)
    return found ? String(found.signal_name || '') : ''
  }

  function fillRoutingNames(item: DeviceRoutingEditRow) {
    if (!item?.routing) return
    const r = item.routing
    r.channel_name = resolveChannelNameById(r.channel_id) || r.channel_name || ''
    r.channel_point_name =
      resolvePointName(r.channel_id, r.channel_type, r.channel_point_id) ||
      r.channel_point_name ||
      ''
  }

  function getRowClass({ row }: { row?: DeviceRoutingEditRow }) {
    const item = row || {}
    const classes = [`row-status-${item.rowStatus || 'normal'}`]
    if (options.isEditing() && item.isInvalid) classes.push('row-invalid')
    if (!options.isEditing()) return 'row-status-normal'
    return classes.join(' ')
  }

  function getFieldClass(item: DeviceRoutingEditRow, fieldName: string) {
    if (!options.isEditing()) return ''
    if (item.rowStatus === 'modified' && item.modifiedFields?.includes(fieldName)) {
      return 'field-modified'
    }
    return ''
  }

  function getEditedData() {
    const updates: Array<{
      point_id: number
      point_type: 'M' | 'A'
      routing: InstancePointRouting
    }> = []
    options.editPoints.value.forEach((item) => {
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
              channel_type: String(item.routing.channel_type) as InstancePointRouting['channel_type'],
              channel_point_id: Number(item.routing.channel_point_id),
              enabled: !!item.routing.enabled,
              channel_name: item.routing.channel_name || '',
              channel_point_name: item.routing.channel_point_name || '',
            },
          })
        }
      }
    })
    return updates
  }

  function hasChanges() {
    return options.editPoints.value.some((row) => row?.rowStatus === 'modified')
  }

  function preloadChannelPointsForRows() {
    options.editPoints.value.forEach((row) => {
      const chId = Number(row.routing?.channel_id || 0)
      if (chId > 0) void ensureChannelPoints(chId)
    })
    options.editPoints.value.forEach((row) => {
      validateRoutingValidity(row)
      refreshRoutingFieldErrorsForRow(row)
    })
  }

  return {
    channelPointsCache,
    getPointId,
    getPointTypeChar,
    getChannelTypeOptions,
    getOriginalBaselineByPointId,
    ensureChannelPoints,
    recomputeRoutingMeta,
    getRoutingFieldError,
    setRoutingFieldError,
    validateRoutingValidity,
    refreshRoutingFieldErrorsForRow,
    refreshRoutingFieldErrorsForList,
    onRoutingFieldChange,
    updateRoutingChangeStatus,
    applyRoutingChangeFromCurrent,
    onSelectChannel,
    getChannelPointOptions,
    onSelectChannelPoint,
    onChannelTypeChange,
    fillRoutingNames,
    getRowClass,
    getFieldClass,
    getEditedData,
    hasChanges,
    preloadChannelPointsForRows,
  }
}
