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

      if (options.channelProtocol() === 'di_do') {
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

      if (options.channelProtocol() === 'di_do') {
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

      if (!incoming) {
        item.protocol_mapping =
          options.channelProtocol() === 'di_do'
            ? ({} as any)
            : {
                slave_id: undefined,
                function_code: undefined,
                register_address: undefined,
                data_type: undefined,
                byte_order: undefined,
                bit_position: undefined,
              }

        const changes: string[] = []
        const cur = item.protocol_mapping
        if (cur || origMap) {
          const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          const normStr = (v: any) => String(v || '').toUpperCase()
          const normBP = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))

          if (options.channelProtocol() === 'di_do') {
            const curGpio = normInt((cur as any)?.gpio_number)
            const origGpio = normInt((origMap as any)?.gpio_number)
            if (curGpio !== origGpio) changes.push('mapping_gpio_number')
          } else {
            if (normInt(cur?.slave_id) !== normInt(origMap?.slave_id)) changes.push('mapping_slave_id')
            if (normInt(cur?.function_code) !== normInt(origMap?.function_code))
              changes.push('mapping_function_code')
            if (normInt(cur?.register_address) !== normInt(origMap?.register_address))
              changes.push('mapping_register_address')
            if (normStr(cur?.data_type || '') !== normStr(origMap?.data_type || ''))
              changes.push('mapping_data_type')
            if (normStr(cur?.byte_order || '') !== normStr(origMap?.byte_order || ''))
              changes.push('mapping_byte_order')
            if (normBP(cur?.bit_position) !== normBP(origMap?.bit_position))
              changes.push('mapping_bit_position')
          }
        }
        if (changes.length > 0) {
          item.rowStatus = item.rowStatus === 'added' ? 'added' : 'modified'
          item.modifiedFields = Array.from(new Set([...(item.modifiedFields || []), ...changes]))
          updated++
        }
        return item
      }

      if (options.channelProtocol() === 'di_do') {
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
      const cur = item.protocol_mapping
      if (cur) {
        if (options.channelProtocol() === 'di_do') {
          const normGpio = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          const curGpio = normGpio((cur as any).gpio_number)
          const origGpio = normGpio((origMap as any)?.gpio_number)
          if (curGpio !== origGpio) changes.push('mapping_gpio_number')
        } else {
          const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          const normStr = (v: any) => String(v || '').toUpperCase()
          const normBP = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
          if (normInt(cur.slave_id) !== normInt(origMap.slave_id)) changes.push('mapping_slave_id')
          if (normInt(cur.function_code) !== normInt(origMap.function_code))
            changes.push('mapping_function_code')
          if (normInt(cur.register_address) !== normInt(origMap.register_address))
            changes.push('mapping_register_address')
          if (normStr(cur.data_type || '') !== normStr(origMap.data_type || ''))
            changes.push('mapping_data_type')
          if (normStr(cur.byte_order || '') !== normStr(origMap.byte_order || ''))
            changes.push('mapping_byte_order')
          if (normBP(cur.bit_position) !== normBP(origMap.bit_position))
            changes.push('mapping_bit_position')
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
