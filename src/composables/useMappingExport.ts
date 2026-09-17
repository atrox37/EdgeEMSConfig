import type { Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'
import { getMappingCsvSchema } from '@/schemas/channelProtocols'
import { buildCsv } from '@/utils/csvSchema'
import {
  buildChannelCsvFilename,
  downloadCsv,
  getTimestampCompact,
} from '@/utils/csvExport'
import type { ChannelProtocol, PointTabType } from '@/composables/useMappingEditor'

interface UseMappingExportOptions {
  editPoints: Ref<PointInfo[]>
  pointType: () => PointTabType
  channelProtocol: () => ChannelProtocol
  channelName: () => string
  notify: {
    warning: (message: string) => void
    success: (message: string) => void
  }
}

export function useMappingExport(options: UseMappingExportOptions) {
  const handleExport = async () => {
    if (!options.editPoints.value || options.editPoints.value.length === 0) {
      options.notify.warning('No data to export')
      return
    }

    const schema = getMappingCsvSchema(options.channelProtocol())
    const rows = options.editPoints.value.map((point) => {
      const mapping = (point.protocol_mapping || {}) as Record<string, unknown>
      if (options.channelProtocol() === 'can') {
        return {
          point_id: String(point.point_id ?? ''),
          point_name: String(point.signal_name ?? ''),
          can_id: String(mapping.can_id ?? ''),
          byte_offset: String(mapping.byte_offset ?? ''),
          bit_position: String(mapping.bit_position ?? ''),
          bit_length: String(mapping.bit_length ?? ''),
          data_type: String(mapping.data_type ?? ''),
        }
      }
      return {
        point_id: String(point.point_id ?? ''),
        point_name: String(point.signal_name ?? ''),
        slave_id: String(mapping.slave_id ?? ''),
        function_code: String(mapping.function_code ?? ''),
        register_address: String(mapping.register_address ?? ''),
        data_type: String(mapping.data_type ?? ''),
        byte_order: String(mapping.byte_order ?? ''),
        bit_position: String(mapping.bit_position ?? ''),
        gpio_number: String(mapping.gpio_number ?? ''),
      }
    })

    const tabNames: Record<PointTabType, string> = {
      T: 'telemetry',
      S: 'signal',
      C: 'control',
      A: 'adjustment',
    }
    const filename = buildChannelCsvFilename(options.channelName(), [
      tabNames[options.pointType()],
      'mapping',
      getTimestampCompact(),
    ])
    const csvContent = buildCsv(schema, rows)
    const saveResult = await downloadCsv(csvContent, filename)
    options.notify.success(`Exported to ${saveResult.displayPath}`)
  }

  return {
    handleExport,
  }
}
