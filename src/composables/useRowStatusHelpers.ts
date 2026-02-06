import type { Ref } from 'vue'

interface UseRowStatusHelpersOptions<T> {
  listRef: Ref<T[]>
  isEditing: () => boolean
  getBaseRowClass: (row: T) => string
  getModifiedFields?: (row: T) => string[] | undefined
  getRowStatus?: (row: T) => string | undefined
}

export function useRowStatusHelpers<T>(options: UseRowStatusHelpersOptions<T>) {
  const getRowStatus = options.getRowStatus || ((row: any) => row.rowStatus as string)
  const getModifiedFields =
    options.getModifiedFields || ((row: any) => row.modifiedFields as string[] | undefined)

  const getRowClass = ({ row }: { row: T }) => {
    const baseClass = options.getBaseRowClass(row)
    const classes = [baseClass]
    if (options.isEditing() && (row as any).isInvalid) {
      classes.push('row-invalid')
    }
    return classes.join(' ')
  }

  const getFieldClass = (item: T, fieldName: string) => {
    const status = getRowStatus(item)
    if (status === 'added') return 'field-added'
    if (status === 'modified' && getModifiedFields(item)?.includes(fieldName)) return 'field-modified'
    if (status === 'deleted') return 'field-deleted'
    return ''
  }

  const hasChanges = () => {
    const list = options.listRef.value || []
    return list.some((p: any) =>
      p && (p.rowStatus === 'modified' || p.rowStatus === 'added' || p.rowStatus === 'deleted'),
    )
  }

  return {
    getRowClass,
    getFieldClass,
    hasChanges,
  }
}
