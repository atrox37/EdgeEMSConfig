import type { PointInfo } from '@/types/channelConfiguration'
import { formatUpdateTime } from '@/utils/csvExport'
import { FC_BY_POINT } from '@/validators/channelMappings'

export interface PointColumn {
  key: string
  prop: string
  label: string
  minWidth: number
  className: string
  editor: 'input' | 'number' | 'select'
  isEditable: boolean
  fieldClassKey: string
  errorKey: string
  placeholder?: string
  precision?: number
  min?: number
  max?: number
  showOverflow?: boolean
  canEdit?: (row: PointInfo) => boolean
  getOptions?: (row: PointInfo) => Array<{ label: string; value: any }>
  onChange?: (row: PointInfo) => void
  onInput?: (row: PointInfo) => void
  display: (row: PointInfo) => string
}

export interface MappingColumn {
  key: string
  prop: string
  label: string
  minWidth: number
  className: string
  editor: 'number' | 'select' | 'input'
  fieldClassKey: string
  errorKey: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  popperClass?: string
  disabled?: (row: PointInfo) => boolean
  getOptions?: (row: PointInfo) => Array<{ label: string; value: any }>
  getValue?: (row: PointInfo) => string
  onChange?: (row: PointInfo) => void
  onInput?: (row: PointInfo, val: string) => void
  display: (row: PointInfo) => string
}

export function getPointColumns(options: {
  isEditing: boolean
  isTA: boolean
  channelProtocol?: string
  onFieldInput: (row: PointInfo, field: string) => void
  canEditPointId: (row: PointInfo) => boolean
  showRealtimeColumns?: boolean
}): PointColumn[] {
  const isCan = options.channelProtocol === 'can'

  const base: PointColumn[] = [
    {
      key: 'point_id',
      prop: 'point_id',
      label: 'Point ID',
      minWidth: 80,
      className: 'point-id-column',
      editor: 'input',
      isEditable: true,
      fieldClassKey: 'point_id',
      errorKey: 'point_id',
      min: 1,
      precision: 0,
      canEdit: options.canEditPointId,
      onChange: (row) => options.onFieldInput(row, 'point_id'),
      onInput: (row) => options.onFieldInput(row, 'point_id'),
      placeholder: 'Point ID',
      display: (row) => String(row.point_id),
    },
    {
      key: 'signal_name',
      prop: 'signal_name',
      label: 'Point Name',
      minWidth: 200,
      className: 'signal-name-column',
      editor: 'input',
      isEditable: true,
      fieldClassKey: 'signal_name',
      errorKey: 'signal_name',
      placeholder: 'Enter signal name',
      showOverflow: true,
      onInput: (row) => options.onFieldInput(row, 'signal_name'),
      display: (row) => String(row.signal_name || ''),
    },
  ]

  if (!options.isEditing && options.showRealtimeColumns !== false) {
    base.push(
      {
        key: 'value',
        prop: 'value',
        label: 'Value',
        minWidth: 120,
        className: 'value-column',
        editor: 'input',
        isEditable: false,
        fieldClassKey: 'value',
        errorKey: 'value',
        display: (row) => String((row as any).value ?? '-'),
      },
      {
        key: 'update_time',
        prop: 'update_time',
        label: 'Update Time',
        minWidth: 160,
        className: 'update-time-column',
        editor: 'input',
        isEditable: false,
        fieldClassKey: 'update_time',
        errorKey: 'update_time',
        display: (row) => formatUpdateTime((row as any).update_ts),
      },
    )
  }

  // CAN Telemetry：scale / offset / unit（无 reverse）
  // 其他协议 TA 类型：scale / offset / unit
  if (options.isTA) {
    base.push(
      {
        key: 'scale',
        prop: 'scale',
        label: 'Scale',
        minWidth: 80,
        className: 'scale-column',
        editor: 'input',
        isEditable: true,
        fieldClassKey: 'scale',
        errorKey: 'scale',
        min: 0,
        precision: 6,
        onChange: (row) => options.onFieldInput(row, 'scale'),
        onInput: (row) => options.onFieldInput(row, 'scale'),
        placeholder: 'Scale',
        display: (row) => String(row.scale ?? ''),
      },
      {
        key: 'offset',
        prop: 'offset',
        label: 'Offset',
        minWidth: 80,
        className: 'offset-column',
        editor: 'input',
        isEditable: true,
        fieldClassKey: 'offset',
        errorKey: 'offset',
        precision: 6,
        onChange: (row) => options.onFieldInput(row, 'offset'),
        onInput: (row) => options.onFieldInput(row, 'offset'),
        placeholder: 'Offset',
        display: (row) => String(row.offset ?? ''),
      },
      {
        key: 'unit',
        prop: 'unit',
        label: 'Unit',
        minWidth: 80,
        className: 'unit-column',
        editor: 'input',
        isEditable: true,
        fieldClassKey: 'unit',
        errorKey: 'unit',
        placeholder: 'Enter unit',
        onInput: (row) => options.onFieldInput(row, 'unit'),
        display: (row) => String(row.unit ?? ''),
      },
    )
  }

  // 非 CAN 协议保留 Reverse 列
  if (!isCan) {
    base.push({
      key: 'reverse',
      prop: 'reverse',
      label: 'Reverse',
      minWidth: 80,
      className: 'reverse-column',
      editor: 'select',
      isEditable: true,
      fieldClassKey: 'reverse',
      errorKey: 'reverse',
      getOptions: () => [
        { label: 'true', value: true },
        { label: 'false', value: false },
      ],
      onChange: (row) => options.onFieldInput(row, 'reverse'),
      display: (row) => String(row.reverse ?? ''),
    })
  }

  return base
}

