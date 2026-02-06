import type { ComputedRef, Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'

interface UsePointInlineEditingOptions {
  editPoints: Ref<PointInfo[]>
  originalPointsList: ComputedRef<PointInfo[]>
  pendingNewRow: Ref<PointInfo | null>
  signalNameFilter: Ref<string>
  showSignalNameFilter: Ref<boolean>
  validateRowValidity: (row: PointInfo) => boolean
  applyDuplicatePointIdInvalid: () => void
  recomputeAllValidity: () => void
  refreshFieldErrorsForRow: (row: PointInfo) => void
  createRowKey?: () => string
}

export function usePointInlineEditing(options: UsePointInlineEditingOptions) {
  const handleStartInlineEdit = (item: PointInfo) => {
    item.originalData = {
      point_id: item.point_id,
      signal_name: item.signal_name,
      scale: item.scale,
      offset: item.offset,
      unit: item.unit,
      reverse: item.reverse,
    }
    item.isEditing = true
    ;(item as any).hideErrorsOnce = true
  }

  const handleCancelInlineEdit = (item: PointInfo) => {
    if (item.isNewUnconfirmed) {
      const itemRowKey = (item as any).rowKey
      const idx = options.editPoints.value.findIndex((p: any) => (p as any).rowKey === itemRowKey)
      if (idx !== -1) options.editPoints.value.splice(idx, 1)
      if (options.pendingNewRow.value && (options.pendingNewRow.value as any).rowKey === itemRowKey) {
        options.pendingNewRow.value = null
      }
      options.recomputeAllValidity()
    } else {
      if (item.originalData) {
        Object.assign(item, item.originalData)
        delete item.originalData
      }
      item.isEditing = false
      options.recomputeAllValidity()
    }
    options.signalNameFilter.value = ''
    options.showSignalNameFilter.value = false
  }

  const handleConfirmInlineEdit = (item: PointInfo) => {
    if (item.isNewUnconfirmed) {
      item.isNewUnconfirmed = false
      item.rowStatus = 'added'
      item.isEditing = false
      delete item.originalData
      options.pendingNewRow.value = null
      options.validateRowValidity(item)
      options.applyDuplicatePointIdInvalid()
      options.refreshFieldErrorsForRow(item)
      ;(item as any).hideErrorsOnce = false
      return
    }

    const isNew = item.rowStatus === 'added'
    const changes: string[] = []

    if (isNew) {
      if (item.originalData) {
        if (item.signal_name !== item.originalData.signal_name) changes.push('signal_name')
        if (item.scale !== item.originalData.scale) changes.push('scale')
        if (item.offset !== item.originalData.offset) changes.push('offset')
        if (item.unit !== item.originalData.unit) changes.push('unit')
        if (item.reverse !== item.originalData.reverse) changes.push('reverse')
      }
      if (changes.length > 0) {
        item.modifiedFields = changes
      }
    } else {
      const origId = (item as any).originalPointId
      if (origId !== undefined && item.point_id !== origId) {
        const existsInOriginal = (options.originalPointsList.value as PointInfo[]).some(
          (p) => p.point_id === item.point_id,
        )
        if (!existsInOriginal) {
          item.rowStatus = 'added'
          item.modifiedFields = []
        } else {
          const original = (options.originalPointsList.value as PointInfo[]).find(
            (p) => p.point_id === origId,
          )
          const prev = item.originalData || {}
          if (original) {
            if (
              item.signal_name !== original.signal_name &&
              item.signal_name !== (prev as any).signal_name
            )
              changes.push('signal_name')
            if (item.scale !== original.scale && item.scale !== (prev as any).scale)
              changes.push('scale')
            if (item.offset !== original.offset && item.offset !== (prev as any).offset)
              changes.push('offset')
            if (item.unit !== original.unit && item.unit !== (prev as any).unit)
              changes.push('unit')
            if (item.reverse !== original.reverse && item.reverse !== (prev as any).reverse)
              changes.push('reverse')
          }
          if (changes.length > 0) {
            item.rowStatus = 'modified'
            item.modifiedFields = changes
          } else {
            item.rowStatus = 'normal'
            item.modifiedFields = []
          }
        }
      } else {
        const original = (options.originalPointsList.value as PointInfo[]).find(
          (p) => p.point_id === (item.originalData?.point_id || item.point_id),
        )
        const prev = item.originalData || {}
        if (original) {
          if (
            item.signal_name !== original.signal_name &&
            item.signal_name !== (prev as any).signal_name
          )
            changes.push('signal_name')
          if (item.scale !== original.scale && item.scale !== (prev as any).scale)
            changes.push('scale')
          if (item.offset !== original.offset && item.offset !== (prev as any).offset)
            changes.push('offset')
          if (item.unit !== original.unit && item.unit !== (prev as any).unit) changes.push('unit')
          if (item.reverse !== original.reverse && item.reverse !== (prev as any).reverse)
            changes.push('reverse')
        }
        if (changes.length > 0) {
          item.rowStatus = 'modified'
          item.modifiedFields = changes
        } else {
          item.rowStatus = 'normal'
          item.modifiedFields = []
        }
      }
    }

    options.validateRowValidity(item)
    options.applyDuplicatePointIdInvalid()
    options.refreshFieldErrorsForRow(item)
    item.isEditing = false
    delete item.originalData
    ;(item as any).hideErrorsOnce = false
  }

  return {
    handleStartInlineEdit,
    handleCancelInlineEdit,
    handleConfirmInlineEdit,
  }
}
