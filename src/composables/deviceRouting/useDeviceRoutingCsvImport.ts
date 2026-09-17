import type { Ref } from 'vue'
import { getChannelsByIds } from '@/api/channelsManagement'
import { parseDeviceRoutingTypeStrict } from '@/validators/deviceRouting'
import { parseDeviceRoutingCsv } from '@/schemas/deviceRouting'
import type { DeviceRoutingEditRow } from '@/composables/deviceRouting/useDeviceRoutingEditor'
import {
  createEmptyDeviceRouting,
  type UseDeviceRoutingEditorOptions,
} from '@/composables/deviceRouting/useDeviceRoutingEditor'

interface RoutingEditorApi {
  getPointId: (row: DeviceRoutingEditRow) => number
  getChannelTypeOptions: () => Array<{ label: string; value: string }>
  getOriginalBaselineByPointId: (pid: number) => any | undefined
  updateRoutingChangeStatus: (row: DeviceRoutingEditRow) => void
  setRoutingFieldError: (row: DeviceRoutingEditRow, field: string, message: string) => void
  validateRoutingValidity: (row: DeviceRoutingEditRow) => boolean
  refreshRoutingFieldErrorsForList: () => void
}

interface UseDeviceRoutingCsvImportOptions extends UseDeviceRoutingEditorOptions {
  editPoints: Ref<DeviceRoutingEditRow[]>
  importedFileName: Ref<string>
  editor: RoutingEditorApi
  notify: {
    success: (message: string) => void
    warning: (message: string) => void
    error: (message: string) => void
  }
}

function applyImportedEmptyRouting(
  item: DeviceRoutingEditRow,
  pid: number,
  editor: RoutingEditorApi,
) {
  item.routing = createEmptyDeviceRouting()
  editor.updateRoutingChangeStatus(item)
  void pid
}

