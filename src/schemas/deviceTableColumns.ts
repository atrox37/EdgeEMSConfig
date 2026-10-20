import { formatRealtimePointValue } from '@/utils/pointRealtime'
import { formatUpdateTime } from '@/utils/csvExport'
import { POINT_TABLE_CELL, POINT_TABLE_COL, POINT_TABLE_POPPER } from '@/constants/pointTable'
import { getDeviceRoutingTypeLabel } from '@/validators/deviceRouting'

export type DevicePointCategory = 'measurement' | 'action' | 'property'

export interface DevicePointRow {
  name?: string
  value?: number | string | null
  unit?: string
  description?: string
  update_ts?: number
  measurement_id?: number
  action_id?: number
  property_id?: number
}

export interface DevicePointColumnContext {
  category: DevicePointCategory
  getPointId: (row: DevicePointRow) => number
}

export interface DevicePointColumn {
  key: string
  label: string
  minWidth?: number
  width?: number
  className?: string
  valueClassName?: string
  display: (row: DevicePointRow, ctx: DevicePointColumnContext) => string
}

export function getDevicePointColumns(ctx: DevicePointColumnContext): DevicePointColumn[] {
  const columns: DevicePointColumn[] = [
    {
      key: 'point_id',
      label: 'Point ID',
      width: 120,
      className: POINT_TABLE_COL.pointId,
      display: (row, columnCtx) => String(columnCtx.getPointId(row)),
    },
    {
      key: 'point_name',
      label: 'Point Name',
      minWidth: 220,
      className: POINT_TABLE_COL.signalName,
      display: (row) => String(row.name || ''),
    },
    {
      key: 'value',
      label: 'Value',
      minWidth: 120,
      className: POINT_TABLE_COL.value,
      valueClassName: POINT_TABLE_CELL.value,
      display: (row) => ctx.category === 'property'
        ? String(row.value ?? '--')
        : formatRealtimePointValue(row.value, row.update_ts),
    },
  ]

  if (ctx.category !== 'property') {
    columns.push({
      key: 'update_time',
      label: 'Update Time',
      minWidth: 160,
      className: POINT_TABLE_COL.updateTime,
      display: (row) => formatUpdateTime(row.update_ts),
    })
  }

  columns.push(
    {
      key: 'unit',
      label: 'Unit',
      minWidth: 120,
      className: POINT_TABLE_COL.unit,
      display: (row) => String(row.unit || ''),
    },
    {
      key: 'description',
      label: 'Description',
      minWidth: 220,
      className: POINT_TABLE_COL.description,
      display: (row) => String(row.description || ''),
    },
  )

  return columns
}

export type DeviceRoutingEditor =
  | 'readonly'
  | 'channel'
  | 'channel-type'
  | 'channel-point'
  | 'enabled'

export interface DeviceRoutingRow {
  name?: string
  routing?: {
    channel_id?: number
    channel_name?: string
    channel_type?: string
    channel_point_id?: number
    channel_point_name?: string
    enabled?: boolean
  }
  measurement_id?: number
  action_id?: number
  property_id?: number
}

export interface DeviceRoutingColumnContext {
  category: DevicePointCategory
  getPointId: (row: DeviceRoutingRow) => number
}

export interface DeviceRoutingColumn {
  key: string
  label: string
  minWidth: number
  className?: string
  editor: DeviceRoutingEditor
  fieldClassKey: string
  errorKey: string
  placeholder?: string
  popperClass?: string
  display: (row: DeviceRoutingRow, ctx: DeviceRoutingColumnContext) => string
  disabled?: (row: DeviceRoutingRow) => boolean
}

export function getDeviceRoutingColumns(ctx: DeviceRoutingColumnContext): DeviceRoutingColumn[] {
  void ctx
  return [
    {
      key: 'point_id',
      label: 'Point ID',
      minWidth: 120,
      className: POINT_TABLE_COL.pointId,
      editor: 'readonly',
      fieldClassKey: 'point_id',
      errorKey: 'point_id',
      display: (row, columnCtx) => String(columnCtx.getPointId(row)),
    },
    {
      key: 'point_name',
      label: 'Point Name',
      minWidth: 220,
      className: POINT_TABLE_COL.signalName,
      editor: 'readonly',
      fieldClassKey: 'point_name',
      errorKey: 'point_name',
      display: (row) => String(row.name || ''),
    },
    {
      key: 'channel',
      label: 'Channel',
      minWidth: 180,
      className: POINT_TABLE_COL.channel,
      editor: 'channel',
      fieldClassKey: 'routing_channel_id',
      errorKey: 'channel_id',
      placeholder: 'Select channel',
      popperClass: POINT_TABLE_POPPER.mapping,
      display: (row) => String(row.routing?.channel_name ?? ''),
    },
    {
      key: 'channel_type',
      label: 'Channel Point Type',
      minWidth: 180,
      className: POINT_TABLE_COL.channelType,
      editor: 'channel-type',
      fieldClassKey: 'routing_channel_type',
      errorKey: 'channel_type',
      popperClass: POINT_TABLE_POPPER.mapping,
      display: (row) => getDeviceRoutingTypeLabel(row.routing?.channel_type),
      disabled: (row) => !row.routing?.channel_id,
    },
    {
      key: 'channel_point',
      label: 'Channel Point',
      minWidth: 220,
      className: POINT_TABLE_COL.channelPoint,
      editor: 'channel-point',
      fieldClassKey: 'routing_channel_point_id',
      errorKey: 'channel_point_id',
      placeholder: 'Select point',
      popperClass: POINT_TABLE_POPPER.mapping,
      display: (row) => String(row.routing?.channel_point_name ?? ''),
      disabled: (row) => !row.routing?.channel_id || !row.routing?.channel_type,
    },
    {
      key: 'enabled',
      label: 'Enabled',
      minWidth: 120,
      className: POINT_TABLE_COL.enabled,
      editor: 'enabled',
      fieldClassKey: 'routing_enabled',
      errorKey: 'enabled',
      placeholder: 'Select',
      popperClass: POINT_TABLE_POPPER.mapping,
      display: (row) => {
        if (row.routing?.enabled === true) return 'true'
        if (row.routing?.enabled === false) return 'false'
        return ''
      },
    },
  ]
}
