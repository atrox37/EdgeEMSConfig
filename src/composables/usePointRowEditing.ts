import type { Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'

interface UsePointRowEditingOptions {
  listRef: Ref<PointInfo[]>
  channelProtocol: () => string
  validateRow: (row: PointInfo) => boolean
  refreshFieldErrorsForRow: (row: PointInfo) => void
}

export function usePointRowEditing(options: UsePointRowEditingOptions) {
  const applyDuplicatePointIdInvalid = () => {
    const ids = (options.listRef.value || [])
      .filter((p: any) => (p as any).rowStatus !== 'deleted')
      .map((p: PointInfo) => Number((p as any).point_id))
      .filter((id) => Number.isInteger(id) && id > 0)
    const counts: Record<number, number> = {}
    ids.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1
    })
    ;(options.listRef.value || []).forEach((p: any) => {
      if ((p as any).rowStatus === 'deleted') {
        return
      }
      const id = Number(p.point_id)
      const dup = Number.isInteger(id) && id > 0 && (counts[id] || 0) > 1
      if (dup) {
        p.isInvalid = true
        if (!p.fieldErrors) p.fieldErrors = {}
        p.fieldErrors.point_id = 'duplicate point_id'
      } else {
        if (p.fieldErrors && p.fieldErrors.point_id === 'duplicate point_id') {
          delete p.fieldErrors.point_id
          options.validateRow(p as PointInfo)
          options.refreshFieldErrorsForRow(p)
        }
      }
    })
  }

  const recomputeAllValidity = () => {
    if (!Array.isArray(options.listRef.value)) return
    options.listRef.value.forEach((p) => options.validateRow(p))
    applyDuplicatePointIdInvalid()
  }

  const deletePoint = (item: PointInfo) => {
    const list = options.listRef.value || []
    const originalIndex = list.findIndex((p) => p === item)
    if (originalIndex === -1) return
    list[originalIndex].rowStatus = 'deleted'
  }

  const restorePoint = (item: PointInfo, originalPoints: PointInfo[]) => {
    const list = options.listRef.value || []
    const originalIndex = list.findIndex((p) => p === item)
    if (originalIndex === -1) return

    const original = originalPoints.find((p) => p.point_id === item.point_id)
    if (original) {
      const restoredItem: any = {
        ...original,
        rowStatus: 'normal',
        isEditing: false,
      }
      ;(restoredItem as any).rowKey = (item as any).rowKey
      ;(restoredItem as any).originalPointId = (item as any).originalPointId
      list.splice(originalIndex, 1, restoredItem)
      applyDuplicatePointIdInvalid()
      options.validateRow(restoredItem)
      options.refreshFieldErrorsForRow(restoredItem)
    }
  }

  const updateRowStatus = (item: PointInfo, originalPoints: PointInfo[]) => {
    const isNew = item.rowStatus === 'added'
    const original = originalPoints.find((p) => p.point_id === item.point_id)
    if (!original) return

    const changes: string[] = []
    const normInt = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v))
    const normStr = (v: any) => String(v || '')
    const normBool = (v: any) => (v === true ? 'true' : v === false ? 'false' : String(v))

    const baseFields = ['signal_name', 'scale', 'offset', 'unit', 'reverse']
    baseFields.forEach((field) => {
      const cur = (item as any)[field]
      const orig = (original as any)[field]
      if (field === 'reverse') {
        if (normBool(cur) !== normBool(orig)) changes.push(field)
        return
      }
      if (field === 'signal_name' || field === 'unit') {
        if (normStr(cur) !== normStr(orig)) changes.push(field)
        return
      }
      if (normInt(cur) !== normInt(orig)) changes.push(field)
    })

    if (isNew) {
      item.rowStatus = 'added'
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

  return {
    applyDuplicatePointIdInvalid,
    recomputeAllValidity,
    deletePoint,
    restorePoint,
    updateRowStatus,
  }
}
