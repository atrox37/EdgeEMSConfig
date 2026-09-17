import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  CHANNEL_TAB_NAMES,
  useChannelPointsTablesHost,
  type ChannelTabName,
} from '@/composables/useChannelPointsTablesHost'
import { destroyComposableMount, mountComposable } from './composableTestUtils'

const { confirmMock, elMessage, getPointsTablesMock, postPointsBatchMock, batchUpdateMappingPointMock } =
  vi.hoisted(() => ({
    confirmMock: vi.fn(),
    elMessage: {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    },
    getPointsTablesMock: vi.fn(),
    postPointsBatchMock: vi.fn(),
    batchUpdateMappingPointMock: vi.fn(),
  }))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
  ElMessageBox: {
    confirm: confirmMock,
  },
}))

vi.mock('@/api/channelsManagement', () => ({
  getChannelDetail: vi.fn(),
  getPointsTables: getPointsTablesMock,
  postPointsBatch: postPointsBatchMock,
  batchUpdateMappingPoint: batchUpdateMappingPointMock,
  publishPointValue: vi.fn(),
}))

vi.mock('@/utils/websocket', () => ({
  default: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}))

function createTabInstance(overrides: Record<string, unknown> = {}) {
  return {
    hasChanges: vi.fn(() => false),
    hasInvalid: vi.fn(() => false),
    getEditedData: vi.fn(() => []),
    hasPublishChanges: vi.fn(() => false),
    getPublishCommands: vi.fn(() => []),
    resetPublish: vi.fn(),
    clearSignalNameFilter: vi.fn(),
    clearImportedFileName: vi.fn(),
    ...overrides,
  }
}

function createChannelTabsRef(tabOverrides: Partial<Record<ChannelTabName, Record<string, unknown>>> = {}) {
  const instances = Object.fromEntries(
    CHANNEL_TAB_NAMES.map((tab) => [tab, createTabInstance(tabOverrides[tab])]),
  ) as Record<ChannelTabName, ReturnType<typeof createTabInstance>>

  return ref({
    getTableInstance: (tab: ChannelTabName) => instances[tab],
    resetPublishForTab: vi.fn(),
    forEachTableInstance: (fn: (instance: unknown, tab: ChannelTabName) => void) => {
      CHANNEL_TAB_NAMES.forEach((tab) => fn(instances[tab], tab))
    },
    applyRealtimeValues: vi.fn(),
    scrollActiveTabToTop: vi.fn(),
  })
}

const samplePointsData = {
  telemetry: [{ point_id: 1, signal_name: 'T1' }],
  signal: [],
  control: [],
  adjustment: [],
}

async function mountHost(options: {
  restorePointsOnCancelEdit?: boolean
  tabOverrides?: Partial<Record<ChannelTabName, Record<string, unknown>>>
} = {}) {
  const channelTabsRef = createChannelTabsRef(options.tabOverrides)
  const mounted = await mountComposable(() =>
    useChannelPointsTablesHost({
      channelTabsRef,
      restorePointsOnCancelEdit: options.restorePointsOnCancelEdit ?? false,
    }),
  )
  return { ...mounted, channelTabsRef }
}

