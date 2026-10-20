import type { Ref } from 'vue'
import type { PointInfo, UpdateMappingPoint } from '@/types/channelConfiguration'
import {
  DATA_TYPE_OPTIONS,
  CAN_DATA_TYPE_BY_POINT,
} from '@/types/channelConfiguration'
import {
  DATA_TYPE_BY_POINT,
  getMappingByteOrderOptions,
  validateMappingRow,
} from '@/validators/channelMappings'

export type ChannelProtocol = 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do' | 'iec61850'
export type PointTabType = 'T' | 'S' | 'C' | 'A'

interface MappingRowEditingApi {
  updateMappingChangeStatus: (item: PointInfo) => void
  resetBitPositionIfNeeded: (item: PointInfo) => void
  adjustByteOrderForNewType: (item: PointInfo) => void
}

interface MappingFieldErrorsApi {
  refreshFieldErrorsForRow: (item: PointInfo) => void
}

export interface UseMappingEditorOptions {
  pointType: () => PointTabType
  channelProtocol: () => ChannelProtocol
  editPoints: Ref<PointInfo[]>
  mappingRow: MappingRowEditingApi
  fieldErrors: MappingFieldErrorsApi
}

export function cloneMappingPointForEdit(item: PointInfo): PointInfo {
  const cp: Record<string, unknown> = {
    ...item,
    rowStatus: item.rowStatus || 'normal',
  }
  if (item.protocol_mapping && typeof item.protocol_mapping === 'object') {
    cp.protocol_mapping = JSON.parse(JSON.stringify(item.protocol_mapping))
  }
  delete cp.modifiedFields
  delete cp.isEditing
  delete cp.fieldErrors
  delete cp.originalData
  return cp as unknown as PointInfo
}

