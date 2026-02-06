import type { CsvFieldDef } from '@/utils/csvSchema'

export type PointType = 'T' | 'S' | 'C' | 'A'
export type ChannelProtocol =
  | 'modbus_tcp'
  | 'modbus_rtu'
  | 'virt'
  | 'can'
  | 'di_do'
  | string

export interface PointCsvRow {
  point_id: string
  point_name: string
  value?: string
  scale?: string
  offset?: string
  unit?: string
  reverse?: string
}

export interface MappingCsvRow {
  point_id: string
  point_name?: string
  slave_id?: string
  function_code?: string
  register_address?: string
  data_type?: string
  byte_order?: string
  bit_position?: string
  gpio_number?: string
}

const POINT_BASE_FIELDS: CsvFieldDef<PointCsvRow>[] = [
  { key: 'point_id', header: 'point_id' },
  { key: 'point_name', header: 'point_name' },
  { key: 'value', header: 'value', required: false },
]

const POINT_TA_FIELDS: CsvFieldDef<PointCsvRow>[] = [
  { key: 'scale', header: 'scale' },
  { key: 'offset', header: 'offset' },
  { key: 'unit', header: 'unit' },
  { key: 'reverse', header: 'reverse' },
]

const POINT_SC_FIELDS: CsvFieldDef<PointCsvRow>[] = [{ key: 'reverse', header: 'reverse' }]

export function getPointCsvSchema(
  pointType: PointType,
  protocol: ChannelProtocol,
): CsvFieldDef<PointCsvRow>[] {
  const isSignalOrControl =
    pointType === 'S' || pointType === 'C' || protocol === 'di_do'
  return isSignalOrControl ? [...POINT_BASE_FIELDS, ...POINT_SC_FIELDS] : [...POINT_BASE_FIELDS, ...POINT_TA_FIELDS]
}

export function getMappingCsvSchema(
  protocol: ChannelProtocol,
): CsvFieldDef<MappingCsvRow>[] {
  if (protocol === 'di_do') {
    return [
      { key: 'point_id', header: 'point_id' },
      { key: 'point_name', header: 'point_name', required: false },
      { key: 'gpio_number', header: 'gpio_number' },
    ]
  }
  return [
    { key: 'point_id', header: 'point_id' },
    { key: 'point_name', header: 'point_name', required: false },
    { key: 'slave_id', header: 'slave_id' },
    { key: 'function_code', header: 'function_code' },
    { key: 'register_address', header: 'register_address' },
    { key: 'data_type', header: 'data_type' },
    { key: 'byte_order', header: 'byte_order' },
    { key: 'bit_position', header: 'bit_position' },
  ]
}
