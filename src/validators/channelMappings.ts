import type { PointInfo } from '@/types/channelConfiguration'
import { BYTE_ORDER_64_OPTIONS, BYTE_ORDER_OPTIONS } from '@/types/channelConfiguration'

export type PointType = 'T' | 'S' | 'C' | 'A'

export interface MappingValidationContext {
  pointType: PointType
  channelProtocol: string
}

export const DATA_TYPE_BY_POINT: Record<string, string[]> = {
  T: ['int16', 'uint16', 'int32', 'float32', 'uint32', 'int64', 'uint64', 'float64'],
  S: ['int16', 'uint16', 'int32', 'float32', 'uint32', 'int64', 'uint64', 'float64', 'bool'],
  C: ['int16', 'uint16', 'int32', 'float32', 'uint32', 'int64', 'uint64', 'float64', 'bool'],
  A: ['int16', 'uint16', 'int32', 'float32', 'uint32', 'int64', 'uint64', 'float64'],
}

export const FC_BY_POINT: Record<string, number[]> = {
  T: [3, 4],
  S: [1, 2, 3, 4],
  C: [5, 15, 6, 16],
  A: [6, 16],
}

export const normalizeType = (v: string | undefined): string =>
  String(v || '').toLowerCase()

export function getMappingByteOrderOptions(item: PointInfo) {
  const t = normalizeType(item.protocol_mapping?.data_type || '')
  if (t === 'bool' || t === 'boolean') return [{ label: 'AB', value: 'AB' }]
  if (t.includes('16'))
    return [
      { label: 'AB', value: 'AB' },
      { label: 'BA', value: 'BA' },
    ]
  if (t.includes('32'))
    return [{ label: 'AB', value: 'AB' }, { label: 'BA', value: 'BA' }, ...BYTE_ORDER_OPTIONS]
  if (t.includes('64'))
    return [
      { label: 'AB', value: 'AB' },
      { label: 'BA', value: 'BA' },
      ...BYTE_ORDER_OPTIONS,
      ...BYTE_ORDER_64_OPTIONS,
    ]
  return BYTE_ORDER_OPTIONS
}

export function canEditMappingBitPosition(item: PointInfo) {
  if (!item.protocol_mapping) return false
  const fc = Number(item.protocol_mapping.function_code)
  const dt = normalizeType(item.protocol_mapping.data_type)
  const isBoolFC = (fc === 3 || fc === 4) && (dt === 'bool' || dt === 'boolean')
  const is16 = dt.includes('16')
  return isBoolFC || is16
}

export function validateMappingField(
  item: any,
  field: string,
  ctx: MappingValidationContext,
): string {
  if (ctx.channelProtocol === 'di_do' && field !== 'gpio_number') return ''
  const m = item.protocol_mapping || {}

  const hasSlaveId = !(m.slave_id === undefined || m.slave_id === null || m.slave_id === '')
  const hasFunctionCode = !(
    m.function_code === undefined ||
    m.function_code === null ||
    m.function_code === ''
  )
  const hasRegisterAddress = !(m.register_address === undefined || m.register_address === null)
  const hasDataType = !(m.data_type === undefined || m.data_type === null || m.data_type === '')
  const hasByteOrder = !(m.byte_order === undefined || m.byte_order === null || m.byte_order === '')

  const filledFieldsCount = [
    hasSlaveId,
    hasFunctionCode,
    hasRegisterAddress,
    hasDataType,
    hasByteOrder,
  ].filter(Boolean).length

  const isPartialFill = filledFieldsCount > 0 && filledFieldsCount < 5

  switch (field) {
    case 'gpio_number': {
      if (m.gpio_number === undefined || m.gpio_number === null || m.gpio_number === '') return ''
      const gpio = Number(m.gpio_number)
      if (isNaN(gpio) || !Number.isInteger(gpio) || gpio <= 0) return 'must positive integer'
      return ''
    }
    case 'slave_id': {
      if (isPartialFill && !hasSlaveId) return 'required'
      if (m.slave_id === undefined || m.slave_id === null || m.slave_id === '') return ''
      const sid = Number(m.slave_id)
      if (!Number.isInteger(sid) || sid < 1 || sid > 247) return 'must be 1-247'
      return ''
    }
    case 'function_code': {
      if (isPartialFill && !hasFunctionCode) return 'required'
      if (m.function_code === undefined || m.function_code === null || m.function_code === '')
        return ''
      const allowedFC = FC_BY_POINT[ctx.pointType] || []
      const fc = Number(m.function_code)
      if (!allowedFC.includes(fc)) return 'not allowed'
      return ''
    }
    case 'register_address': {
      if (isPartialFill && !hasRegisterAddress) return 'required'
      if (m.register_address == null || m.register_address === '') return ''
      const ra = Number(m.register_address)
      if (!Number.isInteger(ra) || ra < 0 || ra > 65535) return ' must be 0-65535'
      return ''
    }
    case 'data_type': {
      if (isPartialFill && !hasDataType) return 'required'
      if (m.data_type === undefined || m.data_type === null || m.data_type === '') return ''
      const dt = normalizeType(m.data_type || '')
      const allowDT = DATA_TYPE_BY_POINT[ctx.pointType] || []
      if (!allowDT.includes(dt)) return 'not allowed '
      return ''
    }
    case 'byte_order': {
      if (isPartialFill && !hasByteOrder) return 'required'
      if (m.byte_order === undefined || m.byte_order === null || m.byte_order === '') return ''
      {
        const dt = normalizeType(m.data_type || '')
        if (dt === 'bool' || dt === 'boolean') return ''
      }
      const allowed = getMappingByteOrderOptions(item).map((o: any) =>
        String(o.value).toUpperCase(),
      )
      const cur = String(m.byte_order || '').toUpperCase()
      if (!allowed.includes(cur)) return 'not allowed'
      return ''
    }
    case 'bit_position': {
      const rawBp = m.bit_position
      if (rawBp === undefined || rawBp === null || rawBp === '') return ''
      const n = Number(rawBp)
      if (!Number.isInteger(n) || n < 0 || n > 15) return 'must be 0-15 when provided'
      return ''
    }
    default:
      return ''
  }
}

