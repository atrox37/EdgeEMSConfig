import { parseCsvRows, type CsvFieldDef } from '@/utils/csvSchema'

export interface DeviceRoutingImportRow {
  point_id: number
  channel_id: string | number
  channel_point_type: string
  channel_point_id: string | number
  enabled: string
}

export interface DeviceRoutingExportRow {
  point_id: number
  point_name: string
  channel_id: string | number
  channel_name: string
  channel_point_type: string
  channel_point_id: string | number
  channel_point_name: string
  enabled: string
}

export interface DeviceRoutingCsvParseResult {
  byId: Record<
    number,
    {
      channel_id?: number
      channel_type: string
      channel_point_id?: number
      enabled: boolean
      isInvalid?: boolean
      reason?: string
    }
  >
  invalidRows: number
  error?: string
}

export const deviceRoutingImportSchema: CsvFieldDef<DeviceRoutingImportRow>[] = [
  { key: 'point_id', header: 'point_id' },
  { key: 'channel_id', header: 'channel_id' },
  { key: 'channel_point_type', header: 'channel_point_type' },
  { key: 'channel_point_id', header: 'channel_point_id' },
  { key: 'enabled', header: 'enabled' },
]

export const deviceRoutingExportSchema: CsvFieldDef<DeviceRoutingExportRow>[] = [
  { key: 'point_id', header: 'point_id' },
  { key: 'point_name', header: 'point_name' },
  { key: 'channel_id', header: 'channel_id' },
  { key: 'channel_name', header: 'channel_name' },
  { key: 'channel_point_type', header: 'channel_point_type' },
  { key: 'channel_point_id', header: 'channel_point_id' },
  { key: 'channel_point_name', header: 'channel_point_name' },
  { key: 'enabled', header: 'enabled' },
]

export function parseDeviceRoutingCsv(content: string): DeviceRoutingCsvParseResult {
  const { rows, error } = parseCsvRows(deviceRoutingImportSchema, content)
  if (error) {
    return { byId: {}, invalidRows: 0, error }
  }
  if (!rows || rows.length === 0) {
    return { byId: {}, invalidRows: 0, error: 'CSV file is empty' }
  }

  const byId: DeviceRoutingCsvParseResult['byId'] = {}
  let invalidRows = 0
  rows.forEach((row) => {
    const pid = Number((row as any).point_id) || 0
    let channel_id = (row as any).channel_id ? Number((row as any).channel_id) : undefined
    const channel_type = String((row as any).channel_point_type || '')
    const channel_point_id = (row as any).channel_point_id
      ? Number((row as any).channel_point_id)
      : undefined
    const enabled = String((row as any).enabled).toLowerCase() === 'true'

    let isInvalid = false
    let reason = ''

    if (!Number.isInteger(pid) || pid <= 0) {
      isInvalid = true
      reason = 'invalid point_id'
    }
    if (!isInvalid && channel_id !== undefined && (!Number.isInteger(channel_id) || channel_id <= 0)) {
      isInvalid = true
      reason = 'invalid channel_id'
    }

    byId[pid] = {
      channel_id,
      channel_type,
      channel_point_id,
      enabled,
      isInvalid,
      reason,
    }
    if (isInvalid) invalidRows += 1
  })

  return { byId, invalidRows }
}
