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
  /** 根据当前行与原始数据对比，更新 rowStatus、modifiedFields（用于直接编辑模式） */
  const updateRowChangeStatus = (item: PointInfo) => {
    if (item.rowStatus === 'deleted') return

    if (!item.isNewUnconfirmed) {
      const isNew = item.rowStatus === 'added'
      const changes: string[] = []
      const originalList = options.originalPointsList.value as PointInfo[]

      if (isNew) {
        const defaults = { signal_name: '', scale: 1, offset: 0, unit: '', reverse: false }
        if (item.signal_name !== defaults.signal_name) changes.push('signal_name')
        if (item.scale !== defaults.scale) changes.push('scale')
        if (item.offset !== defaults.offset) changes.push('offset')
        if (item.unit !== defaults.unit) changes.push('unit')
        if (item.reverse !== defaults.reverse) changes.push('reverse')
        if (changes.length > 0) item.modifiedFields = changes
      } else {
        const origId = (item as any).originalPointId ?? item.point_id
        const original = originalList.find((p) => p.point_id === origId)
        if (item.point_id !== origId) {
          const existsInOriginal = originalList.some((p) => p.point_id === item.point_id)
          if (!existsInOriginal) {
            item.rowStatus = 'added'
            item.modifiedFields = []
          } else if (original) {
            if (item.signal_name !== original.signal_name) changes.push('signal_name')
            if (item.scale !== original.scale) changes.push('scale')
            if (item.offset !== original.offset) changes.push('offset')
            if (item.unit !== original.unit) changes.push('unit')
            if (item.reverse !== original.reverse) changes.push('reverse')
            item.rowStatus = changes.length > 0 ? 'modified' : 'normal'
            item.modifiedFields = changes
          }
        } else if (original) {
          if (item.signal_name !== original.signal_name) changes.push('signal_name')
          if (item.scale !== original.scale) changes.push('scale')
          if (item.offset !== original.offset) changes.push('offset')
          if (item.unit !== original.unit) changes.push('unit')
          if (item.reverse !== original.reverse) changes.push('reverse')
          item.rowStatus = changes.length > 0 ? 'modified' : 'normal'
          item.modifiedFields = changes
        }
      }
    }

    options.validateRowValidity(item)
    options.applyDuplicatePointIdInvalid()
    options.refreshFieldErrorsForRow(item)
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
    }
    options.signalNameFilter.value = ''
    options.showSignalNameFilter.value = false
  }

  return {
    updateRowChangeStatus,
    handleCancelInlineEdit,
  }
}
