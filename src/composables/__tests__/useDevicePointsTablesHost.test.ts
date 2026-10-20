import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import wsManager from '@/utils/websocket'
import { useDevicePointsTablesHost } from '@/composables/useDevicePointsTablesHost'
import { destroyComposableMount, mountComposable } from './composableTestUtils'

const { confirmMock, elMessage, getInstancePointsMock, updateInstanceRoutingMock, getAllChannelsMock } =
  vi.hoisted(() => ({
    confirmMock: vi.fn(),
    elMessage: {
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
    getInstancePointsMock: vi.fn(),
    updateInstanceRoutingMock: vi.fn(),
    getAllChannelsMock: vi.fn(),
  }))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
  ElMessageBox: {
    confirm: confirmMock,
  },
}))

vi.mock('@/api/devicesManagement', () => ({
  getInstancePoints: getInstancePointsMock,
  updateInstanceRouting: updateInstanceRoutingMock,
  executeAction: vi.fn(),
}))

vi.mock('@/api/channelsManagement', () => ({
  getAllChannels: getAllChannelsMock,
}))

vi.mock('@/utils/websocket', () => ({
  default: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}))

const sampleInstancePoints = {
  measurements: {
    1: { point_id: 1, signal_name: 'M1', routing: { channel_id: 1, channel_point_id: 2, enabled: true } },
  },
  actions: {},
  properties: {
    2: { point_id: 2, signal_name: 'P1' },
  },
}

function createDeviceTabsRef(overrides: {
  measurementRouting?: Record<string, unknown>
  actionRouting?: Record<string, unknown>
  pointsTable?: Record<string, unknown>
} = {}) {
  const resetPublishForTab = vi.fn()
  const hasPublishChangesForTab = vi.fn(() => false)

  return ref({
    resetPublishForTab,
    hasPublishChangesForTab,
    getPointsTable: vi.fn(() => ({
      getPublishCommands: vi.fn(() => []),
      resetPublish: vi.fn(),
      ...(overrides.pointsTable ?? {}),
    })),
    getMeasurementRouting: vi.fn(() => ({
      hasChanges: vi.fn(() => false),
      hasInvalid: vi.fn(() => false),
      getEditedData: vi.fn(() => []),
      clearImportedFileName: vi.fn(),
      ...(overrides.measurementRouting ?? {}),
    })),
    getActionRouting: vi.fn(() => ({
      hasChanges: vi.fn(() => false),
      hasInvalid: vi.fn(() => false),
      getEditedData: vi.fn(() => []),
      clearImportedFileName: vi.fn(),
      ...(overrides.actionRouting ?? {}),
    })),
    applyRealtimeValues: vi.fn(),
  })
}

async function mountHost(options: {
  restorePointsOnCancelEdit?: boolean
  tabOverrides?: Parameters<typeof createDeviceTabsRef>[0]
} = {}) {
  const deviceTabsRef = createDeviceTabsRef(options.tabOverrides)
  const mounted = await mountComposable(() =>
    useDevicePointsTablesHost({
      deviceTabsRef,
      restorePointsOnCancelEdit: options.restorePointsOnCancelEdit ?? false,
    }),
  )
  return { ...mounted, deviceTabsRef }
}