export function getMappingColumns(options: {
  channelProtocol: string
  pointType: 'T' | 'S' | 'C' | 'A'
  onMappingFieldChange: (row: PointInfo, field: string) => void
  onFunctionCodeChange: (row: PointInfo) => void
  getMappingDataTypeOptions: () => Array<{ label: string; value: any }>
  getMappingRegisterAddressStr: (row: PointInfo) => string
  onMappingRegisterAddressInput: (row: PointInfo, value: string) => void
  onMappingDataTypeChange: (row: PointInfo) => void
  getMappingByteOrderOptions: (row: PointInfo) => Array<{ label: string; value: any }>
  canEditMappingBitPosition: (row: PointInfo) => boolean
  getMappingFunctionCodeLabel: (fc: number | undefined) => string
}): MappingColumn[] {
  // CAN 协议映射列：can_id / offset(帧内字节偏移) / bit_position / bit_length / data_type
  if (options.channelProtocol === 'can') {
    return [
      {
        key: 'can_id',
        prop: 'protocol_mapping.can_id',
        label: 'CAN ID',
        minWidth: 120,
        className: 'can-id-column',
        editor: 'input',
        fieldClassKey: 'mapping_can_id',
        errorKey: 'can_id',
        placeholder: 'e.g. 0x35A',
        onInput: (row, val: string) => {
          const trimmed = String(val ?? '').trim()
          ;(row.protocol_mapping as any).can_id = trimmed === '' ? undefined : trimmed
          options.onMappingFieldChange(row, 'can_id')
        },
        display: (row) => String((row.protocol_mapping as any)?.can_id ?? ''),
      },
      {
        key: 'byte_offset',
        prop: 'protocol_mapping.byte_offset',
        label: 'Byte Offset',
        minWidth: 120,
        className: 'can-offset-column',
        editor: 'input',
        fieldClassKey: 'mapping_can_offset',
        errorKey: 'can_offset',
        placeholder: '0-7',
        onInput: (row, val: string) => {
          const trimmed = String(val ?? '').trim()
          if (trimmed === '') {
            ;(row.protocol_mapping as any).byte_offset = undefined
          } else {
            const digits = trimmed.replace(/\D+/g, '')
            if (digits !== '') {
              const n = Math.min(7, Math.max(0, parseInt(digits, 10)))
              ;(row.protocol_mapping as any).byte_offset = n
            }
          }
          options.onMappingFieldChange(row, 'can_offset')
        },
        display: (row) => String((row.protocol_mapping as any)?.byte_offset ?? ''),
      },
      {
        key: 'bit_position',
        prop: 'protocol_mapping.bit_position',
        label: 'Bit Position',
        minWidth: 120,
        className: 'can-bit-position-column',
        editor: 'input',
        fieldClassKey: 'mapping_can_bit_position',
        errorKey: 'can_bit_position',
        placeholder: '0-7',
        onInput: (row, val: string) => {
          const trimmed = String(val ?? '').trim()
          if (trimmed === '') {
            ;(row.protocol_mapping as any).bit_position = undefined
          } else {
            const digits = trimmed.replace(/\D+/g, '')
            if (digits !== '') {
              const n = Math.min(7, Math.max(0, parseInt(digits, 10)))
              ;(row.protocol_mapping as any).bit_position = n
            }
          }
          options.onMappingFieldChange(row, 'can_bit_position')
        },
        display: (row) => String((row.protocol_mapping as any)?.bit_position ?? ''),
      },
      {
        key: 'bit_length',
        prop: 'protocol_mapping.bit_length',
        label: 'Bit Length',
        minWidth: 120,
        className: 'can-bit-length-column',
        editor: 'input',
        fieldClassKey: 'mapping_can_bit_length',
        errorKey: 'can_bit_length',
        placeholder: '1-64',
        onInput: (row, val: string) => {
          const trimmed = String(val ?? '').trim()
          if (trimmed === '') {
            ;(row.protocol_mapping as any).bit_length = undefined
          } else {
            const n = parseInt(trimmed, 10)
            if (!isNaN(n)) { (row.protocol_mapping as any).bit_length = n }
          }
          options.onMappingFieldChange(row, 'can_bit_length')
        },
        display: (row) => String((row.protocol_mapping as any)?.bit_length ?? ''),
      },
      {
        key: 'data_type',
        prop: 'protocol_mapping.data_type',
        label: 'Data Type',
        minWidth: 140,
        className: 'can-data-type-column',
        editor: 'select',
        fieldClassKey: 'mapping_can_data_type',
        errorKey: 'can_data_type',
        getOptions: () => options.getMappingDataTypeOptions(),
        onChange: (row) => options.onMappingDataTypeChange(row),
        display: (row) => String((row.protocol_mapping as any)?.data_type ?? ''),
      },
    ]
  }

  if (options.channelProtocol === 'di_do') {
    return [
      {
        key: 'gpio_number',
        prop: 'protocol_mapping.gpio_number',
        label: 'GPIO Number',
        minWidth: 120,
        className: 'gpio-number-column',
        editor: 'input',
        fieldClassKey: 'mapping_gpio_number',
        errorKey: 'gpio_number',
        min: 1,
        step: 1,
        onChange: (row) => options.onMappingFieldChange(row, 'gpio_number'),
        onInput: (row, val: string) => {
          const trimmed = String(val ?? '').trim()
          if (trimmed === '') {
            (row.protocol_mapping as any).gpio_number = undefined
          } else {
            const n = parseInt(trimmed, 10)
            if (!isNaN(n)) (row.protocol_mapping as any).gpio_number = n
          }
          options.onMappingFieldChange(row, 'gpio_number')
        },
        placeholder: 'GPIO',
        display: (row) => String((row.protocol_mapping as any)?.gpio_number ?? ''),
      },
    ]
  }

  return [
    {
      key: 'slave_id',
      prop: 'protocol_mapping.slave_id',
      label: 'Slave ID',
      minWidth: 80,
      className: 'slave-id-column',
      editor: 'input',
      fieldClassKey: 'mapping_slave_id',
      errorKey: 'slave_id',
      min: 0,
      max: 999,
      onChange: (row) => options.onMappingFieldChange(row, 'slave_id'),
      onInput: (row, val: string) => {
        const trimmed = String(val ?? '').trim()
        if (trimmed === '') {
          (row.protocol_mapping as any).slave_id = undefined
        } else {
          const n = parseInt(trimmed, 10)
          if (!isNaN(n)) (row.protocol_mapping as any).slave_id = n
        }
        options.onMappingFieldChange(row, 'slave_id')
      },
      placeholder: '0-999',
      display: (row) => String(row.protocol_mapping?.slave_id ?? ''),
    },
    {
      key: 'function_code',
      prop: 'protocol_mapping.function_code',
      label: 'Function Code',
      minWidth: 140,
      className: 'function-code-column',
      editor: 'select',
      fieldClassKey: 'mapping_function_code',
      errorKey: 'function_code',
      getOptions: () =>
        (FC_BY_POINT[options.pointType] || []).map((c) => ({ label: String(c), value: c })),
      onChange: (row) => options.onFunctionCodeChange(row),
      display: (row) => options.getMappingFunctionCodeLabel(row.protocol_mapping?.function_code),
    },
    {
      key: 'register_address',
      prop: 'protocol_mapping.register_address',
      label: 'Register Address',
      minWidth: 160,
      className: 'register-address-column',
      editor: 'input',
      fieldClassKey: 'mapping_register_address',
      errorKey: 'register_address',
      placeholder: '0-65535',
      getValue: (row) => options.getMappingRegisterAddressStr(row),
      onInput: (row, val) => options.onMappingRegisterAddressInput(row, val),
      display: (row) => String(row.protocol_mapping?.register_address ?? ''),
    },
    {
      key: 'data_type',
      prop: 'protocol_mapping.data_type',
      label: 'Data Type',
      minWidth: 140,
      className: 'data-type-column',
      editor: 'select',
      fieldClassKey: 'mapping_data_type',
      errorKey: 'data_type',
      getOptions: () => options.getMappingDataTypeOptions(),
      onChange: (row) => options.onMappingDataTypeChange(row),
      display: (row) => String(row.protocol_mapping?.data_type ?? ''),
    },
    {
      key: 'byte_order',
      prop: 'protocol_mapping.byte_order',
      label: 'Byte Order',
      minWidth: 130,
      className: 'byte-order-column',
      editor: 'select',
      fieldClassKey: 'mapping_byte_order',
      errorKey: 'byte_order',
      getOptions: (row) =>
        options.getMappingByteOrderOptions(row).map((o: any) => ({
          label: String(o.label ?? o.value),
          value: o.value,
        })),
      onChange: (row) => options.onMappingFieldChange(row, 'byte_order'),
      display: (row) => String(row.protocol_mapping?.byte_order ?? ''),
    },
    {
      key: 'bit_position',
      prop: 'protocol_mapping.bit_position',
      label: 'Bit Position',
      minWidth: 130,
      className: 'bit-position-column',
      editor: 'input',
      fieldClassKey: 'mapping_bit_position',
      errorKey: 'bit_position',
      min: 0,
      max: 15,
      disabled: (row) => !options.canEditMappingBitPosition(row),
      onChange: (row) => options.onMappingFieldChange(row, 'bit_position'),
      onInput: (row, val: string) => {
        const trimmed = String(val ?? '').trim()
        if (trimmed === '') {
          (row.protocol_mapping as any).bit_position = undefined
        } else {
          const n = parseInt(trimmed, 10)
          if (!isNaN(n)) (row.protocol_mapping as any).bit_position = n
        }
        options.onMappingFieldChange(row, 'bit_position')
      },
      placeholder: '0-15',
      display: (row) => String(row.protocol_mapping?.bit_position ?? ''),
    },
  ]
}
