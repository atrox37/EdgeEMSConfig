import { ref, type Ref } from 'vue'
import type { PointInfo } from '@/types/channelConfiguration'

interface PointColumnLike {
  key: string
  min?: number
  max?: number
  precision?: number
  onInput?: (row: PointInfo) => void
  onChange?: (row: PointInfo) => void
}

export function usePointNumericCellInput(editPoints: Ref<PointInfo[]>) {
  const numericInputDraft = ref<Record<string, string>>({})

  const getCellDraftKey = (row: PointInfo, col: PointColumnLike) =>
    `${String((row as { rowKey?: string }).rowKey ?? row.point_id)}::${String(col.key)}`

  const isNumericColumn = (col: PointColumnLike) =>
    col.min !== undefined || col.max !== undefined || col.precision !== undefined

  const getCellInputValue = (row: PointInfo, col: PointColumnLike) => {
    if (isNumericColumn(col)) {
      const key = getCellDraftKey(row, col)
      if (Object.prototype.hasOwnProperty.call(numericInputDraft.value, key)) {
        return numericInputDraft.value[key]
      }
    }
    const raw = (row as unknown as Record<string, unknown>)[col.key]
    return typeof raw === 'number' ? String(raw) : String(raw ?? '')
  }

  const handleNumberOrTextInput = (row: PointInfo, col: PointColumnLike, val: string) => {
    const rowRecord = row as unknown as Record<string, unknown>
    if (isNumericColumn(col)) {
      const allowDecimal = col.precision !== undefined && col.precision > 0
      const draftKey = getCellDraftKey(row, col)
      let sanitized = String(val ?? '').replace(/[^\d.-]/g, '')
      sanitized = sanitized.replace(/(?!^)-/g, '')
      const firstDot = sanitized.indexOf('.')
      if (firstDot >= 0) {
        sanitized =
          sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '')
      }
      numericInputDraft.value[draftKey] = sanitized
      if (sanitized === '' || sanitized === '-') {
        rowRecord[col.key] = undefined
      } else {
        const parsed = allowDecimal ? parseFloat(sanitized) : parseInt(sanitized, 10)
        if (!isNaN(parsed)) {
          let v = parsed
          if (col.min !== undefined && v < col.min) v = col.min
          if (col.max !== undefined && v > col.max) v = col.max
          rowRecord[col.key] = v
        }
      }
    } else {
      rowRecord[col.key] = val
    }
    ;(col.onInput || col.onChange)?.(row)
  }

  const handleNumberOrTextBlur = (row: PointInfo, col: PointColumnLike) => {
    if (!isNumericColumn(col)) return
    const rowRecord = row as unknown as Record<string, unknown>
    const draftKey = getCellDraftKey(row, col)
    const draft = numericInputDraft.value[draftKey]
    if (typeof draft !== 'string') return
    if (draft === '' || draft === '-' || draft === '.' || draft === '-.') {
      rowRecord[col.key] = undefined
    } else {
      const allowDecimal = col.precision !== undefined && col.precision > 0
      const parsed = allowDecimal ? parseFloat(draft) : parseInt(draft, 10)
      if (!isNaN(parsed)) {
        let v = parsed
        if (col.min !== undefined && v < col.min) v = col.min
        if (col.max !== undefined && v > col.max) v = col.max
        rowRecord[col.key] = v
      }
    }
    delete numericInputDraft.value[draftKey]
    ;(col.onInput || col.onChange)?.(row)
  }

  void editPoints

  return {
    getCellInputValue,
    handleNumberOrTextInput,
    handleNumberOrTextBlur,
  }
}