describe('useDevicePointsTablesHost', () => {
  beforeEach(() => {
    confirmMock.mockReset()
    elMessage.info.mockReset()
    elMessage.success.mockReset()
    elMessage.warning.mockReset()
    getInstancePointsMock.mockReset()
    updateInstanceRoutingMock.mockReset()
    getAllChannelsMock.mockReset()
    getInstancePointsMock.mockResolvedValue({ success: true, data: sampleInstancePoints })
    getAllChannelsMock.mockResolvedValue({ data: { list: [{ id: 1, name: 'Ch-1' }] } })
  })

  it('forwards raw values and per-point timestamps without converting null or properties into zero', async () => {
    const { result, wrapper, scope, deviceTabsRef } = await mountHost()
    result.subscribeWebSocket(7)
    const listener = vi.mocked(wsManager.subscribe).mock.calls.at(-1)![1]!
    const values = { 1: null, 2: 0 }
    const ts = { 1: 0, 2: 1700000000000 }
    listener.onBatchDataUpdate?.({ updates: [
      { source: 'inst', channel_id: 7, data_type: 'M', values, ts },
      { source: 'inst', channel_id: 7, data_type: 'P', values: { 1: 'manufacturer', 2: 0 } },
      { source: 'comsrv', channel_id: 7, data_type: 'A', values: { 1: 99 }, ts },
    ] })
    expect(deviceTabsRef.value.applyRealtimeValues.mock.calls).toEqual([
      ['measurement', values, ts],
      ['property', { 1: 'manufacturer', 2: 0 }, {}],
    ])
    destroyComposableMount(wrapper, scope)
  })

  it('switches away from property tab when entering routing view', async () => {
    const { result, wrapper, scope } = await mountHost()
    result.activeTab.value = 'property'

    result.handleDropdownCommand('routing')
    await wrapper.vm.$nextTick()

    expect(result.viewMode.value).toBe('routing')
    expect(result.activeTab.value).toBe('measurement')

    destroyComposableMount(wrapper, scope)
  })

  it('moves to action tab when entering publish mode from property tab', async () => {
    const { result, wrapper, scope } = await mountHost()
    result.activeTab.value = 'property'

    await result.togglePublishMode()

    expect(result.isPublish.value).toBe(true)
    expect(result.activeTab.value).toBe('action')

    destroyComposableMount(wrapper, scope)
  })

  it('restores row data on cancel when restorePointsOnCancelEdit is enabled', async () => {
    const { result, wrapper, scope } = await mountHost({ restorePointsOnCancelEdit: true })

    await result.loadInstanceContext({ id: 7, name: 'Device-A' })
    result.measurementRows.value = [
      {
        point_id: 99,
        signal_name: 'edited',
        routing: { channel_id: 1, channel_point_id: 1, enabled: true },
      },
    ] as unknown as typeof result.measurementRows.value
    result.isEditing.value = true

    result.performDiscardEdit()

    expect(result.isEditing.value).toBe(false)
    expect(result.measurementRows.value).toEqual(
      expect.arrayContaining([expect.objectContaining({ point_id: 1, signal_name: 'M1' })]),
    )

    destroyComposableMount(wrapper, scope)
  })

  it('exits edit mode without submitting when view mode is points', async () => {
    const { result, wrapper, scope } = await mountHost()
    result.isEditing.value = true
    result.viewModeSwitch.value = false

    await result.handleSubmit()

    expect(result.isEditing.value).toBe(false)
    expect(updateInstanceRoutingMock).not.toHaveBeenCalled()

    destroyComposableMount(wrapper, scope)
  })

  it('shows info when submitting routing with no changes', async () => {
    const { result, wrapper, scope } = await mountHost()
    result.viewModeSwitch.value = true

    await result.handleSubmit()

    expect(elMessage.info).toHaveBeenCalledWith('No routing changes to submit')
    expect(updateInstanceRoutingMock).not.toHaveBeenCalled()

    destroyComposableMount(wrapper, scope)
  })

  it('submits routing payload when edited mappings exist', async () => {
    updateInstanceRoutingMock.mockResolvedValueOnce({ success: true })
    const editedMeasurement = {
      point_id: 1,
      routing: {
        channel_id: 3,
        channel_point_id: 4,
        channel_type: 't',
        enabled: true,
      },
    }

    const { result, wrapper, scope } = await mountHost({
      tabOverrides: {
        measurementRouting: {
          getEditedData: vi.fn(() => [editedMeasurement]),
        },
      },
    })
    result.viewModeSwitch.value = true
    result.instanceId.value = 7

    await result.handleSubmit()

    expect(updateInstanceRoutingMock).toHaveBeenCalledWith(7, [
      expect.objectContaining({
        point_id: 1,
        point_type: 'M',
        channel_id: 3,
        channel_point_id: 4,
        four_remote: 'T',
        enabled: true,
      }),
    ])
    expect(result.isEditing.value).toBe(false)
    expect(elMessage.success).toHaveBeenCalledWith('Routings updated successfully')

    destroyComposableMount(wrapper, scope)
  })

  it('loads channels when entering edit mode', async () => {
    const { result, wrapper, scope } = await mountHost()

    await result.handleEdit()

    expect(result.isEditing.value).toBe(true)
    expect(getAllChannelsMock).toHaveBeenCalledTimes(1)
    expect(result.channelsForRouting.value).toEqual([{ id: 1, name: 'Ch-1' }])

    destroyComposableMount(wrapper, scope)
  })

  it('resetHostState restores default tab and clears publish UI', async () => {
    const { result, wrapper, scope } = await mountHost()
    result.isEditing.value = true
    result.isPublish.value = true
    result.viewModeSwitch.value = true
    result.activeTab.value = 'measurement'

    result.resetHostState()

    expect(result.isEditing.value).toBe(false)
    expect(result.isPublish.value).toBe(false)
    expect(result.viewModeSwitch.value).toBe(false)
    expect(result.activeTab.value).toBe('property')

    destroyComposableMount(wrapper, scope)
  })
})
