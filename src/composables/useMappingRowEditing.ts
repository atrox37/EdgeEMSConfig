import type { ComputedRef } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'
import {
  normalizeType,
  getMappingByteOrderOptions,
  canEditMappingBitPosition,
} from '@/validators/channelMappings'

interface UseMappingRowEditingOptions {
  channelProtocol: () => string
  originalPointsList: ComputedRef<PointInfo[]>
  validateMappingValidity: (row: PointInfo) => boolean
  refreshFieldErrorsForRow: (row: PointInfo) => void
  onCancelEdit?: () => void
}

export function useMappingRowEditing(options: UseMappingRowEditingOptions) {
  const toUpper = (v: any) => String(v ?? '').toUpperCase()

  function updateMappingChangeStatus(item: PointInfo) {
    const original = (options.originalPointsList.value as PointInfo[]).find(
      (p) => p.point_id === item.point_id,
    )
    const origMap = original?.protocol_mapping
    const cur = item.protocol_mapping
    const changes: string[] = []

    if (options.channelProtocol() === 'di_do') {
      const normGpio = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
      const curGpio = normGpio((cur as any)?.gpio_number)
      const origGpio = normGpio((origMap as any)?.gpio_number)
      if (curGpio !== origGpio) changes.push('mapping_gpio_number')
      if (item.rowStatus === 'added') {
        item.modifiedFields = changes
        return
      }
      if (changes.length > 0) {
        item.rowStatus = 'modified'
        item.modifiedFields = changes
      } else {
        item.rowStatus = 'normal'
        item.modifiedFields = []
      }
      return
    }

    if (options.channelProtocol() === 'can') {
      const m = (cur as any) || {}
      const orig = origMap ? (origMap as any) : null
      const normCanId = (v: any) => (v === '' || v === null || v === undefined ? null : String(v).trim())
      const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
      const normStr = (v: any) => (v === '' || v === null || v === undefined ? null : String(v))

      if (orig) {
        const origHasAnyValue =
          !(orig.can_id === undefined || orig.can_id === null || orig.can_id === '') ||
          !(orig.byte_offset === undefined || orig.byte_offset === null) ||
          !(orig.bit_position === undefined || orig.bit_position === null) ||
          !(orig.bit_length === undefined || orig.bit_length === null) ||
          !(orig.data_type === undefined || orig.data_type === null || orig.data_type === '')

        if (!origHasAnyValue) {
          if (m.can_id !== undefined && m.can_id !== null && m.can_id !== '') changes.push('mapping_can_id')
          if (m.byte_offset !== undefined && m.byte_offset !== null) changes.push('mapping_can_offset')
          if (m.bit_position !== undefined && m.bit_position !== null) changes.push('mapping_can_bit_position')
          if (m.bit_length !== undefined && m.bit_length !== null) changes.push('mapping_can_bit_length')
          if (m.data_type !== undefined && m.data_type !== null && m.data_type !== '') changes.push('mapping_can_data_type')
        } else {
          if (normCanId(m.can_id) !== normCanId(orig.can_id)) changes.push('mapping_can_id')
          if (normInt(m.byte_offset) !== normInt(orig.byte_offset)) changes.push('mapping_can_offset')
          if (normInt(m.bit_position) !== normInt(orig.bit_position)) changes.push('mapping_can_bit_position')
          if (normInt(m.bit_length) !== normInt(orig.bit_length)) changes.push('mapping_can_bit_length')
          if (normStr(m.data_type) !== normStr(orig.data_type)) changes.push('mapping_can_data_type')
        }
      } else {
        if (m.can_id !== undefined && m.can_id !== null && m.can_id !== '') changes.push('mapping_can_id')
        if (m.byte_offset !== undefined && m.byte_offset !== null) changes.push('mapping_can_offset')
        if (m.bit_position !== undefined && m.bit_position !== null) changes.push('mapping_can_bit_position')
        if (m.bit_length !== undefined && m.bit_length !== null) changes.push('mapping_can_bit_length')
        if (m.data_type !== undefined && m.data_type !== null && m.data_type !== '') changes.push('mapping_can_data_type')
      }

      if (item.rowStatus === 'added') {
        item.modifiedFields = changes
        return
      }
      if (changes.length > 0) {
        item.rowStatus = 'modified'
        item.modifiedFields = changes
      } else {
        item.rowStatus = 'normal'
        item.modifiedFields = []
      }
      return
    }

    if (cur) {
      if (origMap) {
        const origHasAnyValue =
          !(origMap.slave_id === undefined || origMap.slave_id === null) ||
          !(origMap.function_code === undefined || origMap.function_code === null) ||
          !(origMap.register_address === undefined || origMap.register_address === null) ||
          !(origMap.data_type === undefined || origMap.data_type === null || origMap.data_type === '') ||
          !(origMap.byte_order === undefined || origMap.byte_order === null || origMap.byte_order === '')

        if (!origHasAnyValue) {
          if (cur.slave_id !== undefined && cur.slave_id !== null) changes.push('mapping_slave_id')
          if (cur.function_code !== undefined && cur.function_code !== null)
            changes.push('mapping_function_code')
          if (cur.register_address !== undefined && cur.register_address !== null)
            changes.push('mapping_register_address')
          if (cur.data_type !== undefined && cur.data_type !== null && cur.data_type !== '')
            changes.push('mapping_data_type')
          if (cur.byte_order !== undefined && cur.byte_order !== null && cur.byte_order !== '')
            changes.push('mapping_byte_order')
          if (cur.bit_position !== undefined && cur.bit_position !== null)
            changes.push('mapping_bit_position')
        } else {
          const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          const normRA = (v: any) =>
            v === '' || v === null || v === undefined
              ? null
              : Number.isFinite(Number(v))
                ? Number(v)
                : null
          const normDT = (v: any) => normalizeType(v || '')
          const normBO = (v: any) => String(v || '').toUpperCase()
          const normBP = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))

          if (normInt(cur.slave_id) !== normInt(origMap.slave_id)) changes.push('mapping_slave_id')
          if (normInt(cur.function_code) !== normInt(origMap.function_code))
            changes.push('mapping_function_code')
          if (normRA(cur.register_address) !== normRA(origMap.register_address))
            changes.push('mapping_register_address')
          if (normDT(cur.data_type) !== normDT(origMap.data_type)) changes.push('mapping_data_type')
          if (normBO(cur.byte_order) !== normBO(origMap.byte_order))
            changes.push('mapping_byte_order')
          if (normBP(cur.bit_position) !== normBP(origMap.bit_position))
            changes.push('mapping_bit_position')
        }
      } else {
        if (cur.slave_id !== undefined && cur.slave_id !== null) changes.push('mapping_slave_id')
        if (cur.function_code !== undefined && cur.function_code !== null)
          changes.push('mapping_function_code')
        if (cur.register_address !== undefined && cur.register_address !== null)
          changes.push('mapping_register_address')
        if (cur.data_type !== undefined && cur.data_type !== null && cur.data_type !== '')
          changes.push('mapping_data_type')
        if (cur.byte_order !== undefined && cur.byte_order !== null && cur.byte_order !== '')
          changes.push('mapping_byte_order')
        if (cur.bit_position !== undefined && cur.bit_position !== null)
          changes.push('mapping_bit_position')
      }
    }

    if (item.rowStatus === 'added') {
      item.modifiedFields = changes
      return
    }
    if (changes.length > 0) {
      item.rowStatus = 'modified'
      item.modifiedFields = changes
    } else {
      item.rowStatus = 'normal'
      item.modifiedFields = []
    }
  }

  function resetBitPositionIfNeeded(item: PointInfo) {
    if (!item.protocol_mapping) return
    if (!canEditMappingBitPosition(item)) {
      const currentBp = item.protocol_mapping.bit_position
      if (currentBp !== undefined && currentBp !== null) {
        ;(item.protocol_mapping as any).bit_position = undefined
      }
    }
    updateMappingChangeStatus(item)
  }

  function adjustByteOrderForNewType(item: PointInfo) {
    if (!item.protocol_mapping) return
    const t = normalizeType(item.protocol_mapping.data_type || '')
    const allowed = getMappingByteOrderOptions(item).map((o: any) => toUpper(String(o.value)))
    const current = toUpper(String(item.protocol_mapping.byte_order || ''))
    if (allowed.includes(current)) return
    const is16 = t.includes('16') || t === 'bool' || t === 'boolean'
    const is32 = t.includes('32')
    const map64to32: Record<string, string> = {
      ABCDEFGH: 'ABCD',
      HGFEDCBA: 'DCBA',
      BADCFEHG: 'BADC',
      GHEFCDAB: 'CDAB',
    }
    const map32to16: Record<string, string> = { ABCD: 'AB', DCBA: 'BA', BADC: 'BA', CDAB: 'AB' }
    let downgraded = current
    if (current.length === 8 && (is32 || is16)) downgraded = map64to32[current] || 'ABCD'
    if (is16) {
      const base32 = downgraded.length === 4 ? downgraded : current.length === 4 ? current : 'ABCD'
      downgraded = map32to16[base32] || 'AB'
    }
    const finalOrder = allowed.includes(downgraded) ? downgraded : is16 ? 'AB' : is32 ? 'ABCD' : 'AB'
    item.protocol_mapping.byte_order = finalOrder
  }

  function handleStartMappingEdit(item: PointInfo) {
    if (!item.protocol_mapping) {
      if (options.channelProtocol() === 'di_do') item.protocol_mapping = {} as any
      else {
        item.protocol_mapping = {
          slave_id: undefined,
          function_code: undefined,
          register_address: undefined,
          data_type: undefined,
          byte_order: undefined,
          bit_position: undefined,
        }
      }
    }
    if (options.channelProtocol() === 'di_do') {
      item.originalData = {
        mapping_gpio_number: (item.protocol_mapping as any).gpio_number,
      }
    } else {
      resetBitPositionIfNeeded(item)
      item.originalData = {
        mapping_slave_id: item.protocol_mapping?.slave_id,
        mapping_function_code: item.protocol_mapping?.function_code,
        mapping_register_address: item.protocol_mapping?.register_address,
        mapping_data_type: item.protocol_mapping?.data_type,
        mapping_byte_order: item.protocol_mapping?.byte_order,
        mapping_bit_position: item.protocol_mapping?.bit_position,
      }
    }
    item.isEditing = true
  }

  function handleCancelMappingEdit(item: PointInfo) {
    if (item.originalData && item.protocol_mapping) {
      if (options.channelProtocol() === 'di_do') {
        ;(item.protocol_mapping as any).gpio_number = item.originalData.mapping_gpio_number as number
      } else {
        item.protocol_mapping.slave_id = item.originalData.mapping_slave_id as number
        item.protocol_mapping.function_code = item.originalData.mapping_function_code as number
        item.protocol_mapping.register_address = item.originalData.mapping_register_address as number
        item.protocol_mapping.data_type = item.originalData.mapping_data_type as string
        item.protocol_mapping.byte_order = item.originalData.mapping_byte_order as string
        item.protocol_mapping.bit_position = item.originalData.mapping_bit_position as number
      }
      delete item.originalData
    }
    item.isEditing = false
    options.onCancelEdit?.()
  }

  function handleConfirmMappingEdit(item: PointInfo) {
    if (!item.protocol_mapping) return
    const original = (options.originalPointsList.value as PointInfo[]).find(
      (p) => p.point_id === item.point_id,
    )
    if (options.channelProtocol() === 'di_do') {
      const changes: string[] = []
      const normGpio = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
      const curGpio = normGpio((item.protocol_mapping as any).gpio_number)
      const origGpio = normGpio((original?.protocol_mapping as any)?.gpio_number)
      if (curGpio !== origGpio) changes.push('mapping_gpio_number')
      const isNew = item.rowStatus === 'added'
      if (!isNew && changes.length > 0) {
        item.rowStatus = 'modified'
        item.modifiedFields = [...(item.modifiedFields || []), ...changes]
      } else if (!isNew && changes.length === 0) {
        item.rowStatus = 'normal'
        item.modifiedFields = []
      } else if (isNew) {
        item.modifiedFields = changes
      }
      options.validateMappingValidity(item)
      options.refreshFieldErrorsForRow(item)
      delete item.originalData
      item.isEditing = false
      return
    }
    const changes: string[] = []
    if (original && original.protocol_mapping) {
      const o = original.protocol_mapping
      const c = item.protocol_mapping
      const origHasAnyValue =
        !(o.slave_id === undefined || o.slave_id === null) ||
        !(o.function_code === undefined || o.function_code === null) ||
        !(o.register_address === undefined || o.register_address === null) ||
        !(o.data_type === undefined || o.data_type === null || o.data_type === '') ||
        !(o.byte_order === undefined || o.byte_order === null || o.byte_order === '')

      if (!origHasAnyValue) {
        if (c.slave_id !== undefined && c.slave_id !== null) changes.push('mapping_slave_id')
        if (c.function_code !== undefined && c.function_code !== null)
          changes.push('mapping_function_code')
        if (c.register_address !== undefined && c.register_address !== null)
          changes.push('mapping_register_address')
        if (c.data_type !== undefined && c.data_type !== null && c.data_type !== '')
          changes.push('mapping_data_type')
        if (c.byte_order !== undefined && c.byte_order !== null && c.byte_order !== '')
          changes.push('mapping_byte_order')
        if (c.bit_position !== undefined && c.bit_position !== null)
          changes.push('mapping_bit_position')
      } else {
        const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
        const normRA = (v: any) =>
          v === '' || v === null || v === undefined
            ? null
            : Number.isFinite(Number(v))
              ? Number(v)
              : null
        const normDT = (v: any) => normalizeType(v || '')
        const normBO = (v: any) => String(v || '').toUpperCase()
        const normBP = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))

        if (normInt(c.slave_id) !== normInt(o.slave_id)) changes.push('mapping_slave_id')
        if (normInt(c.function_code) !== normInt(o.function_code))
          changes.push('mapping_function_code')
        if (normRA(c.register_address) !== normRA(o.register_address))
          changes.push('mapping_register_address')
        if (normDT(c.data_type) !== normDT(o.data_type)) changes.push('mapping_data_type')
        if (normBO(c.byte_order) !== normBO(o.byte_order)) changes.push('mapping_byte_order')
        if (normBP(c.bit_position) !== normBP(o.bit_position)) changes.push('mapping_bit_position')
      }
    } else if (item.protocol_mapping) {
      const cur = item.protocol_mapping
      if (cur.slave_id !== undefined && cur.slave_id !== null) changes.push('mapping_slave_id')
      if (cur.function_code !== undefined && cur.function_code !== null)
        changes.push('mapping_function_code')
      if (cur.register_address !== undefined && cur.register_address !== null)
        changes.push('mapping_register_address')
      if (cur.data_type !== undefined && cur.data_type !== null && cur.data_type !== '')
        changes.push('mapping_data_type')
      if (cur.byte_order !== undefined && cur.byte_order !== null && cur.byte_order !== '')
        changes.push('mapping_byte_order')
      if (cur.bit_position !== undefined && cur.bit_position !== null)
        changes.push('mapping_bit_position')
    }
    const isNew = item.rowStatus === 'added'
    if (!isNew && changes.length > 0) {
      item.rowStatus = 'modified'
      item.modifiedFields = [...(item.modifiedFields || []), ...changes]
    } else if (!isNew && changes.length === 0) {
      item.rowStatus = 'normal'
      item.modifiedFields = []
    }
    options.validateMappingValidity(item)
    options.refreshFieldErrorsForRow(item)
    delete item.originalData
    item.isEditing = false
  }

  return {
    updateMappingChangeStatus,
    resetBitPositionIfNeeded,
    adjustByteOrderForNewType,
    handleStartMappingEdit,
    handleCancelMappingEdit,
    handleConfirmMappingEdit,
  }
}
