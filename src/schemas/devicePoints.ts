import { parseCsvRows, type CsvFieldDef } from '@/utils/csvSchema'

export interface DevicePointCsvRow {
  point_id: number
  point_name: string
  value?: string | number
  unit?: string
  description?: string
}

export interface DevicePointCsvParseResult {
  byId: Record<
    number,
    {
      name?: string
      value?: number
      unit?: string
      description?: string
    }
  >
  invalidRows: number
  error?: string
}

export const devicePointCsvSchema: CsvFieldDef<DevicePointCsvRow>[] = [
  { key: 'point_id', header: 'point_id' },
  { key: 'point_name', header: 'point_name' },
  { key: 'value', header: 'value', required: false },
  { key: 'unit', header: 'unit', required: false },
  { key: 'description', header: 'description', required: false },
]

export function parseDevicePointCsv(content: string): DevicePointCsvParseResult {
  const { rows, error } = parseCsvRows(devicePointCsvSchema, content)
  if (error) {
    return { byId: {}, invalidRows: 0, error }
  }
  if (!rows || rows.length === 0) {
    return { byId: {}, invalidRows: 0, error: 'CSV file is empty' }
  }

  const byId: DevicePointCsvParseResult['byId'] = {}
  let invalidRows = 0
  rows.forEach((row) => {
    const pid = Number((row as any).point_id)
    if (!Number.isInteger(pid) || pid <= 0) {
      invalidRows += 1
      return
    }
    const vRaw = (row as any).value
    const vNum = vRaw === '' || vRaw === undefined ? undefined : Number(vRaw)
    byId[pid] = {
      name: String((row as any).point_name || '') || undefined,
      value: vNum !== undefined && Number.isFinite(vNum) ? vNum : undefined,
      unit: String((row as any).unit || '') || undefined,
      description: String((row as any).description || '') || undefined,
    }
  })

  return { byId, invalidRows }
}
