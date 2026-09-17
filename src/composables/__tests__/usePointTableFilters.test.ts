import { afterEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePointTableFilters } from '@/composables/usePointTableFilters'
import { destroyComposableMount, mountComposable } from './composableTestUtils'

interface TestRow {
  signal_name: string
  rowStatus?: string
  isInvalid?: boolean
}

const cleanups: Array<() => void> = []

async function mountFilters(options: Parameters<typeof usePointTableFilters<TestRow>>[0]) {
  const mounted = await mountComposable(() => usePointTableFilters(options))
  cleanups.push(() => destroyComposableMount(mounted.wrapper, mounted.scope))
  return mounted.result
}

describe('usePointTableFilters', () => {
  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.()
  })

  it('filters rows by signal name keyword', async () => {
    const listRef = ref<TestRow[]>([
      { signal_name: 'Voltage-A', rowStatus: 'normal' },
      { signal_name: 'Current-B', rowStatus: 'normal' },
    ])

    const filters = await mountFilters({
      listRef,
      getSignalName: (item) => item.signal_name,
      getEditFilters: () => [],
    })

    filters.signalNameFilter.value = 'volt'
    expect(filters.filteredPoints.value).toHaveLength(1)
    expect(filters.filteredPoints.value[0].signal_name).toBe('Voltage-A')
  })

  it('filters invalid rows and can exclude deleted rows', async () => {
    const listRef = ref<TestRow[]>([
      { signal_name: 'Valid', rowStatus: 'normal', isInvalid: false },
      { signal_name: 'Bad', rowStatus: 'modified', isInvalid: true },
      { signal_name: 'Deleted', rowStatus: 'deleted', isInvalid: true },
    ])

    const filters = await mountFilters({
      listRef,
      getSignalName: (item) => item.signal_name,
      getEditFilters: () => ['invalid'],
      invalidExcludesDeleted: true,
    })

    expect(filters.filteredPoints.value.map((row) => row.signal_name)).toEqual(['Bad'])
  })

  it('filters rows by row status from edit filters', async () => {
    const listRef = ref<TestRow[]>([
      { signal_name: 'A', rowStatus: 'added' },
      { signal_name: 'B', rowStatus: 'modified' },
    ])

    const filters = await mountFilters({
      listRef,
      getSignalName: (item) => item.signal_name,
      getEditFilters: () => ['added'],
    })

    expect(filters.filteredPoints.value).toHaveLength(1)
    expect(filters.filteredPoints.value[0].signal_name).toBe('A')
  })

  it('resets pagination when filters change', async () => {
    const listRef = ref<TestRow[]>([
      { signal_name: 'Row-1', rowStatus: 'normal' },
      { signal_name: 'Row-2', rowStatus: 'normal' },
    ])

    const filters = await mountFilters({
      listRef,
      getSignalName: (item) => item.signal_name,
      getEditFilters: () => [],
      debounceMs: 0,
    })

    filters.pageSize.value = 1
    filters.currentPage.value = 2
    filters.signalNameFilter.value = 'Row-1'

    await Promise.resolve()

    expect(filters.currentPage.value).toBe(1)
    expect(filters.total.value).toBe(1)
  })
})
