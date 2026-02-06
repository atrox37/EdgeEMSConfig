import { ref, computed, watch, type ComputedRef, type Ref } from 'vue'

interface UsePointTableBaseOptions<T> {
  listRef: Ref<T[]>
  filteredRef?: ComputedRef<T[]>
  getFiltered?: () => T[]
  getSignalName: (item: T) => string
  resetDeps?: Array<() => unknown> | Array<Ref<unknown>>
  debounceMs?: number
}

export function usePointTableBase<T>(options: UsePointTableBaseOptions<T>) {
  const signalNameFilterRaw = ref('')
  const signalNameFilter = ref('')
  const signalNameOptions = computed(() => {
    const names = (options.listRef.value || [])
      .map((p) => options.getSignalName(p))
      .filter((n) => n)
    return Array.from(new Set(names))
  })

  let _snfTimer: any = null
  watch(
    () => signalNameFilterRaw.value,
    (v) => {
      if (_snfTimer) clearTimeout(_snfTimer)
      _snfTimer = setTimeout(() => {
        signalNameFilter.value = String(v || '')
      }, options.debounceMs ?? 300)
    },
    { immediate: true },
  )

  const currentPage = ref(1)
  const pageSize = ref(20)
  const getFiltered = () =>
    options.getFiltered ? options.getFiltered() : options.filteredRef?.value || []
  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return getFiltered().slice(start, end)
  })

  if (options.resetDeps && options.resetDeps.length > 0) {
    watch(options.resetDeps as any, () => {
      currentPage.value = 1
    })
  }

  return {
    signalNameFilterRaw,
    signalNameFilter,
    signalNameOptions,
    currentPage,
    pageSize,
    paginatedData,
  }
}
