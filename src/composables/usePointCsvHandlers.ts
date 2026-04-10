import type { ComputedRef, Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'
import { getPointCsvSchema } from '@/schemas/channelProtocols'
import { parseCsvRows } from '@/utils/csvSchema'

interface UsePointCsvHandlersOptions {
  pointType: () => 'T' | 'S' | 'C' | 'A'
  channelProtocol: () => string
  editPoints: Ref<PointInfo[]>
  originalPointsList: ComputedRef<PointInfo[]>
  createRowKey: () => string
  setImportedFileName: (name: string) => void
  enterEditMode: (payload: { fromImport: boolean }) => void
  refreshFieldErrorsForList: () => void
  recomputeAllValidity: () => void
  notify: {
    success: (msg: string) => void
    warning: (msg: string) => void
    error: (msg: string) => void
  }
}

export function usePointCsvHandlers(options: UsePointCsvHandlersOptions) {
  const handlePointsCsvContent = (content: string, file: File) => {
    const schema = getPointCsvSchema(options.pointType(), options.channelProtocol())
    const parsed = parseCsvRows(schema, content)
    if (parsed.error) {
      options.notify.error(parsed.error)
      return
    }
    if (!parsed.rows.length) {
      options.notify.warning('No data to import')
      return
    }

    const importedPoints: PointInfo[] = []
    const isCan = options.channelProtocol() === 'can'
    const isCanTelemetry = isCan && options.pointType() === 'T'
    const isSignalOrControl =
      !isCan &&
      (options.pointType() === 'S' ||
        options.pointType() === 'C' ||
        options.channelProtocol() === 'di_do')

    for (const row of parsed.rows) {
      const pointIdStr = String((row as any).point_id || '')
      const signalName = String((row as any).point_name || '')
      const reverseStr = String((row as any).reverse || '')
      let scaleStr: string
      let offsetStr: string
      let unit: string

      if (isCan) {
        // CAN Telemetry 有 scale/offset/unit；Signal 无
        scaleStr = isCanTelemetry ? String((row as any).scale || '') : ''
        offsetStr = isCanTelemetry ? String((row as any).offset || '') : ''
        unit = isCanTelemetry ? String((row as any).unit || '') : ''
      } else if (isSignalOrControl) {
        scaleStr = ''
        offsetStr = ''
        unit = ''
      } else {
        scaleStr = String((row as any).scale || '')
        offsetStr = String((row as any).offset || '')
        unit = String((row as any).unit || '')
      }

      const pointId = Number(pointIdStr) || 0
      const needsScaleOffset = !isSignalOrControl && (!isCan || isCanTelemetry)
      const scale = needsScaleOffset ? (scaleStr ? Number(scaleStr) : 1) : 1
      const offset = needsScaleOffset ? (offsetStr ? Number(offsetStr) : 0) : 0

      let reverse = false
      if (!isCan && reverseStr) {
        const lowerReverse = reverseStr.toLowerCase()
        if (lowerReverse === 'true' || lowerReverse === '1') {
          reverse = true
        } else if (lowerReverse === 'false' || lowerReverse === '0') {
          reverse = false
        }
      }

      const point: PointInfo = {
        point_id: pointId,
        signal_name: signalName || '',
        scale,
        offset,
        unit: unit || '',
        data_type: 'float',
        reverse,
        description: '',
        rowStatus: 'added',
        isEditing: false,
      }

      ;(point as any).isImported = true
      ;(point as any).rowKey = options.createRowKey()
      ;(point as any).originalPointId = undefined
      ;(point as any).hideErrorsOnce = false

      importedPoints.push(point)
    }

    options.setImportedFileName(file.name)
    options.enterEditMode({ fromImport: true })

    const originalPointIds = new Set(
      (options.originalPointsList.value || [])
        .map((p) => Number(p.point_id))
        .filter((id) => id > 0),
    )
    const importedPointIds = new Set(
      importedPoints
        .map((p) => Number(p.point_id))
        .filter((id) => Number.isInteger(id) && id > 0),
    )

    const deletedPointIds = new Set<number>()
    originalPointIds.forEach((id) => {
      if (!importedPointIds.has(id)) {
        deletedPointIds.add(id)
      }
    })

    const deletedPoints: PointInfo[] = []
    if (deletedPointIds.size > 0) {
      const originalPointsMap = new Map(
        (options.originalPointsList.value || []).map((p) => [Number(p.point_id), p]),
      )
      deletedPointIds.forEach((pointId) => {
        const originalPoint = originalPointsMap.get(pointId)
        if (originalPoint) {
          const deletedPoint: PointInfo = {
            ...originalPoint,
            rowStatus: 'deleted',
            isEditing: false,
          }
          ;(deletedPoint as any).rowKey = options.createRowKey()
          ;(deletedPoint as any).originalPointId = originalPoint.point_id
          deletedPoints.push(deletedPoint)
        }
      })
    }

    options.editPoints.value = [...importedPoints, ...deletedPoints]
    options.refreshFieldErrorsForList()
    options.recomputeAllValidity()
    options.refreshFieldErrorsForList()
    options.notify.success(`Successfully imported ${importedPoints.length} points`)
  }

  return {
    handlePointsCsvContent,
  }
}
