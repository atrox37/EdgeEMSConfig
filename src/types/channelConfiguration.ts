// 通道基础信息
export interface ChannelBasic {
  id?: number
  name: string
  description: string | null
  protocol: 'modbus_tcp' | 'can' | 'virt' | 'modbus_rtu'
  enabled: boolean
}
export interface ChannelListItem extends ChannelBasic {
  connected: boolean
  last_update: string
  error_count: number
  last_error: string | null
}
export interface modbusTcpParams {
  host: string
  port: number
  retry_count?: number
  timeout_ms?: number
}
export interface canParams {
  bitrate: number
  data_bitrate: number
  fd_mode: boolean
  interface: string
  listen_only: boolean
  loopback: boolean
  timeout_ms: number
}
export interface virtualParams {
  update_interval_ms: number
}
export interface modbusRtuParams {
  baud_rate: number
  data_bits: number
  device: string
  parity: string
  poll_interval_ms: number
  retry_count: number
  stop_bits: number
  timeout_ms: number
}
// 通道详情信息
export interface ChannelDetail extends ChannelBasic {
  parameters: {
    [key: string]: any
    parameters: modbusTcpParams | canParams | virtualParams | modbusRtuParams
  }
  runtime_status?: {
    connected: boolean
    running: boolean
    last_update: string
    error_count: number
    last_error: string | null
    statistics?: {
      [key: string]: any
    }
  }
  point_counts?: {
    telemetry: number
    signal: number
    control: number
    adjustment: number
  }
}
export interface updateChannelDetail extends ChannelBasic {
  parameters: {
    [key: string]: any
  }
}
export type PointType = 'T' | 'S' | 'C' | 'A'
// 点位信息
export interface PointInfo {
  point_id: number
  signal_name: string
  scale: number
  offset: number
  unit: string
  data_type: string
  reverse: boolean
  description: string
  has_mapping: boolean
}
export interface PointInfoResponse {
  telemetry: PointInfo[]
  signal: PointInfo[]
  control: PointInfo[]
  adjustment: PointInfo[]
}
// 点位配置参数
export interface modbusPointMapping {
  byte_order: string
  data_type: string
  function_code: number
  point_id?: string
  register_address: number
  slave_id: number
}
export interface virtualPointMapping {
  expression: string
}
export interface CanPointMapping {
  bit_length: number
  byte_order: string
  can_id: number | string
  data_type: string
  offset: number
  scale: number
  signed: boolean
  start_bit: number
}
export interface mappingResponse {
  point_id: number
  signal_name?: string
  protocol_data: modbusPointMapping | virtualPointMapping | CanPointMapping
}
export interface UpdateMappingPoint {
  four_remote: PointType
  point_id: number
  protocol_data: modbusPointMapping | virtualPointMapping | CanPointMapping
}
export interface BatchUpdateMappingPointRequest {
  mappings: UpdateMappingPoint[]
  mode: 'replace' | 'merge'
  reload_channel: boolean
  validate_only: boolean
}
// /mappings 接口返回结构：{ telemetry: mappingResponse[], signal: mappingResponse[], control: mappingResponse[], adjustment: mappingResponse[] }
export interface MappingCategoryResponse {
  telemetry: mappingResponse[]
  signal: mappingResponse[]
  control: mappingResponse[]
  adjustment: mappingResponse[]
}
// 筛选条件
export interface ChannelFilters {
  protocol: string
  enabled: boolean | null
  connected: boolean | null
}

// 协议选项
export const PROTOCOL_OPTIONS = [
  { label: 'Modbus TCP', value: 'modbus_tcp' },
  { label: 'Modbus RTU', value: 'modbus_rtu' },
  { label: 'CAN', value: 'can' },
  { label: 'Virt', value: 'virt' },
] as const

// 数据类型选项
export const DATA_TYPE_OPTIONS = [
  { label: 'float16', value: 'float16' },
  { label: 'float32', value: 'float32' },
  { label: 'float64', value: 'float64' },
  { label: 'int16', value: 'int16' },
  { label: 'int32', value: 'int32' },
  { label: 'uint16', value: 'uint16' },
  { label: 'uint32', value: 'uint32' },
  { label: 'bool', value: 'bool' },
] as const

// 字节序选项
export const BYTE_ORDER_OPTIONS = [
  { label: 'ABCD', value: 'ABCD' },
  { label: 'DCBA', value: 'DCBA' },
  { label: 'BADC', value: 'BADC' },
  { label: 'CDAB', value: 'CDAB' },
] as const

// 功能码选项
export const FUNCTION_CODE_OPTIONS = [
  { label: 'Read Coils (01)', value: 1 },
  { label: 'Read Discrete Inputs (02)', value: 2 },
  { label: 'Read Holding Registers (03)', value: 3 },
  { label: 'Read Input Registers (04)', value: 4 },
  { label: 'Write Single Coil (05)', value: 5 },
  { label: 'Write Single Register (06)', value: 6 },
  { label: 'Write Multiple Coils (15)', value: 15 },
  { label: 'Write Multiple Registers (16)', value: 16 },
] as const
