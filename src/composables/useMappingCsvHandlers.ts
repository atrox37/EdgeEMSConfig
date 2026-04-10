import type { ComputedRef, Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'
import { getMappingCsvSchema } from '@/schemas/channelProtocols'
import { parseCsvRows } from '@/utils/csvSchema'
import {
  DATA_TYPE_BY_POINT,
  FC_BY_POINT,
  canEditMappingBitPosition,
  getMappingByteOrderOptions,
  normalizeType,
} from '@/validators/channelMappings'

interface UseMappingCsvHandlersOptions {
  pointType: () => 'T' | 'S' | 'C' | 'A'
  channelProtocol: () => string
  editPoints: Ref<PointInfo[]>
  originalPointsList: ComputedRef<PointInfo[]>
  setImportedFileName: (name: string) => void
  enterEditMode: () => void
  validateMappingValidity: (row: PointInfo) => void
  refreshMappingFieldErrorsForList: () => void
  notify: {
    success: (msg: string) => void
    warning: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
}

export function useMappingCsvHandlers(options: UseMappingCsvHandlersOptions) {
  const handleMappingsCsvContent = (content: string, file: File) => {
    const schema = getMappingCsvSchema(options.channelProtocol())
    const parsed = parseCsvRows(schema, content)
    if (parsed.error) {
      options.notify.error(parsed.error)
      return
    }
    if (!parsed.rows.length) {
      options.notify.warning('No data to import')
      return
    }

    const isCan = options.channelProtocol() === 'can'

    const byId: Record<
      number,
      {
        slave_id?: number
        function_code?: number
        register_address?: number
        data_type?: string
        byte_order?: string
        bit_position?: number
        gpio_number?: number | string
        // CAN 映射字段
        can_id?: string | number
        byte_offset?: number
        bit_length?: number
        isInvalid?: boolean
      }
    > = {}
    const invalidRecords: number[] = []
    const skippedNoPoint: number[] = []

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i] as any
      const rowIndex = i + 2
      const pointIdStr = String(row.point_id ?? '')
      const pointId = Number(pointIdStr)
      if (!Number.isInteger(pointId) || pointId <= 0) {
        invalidRecords.push(rowIndex)
        continue
      }

      const exist = (options.editPoints.value as PointInfo[]).some((p) => p.point_id === pointId)
      if (!exist) {
        skippedNoPoint.push(pointId)
        continue
      }

      let slave_id: number
      let function_code: number
      let register_address: number
      let data_type: string
      let byte_order: string
      let bit_position: number
      let gpio_number: number | string | undefined
      let can_id: string | number | undefined
      let byte_offset: number | undefined
      let bit_length: number | undefined

      if (isCan) {
        const canIdStr = String(row.can_id ?? '').trim()
        const byteOffsetStr = String(row.byte_offset ?? '').trim()
        const bitPosStr = String(row.bit_position ?? '').trim()
        const bitLenStr = String(row.bit_length ?? '').trim()
        const dtStr = String(row.data_type ?? '').trim()

        can_id = canIdStr || undefined
        byte_offset = byteOffsetStr !== '' ? Number(byteOffsetStr) : undefined
        bit_position = bitPosStr !== '' ? Number(bitPosStr) : (undefined as any)
        bit_length = bitLenStr !== '' ? Number(bitLenStr) : undefined
        data_type = dtStr || ''
        slave_id = 0
        function_code = 0
        register_address = 0
        byte_order = ''
      } else if (options.channelProtocol() === 'di_do') {
        const gpioStr = String(row.gpio_number ?? '')
        if (gpioStr && gpioStr.trim()) {
          const gpioNum = Number(gpioStr.trim())
          gpio_number = isNaN(gpioNum) ? gpioStr : gpioNum
        } else {
          gpio_number = undefined
        }
        slave_id = 0
        function_code = 0
        register_address = 0
        data_type = ''
        byte_order = ''
        bit_position = 0
      } else {
        const slaveIdStr = String(row.slave_id ?? '')
        const fcStr = String(row.function_code ?? '')
        const regStr = String(row.register_address ?? '')
        const dtStr = String(row.data_type ?? '')
        const orderStr = String(row.byte_order ?? '')
        const bitStr = String(row.bit_position ?? '')
        slave_id = Number(slaveIdStr)
        function_code = Number(fcStr)
        register_address = Number(regStr)
        data_type = normalizeType(dtStr)
        byte_order = String(orderStr || '').toUpperCase()
        bit_position = Number(bitStr)
      }

      let isInvalid = false

      if (isCan) {
        const hasCanId = can_id !== undefined && can_id !== ''
        const hasByteOffset = byte_offset !== undefined
        const hasBitPos = bit_position !== undefined && !isNaN(bit_position as number)
        const hasBitLen = bit_length !== undefined
        const hasDataType = !!data_type
        const filledCount = [hasCanId, hasByteOffset, hasBitPos, hasBitLen, hasDataType].filter(Boolean).length
        if (filledCount > 0 && filledCount < 5) {
          isInvalid = true
        } else if (filledCount === 5) {
          const raw = String(can_id).trim()
          const n = raw.startsWith('0x') || raw.startsWith('0X') ? parseInt(raw, 16) : parseInt(raw, 10)
          if (isNaN(n) || n < 0) isInvalid = true
          if (!isInvalid && (!Number.isInteger(byte_offset!) || byte_offset! < 0 || byte_offset! > 7)) isInvalid = true
          if (!isInvalid && (!Number.isInteger(bit_position) || (bit_position as number) < 0 || (bit_position as number) > 63)) isInvalid = true
          if (!isInvalid && (!Number.isInteger(bit_length!) || bit_length! < 1 || bit_length! > 64)) isInvalid = true
        }
      } else if (options.channelProtocol() === 'di_do') {
        if (gpio_number !== undefined && gpio_number !== null) {
          if (
            isNaN(gpio_number as number) ||
            !Number.isInteger(gpio_number) ||
            Number(gpio_number) <= 0
          ) {
            isInvalid = true
          }
        }
      } else {
        if (!Number.isInteger(slave_id) || slave_id < 1 || slave_id > 247) {
          isInvalid = true
        }

        if (!isInvalid) {
          const allowedDT = DATA_TYPE_BY_POINT[options.pointType()] || []
          if (!allowedDT.includes(data_type)) {
            isInvalid = true
          }
        }

        if (!isInvalid) {
          const allowedByPoint = FC_BY_POINT[options.pointType()] || []
          const base =
            data_type === 'bool' || data_type === 'boolean' ? [1, 2, 5, 15] : [3, 4, 6, 16]
          const allowedFC = base.filter((c) => allowedByPoint.includes(c))
          if (!allowedFC.includes(function_code)) {
            isInvalid = true
          }
        }

        if (
          !isInvalid &&
          (!Number.isInteger(register_address) ||
            register_address < 0 ||
            register_address > 65535)
        ) {
          isInvalid = true
        }

        if (!isInvalid) {
          const temp: any = { protocol_mapping: { data_type } }
          const allowedOrders = getMappingByteOrderOptions(temp as PointInfo).map((o: any) =>
            String(o.value).toUpperCase(),
          )
          if (!allowedOrders.includes(byte_order)) {
            isInvalid = true
          }
        }

        if (!isInvalid) {
          const temp: any = { protocol_mapping: { data_type, function_code } }
          const canEdit = canEditMappingBitPosition(temp as PointInfo)
          if (canEdit) {
            if (!Number.isInteger(bit_position) || bit_position < 0 || bit_position > 15) {
              isInvalid = true
            }
          } else {
            if (bit_position != 0) {
              isInvalid = true
            }
          }
        }
      }

      byId[pointId] = {
        slave_id,
        function_code,
        register_address,
        data_type,
        byte_order,
        bit_position,
        gpio_number: options.channelProtocol() === 'di_do' ? gpio_number : undefined,
        can_id: isCan ? can_id : undefined,
        byte_offset: isCan ? byte_offset : undefined,
        bit_length: isCan ? bit_length : undefined,
        isInvalid,
      }
    }

    options.setImportedFileName(file.name)
    options.enterEditMode()

    let updated = 0
    options.editPoints.value = (options.editPoints.value as PointInfo[]).map((item) => {
      const incoming = byId[item.point_id]
      const orig = (options.originalPointsList.value as PointInfo[]).find(
        (p) => p.point_id === item.point_id,
      )
      const origMap = orig?.protocol_mapping || {}

      const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
      const normStr = (v: any) => String(v || '').toUpperCase()

      if (!incoming) {
        if (isCan) {
          ;(item as any).protocol_mapping = {
            can_id: undefined,
            byte_offset: undefined,
            bit_position: undefined,
            bit_length: undefined,
            data_type: undefined,
          }
        } else if (options.channelProtocol() === 'di_do') {
          item.protocol_mapping = {} as any
        } else {
          item.protocol_mapping = {
            slave_id: undefined,
            function_code: undefined,
            register_address: undefined,
            data_type: undefined,
            byte_order: undefined,
            bit_position: undefined,
          }
        }

        const changes: string[] = []
        const cur = item.protocol_mapping as any
        if (isCan) {
          if (normInt(cur?.can_id) !== normInt((origMap as any)?.can_id)) changes.push('mapping_can_id')
          if (normInt(cur?.byte_offset) !== normInt((origMap as any)?.byte_offset)) changes.push('mapping_can_offset')
          if (normInt(cur?.bit_position) !== normInt((origMap as any)?.bit_position)) changes.push('mapping_can_bit_position')
          if (normInt(cur?.bit_length) !== normInt((origMap as any)?.bit_length)) changes.push('mapping_can_bit_length')
          if (normStr(cur?.data_type || '') !== normStr((origMap as any)?.data_type || '')) changes.push('mapping_can_data_type')
        } else if (options.channelProtocol() === 'di_do') {
          const curGpio = normInt((cur as any)?.gpio_number)
          const origGpio = normInt((origMap as any)?.gpio_number)
          if (curGpio !== origGpio) changes.push('mapping_gpio_number')
        } else {
          if (normInt(cur?.slave_id) !== normInt(origMap?.slave_id)) changes.push('mapping_slave_id')
          if (normInt(cur?.function_code) !== normInt(origMap?.function_code)) changes.push('mapping_function_code')
          if (normInt(cur?.register_address) !== normInt(origMap?.register_address)) changes.push('mapping_register_address')
          if (normStr(cur?.data_type || '') !== normStr(origMap?.data_type || '')) changes.push('mapping_data_type')
          if (normStr(cur?.byte_order || '') !== normStr(origMap?.byte_order || '')) changes.push('mapping_byte_order')
          if (normInt(cur?.bit_position) !== normInt(origMap?.bit_position)) changes.push('mapping_bit_position')
        }
        if (changes.length > 0) {
          item.rowStatus = item.rowStatus === 'added' ? 'added' : 'modified'
          item.modifiedFields = Array.from(new Set([...(item.modifiedFields || []), ...changes]))
          updated++
        }
        return item
      }

      if (isCan) {
        ;(item as any).protocol_mapping = {
          can_id: incoming.can_id,
          byte_offset: incoming.byte_offset,
          bit_position: incoming.bit_position,
          bit_length: incoming.bit_length,
          data_type: incoming.data_type,
        }
        if (incoming.isInvalid) {
          ;(item as any).isInvalid = true
        }
      } else if (options.channelProtocol() === 'di_do') {
        item.protocol_mapping = {
          gpio_number: incoming.gpio_number,
        } as any
        if (incoming.isInvalid) {
          ;(item as any).isInvalid = true
        }
      } else {
        item.protocol_mapping = {
          slave_id: incoming.slave_id,
          function_code: incoming.function_code,
          register_address: incoming.register_address,
          data_type: incoming.data_type,
          byte_order: incoming.byte_order,
          bit_position: incoming.bit_position,
        }
      }

      const changes: string[] = []
      const cur = item.protocol_mapping as any
      if (cur) {
        if (isCan) {
          if (normInt(cur.can_id) !== normInt((origMap as any)?.can_id)) changes.push('mapping_can_id')
          if (normInt(cur.byte_offset) !== normInt((origMap as any)?.byte_offset)) changes.push('mapping_can_offset')
          if (normInt(cur.bit_position) !== normInt((origMap as any)?.bit_position)) changes.push('mapping_can_bit_position')
          if (normInt(cur.bit_length) !== normInt((origMap as any)?.bit_length)) changes.push('mapping_can_bit_length')
          if (normStr(cur.data_type || '') !== normStr((origMap as any)?.data_type || '')) changes.push('mapping_can_data_type')
        } else if (options.channelProtocol() === 'di_do') {
          const normGpio = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          const curGpio = normGpio((cur as any).gpio_number)
          const origGpio = normGpio((origMap as any)?.gpio_number)
          if (curGpio !== origGpio) changes.push('mapping_gpio_number')
        } else {
          if (normInt(cur.slave_id) !== normInt(origMap.slave_id)) changes.push('mapping_slave_id')
          if (normInt(cur.function_code) !== normInt(origMap.function_code)) changes.push('mapping_function_code')
          if (normInt(cur.register_address) !== normInt(origMap.register_address)) changes.push('mapping_register_address')
          if (normStr(cur.data_type || '') !== normStr(origMap.data_type || '')) changes.push('mapping_data_type')
          if (normStr(cur.byte_order || '') !== normStr(origMap.byte_order || '')) changes.push('mapping_byte_order')
          if (normInt(cur.bit_position) !== normInt(origMap.bit_position)) changes.push('mapping_bit_position')
        }
      }
      if (changes.length > 0) {
        item.rowStatus = item.rowStatus === 'added' ? 'added' : 'modified'
        item.modifiedFields = Array.from(new Set([...(item.modifiedFields || []), ...changes]))
        updated++
      }
      return item
    })

    options.editPoints.value.forEach((p) => options.validateMappingValidity(p))
    options.refreshMappingFieldErrorsForList()

    if (invalidRecords.length > 0) {
      options.notify.warning(
        `CSV file has ${invalidRecords.length} invalid row(s). Please check the format.`,
      )
    }

    if (updated === 0) {
      options.notify.info('No mappings updated (no matching point_id or no changes)')
    } else {
      const invalidCount = options.editPoints.value.filter((p: any) => (p as any).isInvalid).length
      if (invalidCount === 0) {
        options.notify.success(`Successfully applied mappings to ${updated} point(s)`)
      } else {
        options.notify.warning(
          `Applied mappings to ${updated} point(s), but ${invalidCount} point(s) have errors. Please check the rows marked in red.`,
        )
      }
    }

    if (skippedNoPoint.length > 0) {
      options.notify.info(
        `Skipped ${skippedNoPoint.length} non-existing point_id(s): ${Array.from(
          new Set(skippedNoPoint),
        )
          .slice(0, 10)
          .join(', ')}${skippedNoPoint.length > 10 ? '...' : ''}`,
      )
    }
  }

  return {
    handleMappingsCsvContent,
  }
}
