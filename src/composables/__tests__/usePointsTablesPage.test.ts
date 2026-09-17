import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { usePointsTablesPage } from '@/composables/usePointsTablesPage'
import { destroyComposableMount, mountComposable } from './composableTestUtils'

const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: confirmMock,
  },
}))

const cleanups: Array<() => void> = []

async function createPage(overrides: Partial<Parameters<typeof usePointsTablesPage>[0]> = {}) {
  const activeTab = ref('telemetry')
  const resetPublishForTab = vi.fn()
  const resetPublishAll = vi.fn()
  const resolvePublishDirtyForTab = vi.fn(() => false)
  const onTabChanged = vi.fn()

  const mounted = await mountComposable(() =>
    usePointsTablesPage({
      secondaryViewCommand: 'mappings',
      secondaryViewMode: 'mappings',
      activeTab,
      resetPublishForTab,
      resetPublishAll,
      resolvePublishDirtyForTab,
      onTabChanged,
      ...overrides,
    }),
  )

  cleanups.push(() => destroyComposableMount(mounted.wrapper, mounted.scope))

  return {
    page: mounted.result,
    activeTab,
    resetPublishForTab,
    resetPublishAll,
    resolvePublishDirtyForTab,
    onTabChanged,
  }
}

describe('usePointsTablesPage', () => {
  beforeEach(() => {
    confirmMock.mockReset()
  })

  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.()
  })

  it('defaults to points view mode', async () => {
    const { page } = await createPage()
    expect(page.viewMode.value).toBe('points')
    expect(page.viewModeSwitch.value).toBe(false)
  })

  it('switches view mode via dropdown command', async () => {
    const { page } = await createPage()
    page.handleDropdownCommand('mappings')
    expect(page.viewMode.value).toBe('mappings')
    page.handleDropdownCommand('points')
    expect(page.viewMode.value).toBe('points')
  })

  it('keeps only the latest status checkbox selection', async () => {
    const { page } = await createPage()
    page.handleStatusCheckboxChange(['added', 'modified'])
    await flushPromises()
    expect(page.statusCheckboxValue.value).toEqual(['modified'])
    expect(page.editFilters.value).toEqual(['modified'])
  })

  it('maps invalid checkbox to invalid edit filter', async () => {
    const { page } = await createPage()
    page.invalidChecked.value = true
    await flushPromises()
    expect(page.editFilters.value).toEqual(['invalid'])
  })

  it('resets status filters when view mode changes', async () => {
    const { page } = await createPage()
    page.statusCheckboxValue.value = ['added']
    page.invalidChecked.value = true
    page.handleViewModeChange()
    expect(page.editFilters.value).toEqual([])
    expect(page.statusCheckboxValue.value).toEqual([])
    expect(page.invalidChecked.value).toBe(false)
  })

  it('enters publish mode and resets publish state for active tab', async () => {
    const { page, resetPublishForTab, activeTab } = await createPage()
    activeTab.value = 'signal'
    await page.togglePublishMode()
    expect(page.isPublish.value).toBe(true)
    expect(page.publishDirty.value).toBe(false)
    expect(resetPublishForTab).toHaveBeenCalledWith('signal')
  })

  it('syncs publishDirty on tab change while publishing', async () => {
    const { page, resolvePublishDirtyForTab, onTabChanged } = await createPage()
    page.isPublish.value = true
    resolvePublishDirtyForTab.mockReturnValue(true)

    page.handleTabChange('control')

    expect(resolvePublishDirtyForTab).toHaveBeenCalledWith('control')
    expect(page.publishDirty.value).toBe(true)
    expect(onTabChanged).toHaveBeenCalled()
  })

  it('allows tab leave when not publishing', async () => {
    const { page } = await createPage()
    await expect(page.handleBeforeLeave('signal', 'telemetry')).resolves.toBe(true)
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('blocks tab leave when publish is dirty and user cancels', async () => {
    const { page } = await createPage()
    page.isPublish.value = true
    page.publishDirty.value = true
    confirmMock.mockRejectedValueOnce(new Error('cancel'))

    await expect(page.handleBeforeLeave('signal', 'telemetry')).resolves.toBe(false)
  })

  it('allows tab leave after confirming publish discard', async () => {
    const { page, resetPublishForTab, activeTab } = await createPage()
    activeTab.value = 'telemetry'
    page.isPublish.value = true
    page.publishDirty.value = true
    confirmMock.mockResolvedValueOnce(undefined)

    await expect(page.handleBeforeLeave('signal', 'telemetry')).resolves.toBe(true)
    expect(resetPublishForTab).toHaveBeenCalledWith('telemetry')
    expect(page.isPublish.value).toBe(false)
    expect(page.publishDirty.value).toBe(false)
  })

  it('calls performCancelEdit immediately when there are no changes', async () => {
    const { page } = await createPage()
    const performCancelEdit = vi.fn()
    await page.handleCancelEdit(() => false, performCancelEdit)
    expect(performCancelEdit).toHaveBeenCalledTimes(1)
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('asks for confirmation before cancel edit when there are changes', async () => {
    const { page } = await createPage()
    const performCancelEdit = vi.fn()
    confirmMock.mockResolvedValueOnce(undefined)

    await page.handleCancelEdit(() => true, performCancelEdit)

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(performCancelEdit).toHaveBeenCalledTimes(1)
  })

  it('resetPublishState clears publish flags and calls resetPublishAll', async () => {
    const { page, resetPublishAll } = await createPage()
    page.isPublish.value = true
    page.publishDirty.value = true
    page.resetPublishState()
    expect(page.isPublish.value).toBe(false)
    expect(page.publishDirty.value).toBe(false)
    expect(resetPublishAll).toHaveBeenCalledTimes(1)
  })
})
