import {
  provide,
  readonly,
  ref,
  watch,
  type Ref,
} from 'vue'
import { ElMessage } from 'element-plus'
import { getAllChannels } from '@/api/channelsManagement'
import { executeAction, getInstancePoints, updateInstanceRouting } from '@/api/devicesManagement'
import { usePointsTablesPage } from '@/composables/usePointsTablesPage'
import type {
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePointList,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import { InstanceIdKey, InstanceNameKey } from '@/utils/key'
import wsManager from '@/utils/websocket'

export type DeviceTabName = 'measurement' | 'action' | 'property'

export const DEVICE_TAB_NAMES: DeviceTabName[] = ['measurement', 'action', 'property']

export interface DevicePointsData {
  measurement: InstanceMeasurementItem[]
  action: InstanceActionItem[]
  property: InstancePropertyItem[]
}

const emptyOriginalPointsData = (): DevicePointsData => ({
  measurement: [],
  action: [],
  property: [],
})

const deepCloneRows = <T,>(rows: T[]): T[] => JSON.parse(JSON.stringify(rows))

export interface UseDevicePointsTablesHostOptions {
  deviceTabsRef: Ref<{
    resetPublishForTab: (tab: DeviceTabName) => void
    hasPublishChangesForTab: (tab: DeviceTabName) => boolean
    getPointsTable: (tab: DeviceTabName) => {
      getPublishCommands?: () => Array<{ id: string | number; value: number }>
      resetPublish?: () => void
    } | null | undefined
    getMeasurementRouting: () => {
      hasChanges?: () => boolean
      hasInvalid?: () => boolean
      getEditedData?: () => unknown[]
      clearImportedFileName?: () => void
    } | null | undefined
    getActionRouting: () => {
      hasChanges?: () => boolean
      hasInvalid?: () => boolean
      getEditedData?: () => unknown[]
      clearImportedFileName?: () => void
    } | null | undefined
    applyRealtimeValues?: (
      tab: DeviceTabName,
      values: Record<string, number>,
      ts?: Record<string, number>,
    ) => void
  } | undefined>
  restorePointsOnCancelEdit?: boolean
  submitLoading?: Ref<boolean>
  publishLoading?: Ref<boolean>
}

function toRoutingItem(item: any, pointType: 'M' | 'A') {
  return {
    channel_id: Number(item.routing.channel_id),
    channel_point_id: Number(item.routing.channel_point_id),
    four_remote: String(item.routing.channel_type || '').toUpperCase(),
    point_id: Number(item.point_id),
    point_type: pointType,
    enabled: !!item.routing.enabled,
  }
}

export function useDevicePointsTablesHost(options: UseDevicePointsTablesHostOptions) {
  const {
    deviceTabsRef,
    restorePointsOnCancelEdit = false,
    submitLoading,
    publishLoading,
  } = options

  const isEditing = ref(false)
  const activeTab = ref<DeviceTabName>('property')
  const instanceName = ref('')
  const instanceId = ref(0)
  const measurementRows = ref<InstanceMeasurementItem[]>([])
  const actionRows = ref<InstanceActionItem[]>([])
  const propertyRows = ref<InstancePropertyItem[]>([])
  const channelsForRouting = ref<Array<{ id: number; name: string }>>([])
  const originalPointsData = ref<DevicePointsData>(emptyOriginalPointsData())
  const pageId = ref('')

  const resetPublishForTab = (tab: DeviceTabName) => deviceTabsRef.value?.resetPublishForTab(tab)
  const resetPublishAll = () => {
    DEVICE_TAB_NAMES.forEach((tab) => resetPublishForTab(tab))
  }

  const pageUi = usePointsTablesPage({
    secondaryViewCommand: 'routing',
    secondaryViewMode: 'routing',
    activeTab,
    resetPublishForTab: (tab) => resetPublishForTab(tab as DeviceTabName),
    resetPublishAll,
    resolvePublishDirtyForTab: (tab) =>
      !!deviceTabsRef.value?.hasPublishChangesForTab(tab as DeviceTabName),
  })

  provide(InstanceNameKey, readonly(instanceName))
  provide(InstanceIdKey, readonly(instanceId))

  watch(
    () => pageUi.viewMode.value,
    (mode) => {
      if (mode === 'routing' && activeTab.value === 'property') {
        activeTab.value = 'measurement'
      }
    },
  )

  const getCurrentPointsRef = () => deviceTabsRef.value?.getPointsTable(activeTab.value)

  const getHasChanges = (): boolean =>
    !!(
      deviceTabsRef.value?.getMeasurementRouting()?.hasChanges?.() ||
      deviceTabsRef.value?.getActionRouting()?.hasChanges?.()
    )

  const applyPointsList = (data: InstancePointList) => {
    measurementRows.value = data.measurements ? Object.values(data.measurements) : []
    actionRows.value = data.actions ? Object.values(data.actions) : []
    propertyRows.value = data.properties ? Object.values(data.properties) : []
    originalPointsData.value = {
      measurement: deepCloneRows(measurementRows.value),
      action: deepCloneRows(actionRows.value),
      property: deepCloneRows(propertyRows.value),
    }
  }

  const refreshPointsBaseline = async () => {
    try {
      const res = await getInstancePoints(instanceId.value)
      if (res.success) {
        applyPointsList(res.data as InstancePointList)
      }
    } catch {
      console.error('Failed to refresh points data')
    }
  }

  const loadChannelsForRouting = async () => {
    try {
      const res = await getAllChannels()
      const list = Array.isArray(res?.data?.list)
        ? res.data.list
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? (res as unknown[])
            : []
      channelsForRouting.value = (list as Array<{ id?: unknown; name?: unknown }>)
        .map((item) => ({
          id: Number(item.id),
          name: String(item.name || ''),
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)
    } catch (error) {
      console.error('Failed to load channels:', error)
      channelsForRouting.value = []
    }
  }

  const handleEdit = async () => {
    isEditing.value = true
    pageUi.resetStatusFilters()
    await loadChannelsForRouting()
  }

  const handleSubmit = async () => {
    if (pageUi.viewMode.value !== 'routing') {
      isEditing.value = false
      return
    }

    const measurementRouting = deviceTabsRef.value?.getMeasurementRouting()
    const actionRouting = deviceTabsRef.value?.getActionRouting()
    const invalidTabs: Array<'measurement' | 'action'> = []
    if (measurementRouting?.hasInvalid?.()) invalidTabs.push('measurement')
    if (actionRouting?.hasInvalid?.()) invalidTabs.push('action')
    if (invalidTabs.length > 0) {
      ElMessage.warning('Routings has invalid data, please correct and submit again')
      pageUi.invalidChecked.value = true
      activeTab.value = invalidTabs[0]
      return
    }

    const measurementMappings = measurementRouting?.getEditedData?.() || []
    const actionMappings = actionRouting?.getEditedData?.() || []
    const mappings = [...measurementMappings, ...actionMappings]
    if (!mappings.length) {
      ElMessage.info('No routing changes to submit')
      return
    }

    const routingPayload = [
      ...measurementMappings.map((item) => toRoutingItem(item, 'M')),
      ...actionMappings.map((item) => toRoutingItem(item, 'A')),
    ]

    if (submitLoading) submitLoading.value = true
    try {
      const res = await updateInstanceRouting(instanceId.value, routingPayload)
      if (res.success) {
        ElMessage.success('Routings updated successfully')
        isEditing.value = false
        pageUi.resetStatusFilters()
        await refreshPointsBaseline()
      }
    } finally {
      if (submitLoading) submitLoading.value = false
    }
  }

  const handleSubmitPublish = async () => {
    const sourceRef =
      activeTab.value === 'action'
        ? deviceTabsRef.value?.getPointsTable('action')
        : activeTab.value === 'measurement'
          ? deviceTabsRef.value?.getPointsTable('measurement')
          : null
    const commands = sourceRef?.getPublishCommands?.() ?? []
    if (!Array.isArray(commands) || commands.length === 0) return

    if (publishLoading) publishLoading.value = true
    try {
      for (const { id, value } of commands) {
        await executeAction(instanceId.value, { point_id: String(id), value })
      }
      pageUi.publishDirty.value = false
      pageUi.isPublish.value = false
      sourceRef?.resetPublish?.()
    } finally {
      if (publishLoading) publishLoading.value = false
    }
  }

  const performDiscardEdit = () => {
    if (restorePointsOnCancelEdit) {
      measurementRows.value = deepCloneRows(originalPointsData.value.measurement)
      actionRows.value = deepCloneRows(originalPointsData.value.action)
      propertyRows.value = deepCloneRows(originalPointsData.value.property)
    }
    isEditing.value = false
    pageUi.resetStatusFilters()
    deviceTabsRef.value?.getMeasurementRouting()?.clearImportedFileName?.()
    deviceTabsRef.value?.getActionRouting()?.clearImportedFileName?.()
    pageUi.resetPublishState()
  }

  const handleCancelEdit = () => {
    pageUi.handleCancelEdit(getHasChanges, performDiscardEdit)
  }

  const togglePublishMode = async () => {
    if (!pageUi.isPublish.value) {
      if (activeTab.value !== 'action' && activeTab.value !== 'measurement') {
        activeTab.value = 'action'
      }
    }
    await pageUi.togglePublishMode()
  }

  const teardownWebSocket = () => {
    if (!pageId.value) return
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {
      // ignore unsubscribe errors on teardown
    }
    pageId.value = ''
  }

  const subscribeWebSocket = (localInstanceId: number) => {
    teardownWebSocket()
    pageId.value = `inst-${localInstanceId}-${Date.now()}`
    wsManager.subscribe(
      {
        source: 'inst',
        channels: [localInstanceId] as unknown as number[],
        dataTypes: ['A', 'M', 'P'] as unknown as Array<'A' | 'M' | 'P'>,
        interval: 1000,
      } as Parameters<typeof wsManager.subscribe>[0],
      {
        onBatchDataUpdate: (payload: any) => {
          if (!payload?.updates?.length) return
          payload.updates.forEach((update: any) => {
            if (Number(update.channel_id) !== localInstanceId) return
            const dataType = String(update.data_type || '').toUpperCase()
            const values = update.values || {}
            const ts = update.ts || {}
            const map: Record<string, number> = {}
            Object.keys(values).forEach((key) => {
              map[key] = Number(values[key])
            })
            if (dataType === 'M') {
              deviceTabsRef.value?.applyRealtimeValues?.('measurement', map, ts)
            } else if (dataType === 'A') {
              deviceTabsRef.value?.applyRealtimeValues?.('action', map, ts)
            } else if (dataType === 'P') {
              deviceTabsRef.value?.applyRealtimeValues?.('property', map, ts)
            }
          })
        },
      },
      pageId.value,
    )
  }

  const loadInstanceContext = async (params: { id: number; name?: string }) => {
    instanceId.value = params.id
    if (params.name) instanceName.value = params.name
    await refreshPointsBaseline()
  }

  const resetHostState = () => {
    isEditing.value = false
    pageUi.resetPublishState()
    pageUi.resetStatusFilters()
    pageUi.viewModeSwitch.value = false
    activeTab.value = 'property'
  }

  return {
    ...pageUi,
    isEditing,
    activeTab,
    instanceName,
    instanceId,
    measurementRows,
    actionRows,
    propertyRows,
    channelsForRouting,
    originalPointsData,
    pageId,
    getHasChanges,
    handleEdit,
    handleSubmit,
    handleSubmitPublish,
    handleCancelEdit,
    performDiscardEdit,
    togglePublishMode,
    refreshPointsBaseline,
    loadInstanceContext,
    resetHostState,
    subscribeWebSocket,
    teardownWebSocket,
    applyPointsList,
  }
}