export function validateMappingRow(point: PointInfo, ctx: MappingValidationContext): boolean {
  if ((point as any).rowStatus === 'deleted') {
    ;(point as any).isInvalid = false
    return true
  }
  const m = point.protocol_mapping as any
  if (ctx.channelProtocol === 'di_do') {
    const gpio = m?.gpio_number
    const hasValue = !(gpio === undefined || gpio === null || gpio === '')
    if (hasValue) {
      const gpioNum = Number(gpio)
      if (isNaN(gpioNum) || !Number.isInteger(gpioNum) || gpioNum <= 0) {
        ;(point as any).isInvalid = true
        return false
      }
    }
    ;(point as any).isInvalid = false
    return true
  }
  if (!m) {
    ;(point as any).isInvalid = false
    return true
  }

  const hasSlaveId = !(m.slave_id === undefined || m.slave_id === null || m.slave_id === '')
  const hasFunctionCode = !(
    m.function_code === undefined ||
    m.function_code === null ||
    m.function_code === ''
  )
  const hasRegisterAddress = !(m.register_address === undefined || m.register_address === null)
  const hasDataType = !(m.data_type === undefined || m.data_type === null || m.data_type === '')
  const hasByteOrder = !(m.byte_order === undefined || m.byte_order === null || m.byte_order === '')

  const filledFieldsCount = [
    hasSlaveId,
    hasFunctionCode,
    hasRegisterAddress,
    hasDataType,
    hasByteOrder,
  ].filter(Boolean).length
  const isPartialFill = filledFieldsCount > 0 && filledFieldsCount < 5
  if (isPartialFill) {
    ;(point as any).isInvalid = true
    return false
  }

  const slaveId = Number(m.slave_id)
  if (!Number.isInteger(slaveId) || slaveId < 1 || slaveId > 247) {
    ;(point as any).isInvalid = true
    return false
  }

  const dt = normalizeType(m.data_type || '')
  const allowDT = DATA_TYPE_BY_POINT[ctx.pointType] || []
  if (!allowDT.includes(dt)) {
    ;(point as any).isInvalid = true
    return false
  }

  const allowedByPoint = FC_BY_POINT[ctx.pointType] || []
  const base = dt === 'bool' || dt === 'boolean' ? [1, 2, 5, 15] : [3, 4, 6, 16]
  const allowedFC = base.filter((c) => allowedByPoint.includes(c))
  const fc = Number(m.function_code)
  if (!allowedFC.includes(fc)) {
    ;(point as any).isInvalid = true
    return false
  }

  const ra = Number(m.register_address)
  if (!Number.isInteger(ra) || ra < 0 || ra > 65535) {
    ;(point as any).isInvalid = true
    return false
  }

  const allowedOrders = getMappingByteOrderOptions(point).map((o: any) =>
    String(o.value).toUpperCase(),
  )
  const cur = String(m.byte_order || '').toUpperCase()
  if (!allowedOrders.includes(cur)) {
    ;(point as any).isInvalid = true
    return false
  }

  const canEdit = canEditMappingBitPosition(point)
  const bp = Number(m.bit_position)
  if (canEdit) {
    if (!Number.isInteger(bp) || bp < 0 || bp > 15) {
      ;(point as any).isInvalid = true
      return false
    }
  } else {
    if (bp !== 0 && m.bit_position !== undefined && m.bit_position !== null && m.bit_position !== '') {
      ;(point as any).isInvalid = true
      return false
    }
  }

  ;(point as any).isInvalid = false
  return true
}
