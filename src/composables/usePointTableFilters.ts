import { computed, watch, type Ref } from 'vue'
import { usePointTableBase } from '@/composables/usePointTableBase'

export interface UsePointTableFiltersOptions<T> {
  listRef: Ref<T[]>
  getSignalName: (item: T) => string
  getEditFilters?: () => string[]
  /** 在 signal / status 筛选前处理列表（如导入后隐藏 deleted 行） */
  applyListFilters?: (list: T[]) => T[]
  /** invalid 筛选时排除 deleted 行（Channel Points 专用） */
  invalidExcludesDeleted?: boolean
  debounceMs?: number
}

function defaultIsInvalid(item: unknown): boolean {
  return (item as { isInvalid?: boolean }).isInvalid === true
}

function defaultRowStatus(item: unknown): string {
  return (item as { rowStatus?: string }).rowStatus || 'normal'
}

export function usePointTableFilters<T>(options: UsePointTableFiltersOptions<T>) {
  let filteredPoints = computed<T[]>(() => [])

  const table = usePointTableBase<T>({
    listRef: options.listRef,
    getSignalName: options.getSignalName,
    getFiltered: () => filteredPoints.value,
    debounceMs: options.debounceMs,
  })

  filteredPoints = computed(() => {
    const list = Array.isArray(options.listRef.value) ? options.listRef.value : []
    let result = options.applyListFilters ? options.applyListFilters([...list]) : [...list]

    if (table.signalNameFilter.value) {
      const kw = String(table.signalNameFilter.value || '').toLowerCase()
      result = result.filter((item) =>
        String(options.getSignalName(item) || '')
          .toLowerCase()
          .includes(kw),
      )
    }

    const editFilters = options.getEditFilters?.() ?? []
    if (editFilters.length > 0) {
      const filterValue = editFilters[0]
      if (filterValue === 'invalid') {
        result = result.filter((item) => {
          if (options.invalidExcludesDeleted && defaultRowStatus(item) === 'deleted') {
            return false
          }
          return defaultIsInvalid(item)
        })
      } else {
        result = result.filter((item) => defaultRowStatus(item) === filterValue)
      }
    }

    return result
  })

  watch([table.signalNameFilter, () => options.getEditFilters?.()], () => {
    table.currentPage.value = 1
  })

  const total = computed(() => filteredPoints.value.length)

  return {
    ...table,
    filteredPoints,
    total,
  }
}