export function useDeviceRoutingCsvImport(options: UseDeviceRoutingCsvImportOptions) {
  const handleRoutingCsvContent = async (content: string, file: File) => {
    if (!options.channels()?.length) {
      options.notify.error('Channels not loaded. Please wait for channels to load before importing.')
      return
    }

    const { byId, invalidRows, error } = parseDeviceRoutingCsv(content)
    if (error) {
      options.notify.error(error)
      return
    }

    options.importedFileName.value = file.name
    const editor = options.editor

    options.editPoints.value = await Promise.all(
      options.editPoints.value.map(async (item) => {
        const pid = editor.getPointId(item)
        const inc = byId[pid]

        if (!inc) {
          applyImportedEmptyRouting(item, pid, editor)
          return item
        }

        let finalChannelPointId = inc.channel_point_id
        const finalChannelPointName = ''
        const chId = Number(inc.channel_id || 0)
        let channelExists = false
        if (chId > 0) {
          channelExists = options.channels()?.some((ch) => Number(ch.id) === chId) ?? false
        }

        const channelTypeStr = String(inc.channel_type || '').trim()
        const allowedTypes = editor.getChannelTypeOptions().map((o) => o.value)
        let finalChannelType = inc.channel_type as string
        let channelTypeError = ''

        if (channelTypeStr) {
          const allowedTypesLabels = editor
            .getChannelTypeOptions()
            .map((o) => o.label)
            .join(' / ')
          const parsed = parseDeviceRoutingTypeStrict(channelTypeStr)
          if (!parsed.isValidLiteral || !parsed.abbr) {
            finalChannelType = channelTypeStr
            channelTypeError = `Must be ${allowedTypesLabels}`
            item.isInvalid = true
          } else {
            finalChannelType = parsed.abbr
            if (!allowedTypes.includes(parsed.abbr)) {
              channelTypeError = `Must be ${allowedTypesLabels}`
              item.isInvalid = true
            }
          }
        }

        if (!channelExists && chId > 0) {
          item.isInvalid = true
          item.routing = {
            channel_id: inc.channel_id,
            channel_type: finalChannelType,
            channel_point_id: finalChannelPointId,
            enabled: inc.enabled,
            channel_name: inc.channel_id ? String(inc.channel_id) : '',
            channel_point_name:
              finalChannelPointId !== undefined && finalChannelPointId !== null
                ? String(finalChannelPointId)
                : '',
          }
        } else {
          item.routing = {
            channel_id: inc.channel_id,
            channel_type: finalChannelType,
            channel_point_id: finalChannelPointId,
            enabled: inc.enabled,
            channel_name: '',
            channel_point_name: finalChannelPointName,
          }
        }

        item.__routingMeta = {
          channelExists: channelExists ? true : chId > 0 ? false : undefined,
          pointExists: !channelExists && chId > 0 ? false : undefined,
          importedChannelId: inc.channel_id,
          importedChannelPointId: finalChannelPointId,
        }

        if (channelTypeError) {
          editor.setRoutingFieldError(item, 'channel_type', channelTypeError)
          const pointIdNum = Number(finalChannelPointId || 0)
          if (channelExists && pointIdNum > 0) {
            item.__routingMeta = {
              ...item.__routingMeta,
              pointExists: false,
            }
            item.isInvalid = true
          }
        }

        editor.updateRoutingChangeStatus(item)
        return item
      }),
    )

    options.editPoints.value.forEach((row) => editor.validateRoutingValidity(row))

    const channelIdsToFetch = new Set<number>()
    options.editPoints.value.forEach((item) => {
      const chId = Number(item.routing?.channel_id || 0)
      if (chId > 0) {
        const exists = options.channels()?.some((ch) => Number(ch.id) === chId) ?? false
        if (exists) channelIdsToFetch.add(chId)
      }
    })

    if (channelIdsToFetch.size > 0) {
      try {
        const idsArray = Array.from(channelIdsToFetch)
        const res = await getChannelsByIds(idsArray, { skipGlobalLoading: true })
        const channelsList = Array.isArray(res?.data?.list) ? res.data.list : []
        const channelMap = new Map<number, any>()
        channelsList.forEach((ch: any) => {
          const chId = Number(ch?.id)
          if (Number.isFinite(chId) && chId > 0) channelMap.set(chId, ch)
        })

        options.editPoints.value.forEach((item) => {
          const chId = Number(item.routing?.channel_id || 0)
          const meta = item.__routingMeta
          if (chId <= 0) return

          const channelExistsInList =
            options.channels()?.some((ch) => Number(ch.id) === chId) ?? false
          if (meta) meta.channelExists = channelExistsInList

          const channelFromApi = channelMap.get(chId)
          if (channelFromApi) {
            item.routing!.channel_name = channelFromApi.name || item.routing!.channel_name || ''
          } else {
            const channelFromList = options.channels()?.find((ch) => Number(ch.id) === chId)
            item.routing!.channel_name =
              channelFromList?.name || item.routing!.channel_name || String(chId)
          }

          const rawType = String(item.routing?.channel_type || '').trim()
          const pointId = Number(item.routing?.channel_point_id || 0)
          const points = channelFromApi?.points
          const hasPoints = points && typeof points === 'object'

          if (pointId > 0 && !item.routing?.channel_point_name) {
            item.routing!.channel_point_name = String(pointId)
          }

          const allowed = editor.getChannelTypeOptions().map((o) => o.value)
          const parsedType = parseDeviceRoutingTypeStrict(rawType)
          const channelTypeValid = !!parsedType.abbr && allowed.includes(parsedType.abbr)
          if (pointId > 0 && !channelTypeValid) {
            if (meta) {
              meta.pointExists = false
            } else {
              item.__routingMeta = {
                ...item.__routingMeta,
                pointExists: false,
              }
            }
            item.routing!.channel_point_name = String(pointId)
            item.isInvalid = true
            return
          }

          if (!hasPoints || pointId <= 0) {
            if (meta && meta.channelExists === true) meta.pointExists = undefined
            return
          }

          if (!parsedType.abbr) return

          let list: any[] = []
          if (parsedType.abbr === 'T') list = points.telemetry || []
          else if (parsedType.abbr === 'S') list = points.signal || []
          else if (parsedType.abbr === 'C') list = points.control || []
          else if (parsedType.abbr === 'A') list = points.adjustment || []

          const found = (list || []).find((p: any) => Number(p.point_id) === pointId)
          if (found) {
            item.routing!.channel_point_name = found.signal_name || String(pointId)
            if (meta) meta.pointExists = true
          } else {
            item.routing!.channel_point_name = String(pointId)
            if (meta) meta.pointExists = false
            item.isInvalid = true
          }
        })
      } catch (importError) {
        console.error('Failed to fetch channel information:', importError)
      }
    }

    editor.refreshRoutingFieldErrorsForList()

    if (invalidRows > 0) {
      options.notify.warning(`CSV file has ${invalidRows} invalid row(s). Please check the format.`)
    }

    const invalidCount = options.editPoints.value.filter((row) => row.isInvalid).length
    if (invalidCount === 0) {
      options.notify.success('Imported routing successfully')
    } else {
      options.notify.warning(
        `Imported routing, but ${invalidCount} point(s) have errors. Please check the rows marked in red.`,
      )
    }
  }

  return {
    handleRoutingCsvContent,
  }
}