describe('useChannelPointsTablesHost', () => {
  beforeEach(() => {
    confirmMock.mockReset()
    elMessage.info.mockReset()
    elMessage.success.mockReset()
    getPointsTablesMock.mockReset()
    postPointsBatchMock.mockReset()
    batchUpdateMappingPointMock.mockReset()
    getPointsTablesMock.mockResolvedValue({ success: true, data: samplePointsData })
  })

  it('enters edit mode and clears imported file names unless from import', async () => {
    const clearImportedFileName = vi.fn()
    const { result, wrapper, scope, channelTabsRef } = await mountHost({
      tabOverrides: {
        telemetry: { clearImportedFileName },
      },
    })

    result.handleEdit()
    expect(result.isEditing.value).toBe(true)
    expect(clearImportedFileName).toHaveBeenCalledTimes(1)

    clearImportedFileName.mockClear()
    result.handleEdit({ fromImport: true })
    expect(clearImportedFileName).not.toHaveBeenCalled()

    destroyComposableMount(wrapper, scope)
    void channelTabsRef
  })

  it('restores points baseline on cancel when restorePointsOnCancelEdit is enabled', async () => {
    const { result, wrapper, scope } = await mountHost({ restorePointsOnCancelEdit: true })

    result.pointsData.value = {
      telemetry: [{ point_id: 99, signal_name: 'edited' }],
      signal: [],
      control: [],
      adjustment: [],
    } as unknown as typeof result.pointsData.value
    result.originalPointsData.value = samplePointsData as unknown as typeof result.originalPointsData.value
    result.isEditing.value = true

    result.performDiscardEdit()

    expect(result.isEditing.value).toBe(false)
    expect(result.pointsData.value).toEqual(samplePointsData)

    destroyComposableMount(wrapper, scope)
  })

  it('does not restore points on cancel when restorePointsOnCancelEdit is disabled', async () => {
    const { result, wrapper, scope } = await mountHost({ restorePointsOnCancelEdit: false })
    const edited = {
      telemetry: [{ point_id: 99, signal_name: 'edited' }],
      signal: [],
      control: [],
      adjustment: [],
    } as unknown as typeof result.pointsData.value

    result.pointsData.value = edited
    result.originalPointsData.value = samplePointsData as unknown as typeof result.originalPointsData.value
    result.isEditing.value = true

    result.performDiscardEdit()

    expect(result.isEditing.value).toBe(false)
    expect(result.pointsData.value).toEqual(edited)

    destroyComposableMount(wrapper, scope)
  })

  it('shows info when submitting points with no changes', async () => {
    const { result, wrapper, scope } = await mountHost()

    await result.handleSubmit()

    expect(elMessage.info).toHaveBeenCalledWith('No point changes to submit')
    expect(postPointsBatchMock).not.toHaveBeenCalled()

    destroyComposableMount(wrapper, scope)
  })

  it('submits point batch payload when edited rows exist', async () => {
    postPointsBatchMock.mockResolvedValueOnce({ success: true })
    const { result, wrapper, scope } = await mountHost({
      tabOverrides: {
        telemetry: {
          getEditedData: vi.fn(() => [
            {
              point_id: 10,
              rowStatus: 'modified',
              modifiedFields: ['signal_name'],
              signal_name: 'Updated',
            },
          ]),
        },
      },
    })

    await result.handleSubmit()

    expect(postPointsBatchMock).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        update: [
          expect.objectContaining({
            point_id: 10,
            point_type: 'T',
            data: { signal_name: 'Updated' },
          }),
        ],
      }),
    )
    expect(result.isEditing.value).toBe(false)
    expect(elMessage.success).toHaveBeenCalledWith('Points updated successfully')

    destroyComposableMount(wrapper, scope)
  })

  it('loads channel context and refreshes baseline', async () => {
    const { result, wrapper, scope } = await mountHost()

    await result.loadChannelContext({
      id: 42,
      name: 'Channel-A',
      protocol: 'di_do',
    })

    expect(result.channelId.value).toBe(42)
    expect(result.channelName.value).toBe('Channel-A')
    expect(result.channelProtocol.value).toBe('di_do')
    expect(result.activeTab.value).toBe('signal')
    expect(getPointsTablesMock).toHaveBeenCalledWith(42)
    expect(result.pointsData.value).toEqual(samplePointsData)

    destroyComposableMount(wrapper, scope)
  })

  it('resetHostState clears edit and publish UI state', async () => {
    const { result, wrapper, scope } = await mountHost()

    result.isEditing.value = true
    result.isPublish.value = true
    result.publishDirty.value = true
    result.viewModeSwitch.value = true
    result.statusCheckboxValue.value = ['added']

    result.resetHostState()

    expect(result.isEditing.value).toBe(false)
    expect(result.isPublish.value).toBe(false)
    expect(result.publishDirty.value).toBe(false)
    expect(result.viewModeSwitch.value).toBe(false)
    expect(result.statusCheckboxValue.value).toEqual([])

    destroyComposableMount(wrapper, scope)
  })
})