export function useMappingEditor(options: UseMappingEditorOptions) {
  function validateMappingValidity(point: PointInfo): boolean {
    return validateMappingRow(point, {
      pointType: options.pointType(),
      channelProtocol: options.channelProtocol(),
    })
  }

  function ensureProtocolMappingForEdit(point: PointInfo) {
    if (point.protocol_mapping) return
    if (options.channelProtocol() === 'can') {
      ;(point as { protocol_mapping: Record<string, unknown> }).protocol_mapping = {
        can_id: undefined,
        byte_offset: undefined,
        bit_position: undefined,
        bit_length: undefined,
        data_type: undefined,
      }
    } else if (options.channelProtocol() === 'iec61850') {
      ;(point as { protocol_mapping: Record<string, unknown> }).protocol_mapping = {
        address: undefined,
        ctrl_model: undefined,
      }
    } else if (options.channelProtocol() === 'di_do') {
      ;(point as { protocol_mapping: Record<string, unknown> }).protocol_mapping = {}
    } else {
      point.protocol_mapping = {
        slave_id: undefined,
        function_code: undefined,
        register_address: undefined,
        data_type: undefined,
        byte_order: undefined,
        bit_position: undefined,
      }
    }
  }

  function afterMappingFieldMutation(item: PointInfo) {
    options.mappingRow.updateMappingChangeStatus(item)
    validateMappingValidity(item)
    options.fieldErrors.refreshFieldErrorsForRow(item)
  }

  function onMappingFieldChange(item: PointInfo, _field: string) {
    afterMappingFieldMutation(item)
  }

  function onFunctionCodeChange(item: PointInfo) {
    options.mappingRow.resetBitPositionIfNeeded(item)
    afterMappingFieldMutation(item)
  }

  function onMappingDataTypeChange(item: PointInfo) {
    options.mappingRow.resetBitPositionIfNeeded(item)
    options.mappingRow.adjustByteOrderForNewType(item)
    afterMappingFieldMutation(item)
  }

  const getMappingRegisterAddressStr = (item: PointInfo) => {
    const value = item.protocol_mapping?.register_address
    return value == null ? '' : String(value)
  }

  function onMappingRegisterAddressInput(item: PointInfo, str: string) {
    if (!item.protocol_mapping) return
    const trimmed = (str || '').trim()
    if (trimmed === '') {
      item.protocol_mapping.register_address = undefined
    } else {
      const digits = trimmed.replace(/\D+/g, '').slice(0, 5)
      if (digits === '') {
        item.protocol_mapping.register_address = undefined
      } else {
        const num = Number(digits)
        item.protocol_mapping.register_address = Math.min(65535, Math.max(0, num))
      }
    }
    afterMappingFieldMutation(item)
  }

  const getMappingFunctionCodeLabel = (fc: number | undefined) =>
    fc == null ? '' : String(fc)

  const getMappingDataTypeOptions = () => {
    if (options.channelProtocol() === 'can') {
      const allow = CAN_DATA_TYPE_BY_POINT[options.pointType()] || []
      return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
    }
    const allow = DATA_TYPE_BY_POINT[options.pointType()] || []
    return DATA_TYPE_OPTIONS.filter((opt) => allow.includes(String(opt.value)))
  }

  const getMappingByteOrderOptionsSafe = (row: PointInfo) =>
    Array.from(getMappingByteOrderOptions(row)) as Array<{
      label: string
      value: string
    }>

  const getSelectPlaceholder = (_row: PointInfo, col: { key?: string; placeholder?: string }) => {
    const key = String(col?.key || '')
    if (key === 'function_code') return 'Select code'
    if (key === 'data_type') return 'Select type'
    if (key === 'byte_order') return 'Select order'
    return col.placeholder || 'Select'
  }

  function getEditedData(): UpdateMappingPoint[] {
    const updates: UpdateMappingPoint[] = []
    const normIntOrNull = (v: unknown) =>
      v === '' || v === null || v === undefined ? null : Number(v)
    const normStrOrNull = (v: unknown) =>
      v === '' || v === null || v === undefined ? null : String(v)

    options.editPoints.value.forEach((item) => {
      if (!item.protocol_mapping || !item.modifiedFields || item.modifiedFields.length === 0) {
        return
      }
      const changed = item.modifiedFields.filter((field) => field.startsWith('mapping_'))
      if (changed.length === 0) return

      const data: Record<string, unknown> = {}
      const protocol = options.channelProtocol()

      if (protocol === 'can') {
        const mapping = item.protocol_mapping as Record<string, unknown>
        if (changed.includes('mapping_can_id')) data.can_id = normStrOrNull(mapping.can_id)
        if (changed.includes('mapping_can_offset'))
          data.byte_offset = normIntOrNull(mapping.byte_offset)
        if (changed.includes('mapping_can_bit_position'))
          data.bit_position = normIntOrNull(mapping.bit_position)
        if (changed.includes('mapping_can_bit_length'))
          data.bit_length = normIntOrNull(mapping.bit_length)
        if (changed.includes('mapping_can_data_type'))
          data.data_type = normStrOrNull(mapping.data_type)
      } else if (protocol === 'iec61850') {
        const mapping = item.protocol_mapping as Record<string, unknown>
        const addressChanged = changed.includes('mapping_iec61850_address')
        const modelChanged = changed.includes('mapping_ctrl_model')
        if (addressChanged || modelChanged) {
          data.address = normStrOrNull(mapping.address)
          if (options.pointType() === 'C' || options.pointType() === 'A') {
            data.ctrl_model = normIntOrNull(mapping.ctrl_model)
          }
        }
      } else if (protocol === 'di_do') {
        if (changed.includes('mapping_gpio_number')) {
          data.gpio_number = normIntOrNull(
            (item.protocol_mapping as Record<string, unknown>).gpio_number,
          )
        }
      } else if (item.protocol_mapping) {
        if (changed.includes('mapping_slave_id'))
          data.slave_id = normIntOrNull(item.protocol_mapping.slave_id)
        if (changed.includes('mapping_function_code'))
          data.function_code = normIntOrNull(item.protocol_mapping.function_code)
        if (changed.includes('mapping_register_address'))
          data.register_address = normIntOrNull(item.protocol_mapping.register_address)
        if (changed.includes('mapping_data_type'))
          data.data_type = normStrOrNull(item.protocol_mapping.data_type)
        if (changed.includes('mapping_byte_order'))
          data.byte_order = normStrOrNull(item.protocol_mapping.byte_order)
        if (changed.includes('mapping_bit_position'))
          data.bit_position = normIntOrNull(item.protocol_mapping.bit_position)
      }

      if (Object.keys(data).length > 0 && item.point_id > 0) {
        updates.push({
          four_remote: options.pointType(),
          point_id: item.point_id,
          protocol_data: data as unknown as UpdateMappingPoint['protocol_data'],
        })
      }
    })
    return updates
  }

  function getInvalidDetails(refreshFieldErrorsForList: () => void): string[] {
    refreshFieldErrorsForList()
    const tabNames: Record<PointTabType, string> = {
      T: 'Telemetry',
      S: 'Signal',
      C: 'Control',
      A: 'Adjustment',
    }
    const tab = tabNames[options.pointType()] || options.pointType()
    const lines: string[] = []

    options.editPoints.value.forEach((point) => {
      const row = point as PointInfo & { fieldErrors?: Record<string, string> }
      if (!row || row.rowStatus === 'deleted') return
      const errs =
        (row.fieldErrors &&
          Object.entries(row.fieldErrors).filter(([, value]) => value)) ||
        []
      if (errs.length === 0) return

      const id = row.point_id ?? '-'
      const name = row.signal_name
        ? ` (${String(row.signal_name).slice(0, 20)}${String(row.signal_name).length > 20 ? '...' : ''})`
        : ''
      errs.forEach(([field, msg]) => {
        lines.push(`${tab} Point ${id}${name} - ${field}: ${msg}`)
      })
    })
    return lines
  }

  return {
    validateMappingValidity,
    ensureProtocolMappingForEdit,
    onMappingFieldChange,
    onFunctionCodeChange,
    onMappingDataTypeChange,
    getMappingRegisterAddressStr,
    onMappingRegisterAddressInput,
    getMappingFunctionCodeLabel,
    getMappingDataTypeOptions,
    getMappingByteOrderOptionsSafe,
    getSelectPlaceholder,
    getEditedData,
    getInvalidDetails,
  }
}
