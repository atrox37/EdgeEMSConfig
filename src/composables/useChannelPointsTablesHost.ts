import {
  computed,
  nextTick,
  provide,
  readonly,
  ref,
  type Ref,
} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchUpdateMappingPoint,
  getChannelDetail,
  getPointsTables,
  postPointsBatch,
  publishPointValue,
} from '@/api/channelsManagement'
import type {
  BatchPointsChangeRequest,
  BatchUpdateMappingPointRequest,
  PointInfoResponse,
} from '@/types/channelConfiguration'
import { usePointsTablesPage } from '@/composables/usePointsTablesPage'
import { ChannelIdKey, ChannelNameKey, ChannelProtocolKey, OriginalPointsKey } from '@/utils/key'
import wsManager from '@/utils/websocket'
import type { DataType } from '@/types/websocket'

export type ChannelTabName = 'telemetry' | 'signal' | 'control' | 'adjustment'
export type ChannelProtocol = 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'

export const CHANNEL_TAB_NAMES: ChannelTabName[] = [
  'telemetry',
  'signal',
  'control',
  'adjustment',
]

const MAPPING_TYPE_TO_TAB_NAME: Record<string, 'T' | 'S' | 'C' | 'A'> = {
  telemetry: 'T',
  signal: 'S',
  control: 'C',
  adjustment: 'A',
}

const BASE_POINT_FIELDS = [
  'data_type',
  'description',
  'offset',
  'reverse',
  'scale',
  'signal_name',
  'unit',
] as const

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

const emptyPointsData = (): PointInfoResponse => ({
  telemetry: [],
  signal: [],
  control: [],
  adjustment: [],
})

export interface UseChannelPointsTablesHostOptions {
  channelTabsRef: Ref<{
    getTableInstance: (tab: ChannelTabName) => unknown
    resetPublishForTab: (tab: ChannelTabName) => void
    forEachTableInstance: (fn: (instance: any, tab: ChannelTabName) => void) => void
    applyRealtimeValues?: (
      dataType: DataType,
      values: Record<string, number>,
      ts?: Record<string, number>,
    ) => void
    scrollActiveTabToTop?: (tab: ChannelTabName) => void
  } | undefined>
  /** Page restores baseline on cancel; Dialog only exits edit mode. */
  restorePointsOnCancelEdit?: boolean
  submitLoading?: Ref<boolean>
  publishLoading?: Ref<boolean>
}

function pickData(row: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (row[field] !== undefined) out[field] = row[field]
  })
  return out
}

function buildPointBatchPayload(
  getEditedRows: (tab: ChannelTabName) => unknown,
): BatchPointsChangeRequest {
  const toArray = (value: unknown) => (Array.isArray(value) ? value : [])

  const buildCreate = (rows: any[], pointType: 'T' | 'S' | 'C' | 'A') =>
    rows
      .filter((row) => row && row.rowStatus === 'added' && row.point_id > 0)
      .map((row) => ({
        point_id: row.point_id,
        point_type: pointType,
        data: pickData(row, [...BASE_POINT_FIELDS]),
        ...(row?.isImported ? { force: true } : {}),
      }))

  const buildDelete = (rows: any[], pointType: 'T' | 'S' | 'C' | 'A') =>
    rows
      .filter((row) => row && row.rowStatus === 'deleted' && row.point_id > 0)
      .map((row) => ({
        point_id: row.point_id,
        point_type: pointType,
      }))

  const buildUpdate = (rows: any[], pointType: 'T' | 'S' | 'C' | 'A') =>
    rows
      .filter((row) => row && row.rowStatus === 'modified' && row.point_id > 0)
      .map((row) => {
        const fields = Array.isArray(row.modifiedFields) ? row.modifiedFields : []
        const data = pickData(
          row,
          fields.filter((field: string) => field !== 'point_id'),
        )
        return { point_id: row.point_id, point_type: pointType, data }
      })

  const tRows = toArray(getEditedRows('telemetry'))
  const sRows = toArray(getEditedRows('signal'))
  const cRows = toArray(getEditedRows('control'))
  const aRows = toArray(getEditedRows('adjustment'))

  return {
    create: [
      ...buildCreate(tRows, 'T'),
      ...buildCreate(sRows, 'S'),
      ...buildCreate(cRows, 'C'),
      ...buildCreate(aRows, 'A'),
    ],
    delete: [
      ...buildDelete(tRows, 'T'),
      ...buildDelete(sRows, 'S'),
      ...buildDelete(cRows, 'C'),
      ...buildDelete(aRows, 'A'),
    ],
    update: [
      ...buildUpdate(tRows, 'T'),
      ...buildUpdate(sRows, 'S'),
      ...buildUpdate(cRows, 'C'),
      ...buildUpdate(aRows, 'A'),
    ],
  }
}

export function useChannelPointsTablesHost(options: UseChannelPointsTablesHostOptions) {
  const {
    channelTabsRef,
    restorePointsOnCancelEdit = false,
    submitLoading,
    publishLoading,
  } = options

  const isEditing = ref(false)
  const activeTab = ref<ChannelTabName>('telemetry')
  const channelId = ref(0)
  const channelName = ref('')
  const channelProtocol = ref<ChannelProtocol>('modbus_tcp')
  const pointsData = ref<PointInfoResponse>(emptyPointsData())
  const originalPointsData = ref<PointInfoResponse>(emptyPointsData())
  const pageId = ref('')

  const getTableInstance = (tab: ChannelTabName) => channelTabsRef.value?.getTableInstance(tab)
  const resetPublishForTab = (tab: ChannelTabName) => channelTabsRef.value?.resetPublishForTab(tab)
  const resetPublishAll = () => {
    CHANNEL_TAB_NAMES.forEach((tab) => resetPublishForTab(tab))
  }
  const forEachTableInstance = (fn: (instance: any, tab: ChannelTabName) => void) => {
    channelTabsRef.value?.forEachTableInstance(fn)
  }
  const anyTableInstance = (predicate: (instance: any) => boolean) =>
    CHANNEL_TAB_NAMES.some((tab) => predicate(getTableInstance(tab)))

  const pageUi = usePointsTablesPage({
    secondaryViewCommand: 'mappings',
    secondaryViewMode: 'mappings',
    activeTab,
    resetPublishForTab: (tab) => resetPublishForTab(tab as ChannelTabName),
    resetPublishAll,
    resolvePublishDirtyForTab: (tab) =>
      !!(getTableInstance(tab as ChannelTabName) as { hasPublishChanges?: () => boolean })
        ?.hasPublishChanges?.(),
  })

  provide(ChannelIdKey, readonly(channelId))
  provide(ChannelNameKey, readonly(channelName))
  provide(ChannelProtocolKey, readonly(channelProtocol))
  provide(
    OriginalPointsKey,
    computed(() => originalPointsData.value[activeTab.value]),
  )

  const clearAllSignalFilters = () => {
    forEachTableInstance((instance) => instance.clearSignalNameFilter?.())
  }

  const clearStatusFilters = () => {
    pageUi.resetStatusFilters()
    clearAllSignalFilters()
  }

  const getHasChanges = () => anyTableInstance((instance) => instance.hasChanges?.())

  const refreshPointsBaseline = async () => {
    try {
      const res = await getPointsTables(channelId.value)
      if (res.success) {
        pointsData.value = res.data
        originalPointsData.value = deepClone(res.data)
      }
    } catch {
      console.error('Failed to refresh points baseline')
    }
  }

  const ensureInvalidHandled = (targetTab: ChannelTabName) => {
    if (!pageUi.invalidChecked.value) {
      pageUi.invalidChecked.value = true
    }
    activeTab.value = targetTab
  }

  const collectInvalidTabs = () => {
    const invalidTabs: ChannelTabName[] = []
    forEachTableInstance((instance, tab) => {
      if (instance.hasInvalid?.()) invalidTabs.push(tab)
    })
    return invalidTabs
  }

  const revealInvalidDetails = () => {
    forEachTableInstance((instance) => {
      if (instance.hasInvalid?.() && instance.getInvalidDetails) {
        instance.getInvalidDetails()
      }
    })
  }

  const submitMappings = async () => {
    const invalidTabs = collectInvalidTabs()
    if (invalidTabs.length > 0) {
      revealInvalidDetails()
      ensureInvalidHandled(invalidTabs[0])
      return
    }

    const param: BatchUpdateMappingPointRequest = {
      mappings: CHANNEL_TAB_NAMES.flatMap(
        (tab) => (getTableInstance(tab) as { getEditedData?: () => unknown[] })?.getEditedData?.() || [],
      ) as BatchUpdateMappingPointRequest['mappings'],
      mode: 'merge',
      reload_channel: false,
      validate_only: false,
    }

    if (!param.mappings.length) {
      ElMessage.info('No mapping changes to submit')
      return
    }

    const res = await batchUpdateMappingPoint(channelId.value, param)
    if (res.success) {
      ElMessage.success('Point mapping updated successfully')
      isEditing.value = false
      await refreshPointsBaseline()
      clearStatusFilters()
      pageUi.statusCheckboxValue.value = []
      pageUi.invalidChecked.value = false
    }
  }

  const submitPoints = async () => {
    const invalidTabs = collectInvalidTabs()
    if (invalidTabs.length > 0) {
      revealInvalidDetails()
      ensureInvalidHandled(invalidTabs[0])
      return
    }

    const payload = buildPointBatchPayload(
      (tab) => (getTableInstance(tab) as { getEditedData?: () => unknown })?.getEditedData?.(),
    )

    const totalCount =
      (payload.create?.length || 0) +
      (payload.delete?.length || 0) +
      (payload.update?.length || 0)
    if (totalCount === 0) {
      ElMessage.info('No point changes to submit')
      return
    }

    const res = await postPointsBatch(channelId.value, payload)
    if (res.success) {
      ElMessage.success('Points updated successfully')
      isEditing.value = false
      await refreshPointsBaseline()
      clearStatusFilters()
    }
  }

  const handleEdit = (payload?: { fromImport?: boolean } | MouseEvent) => {
    const fromImport =
      payload && typeof payload === 'object' && 'fromImport' in payload
        ? (payload as { fromImport?: boolean }).fromImport
        : false

    isEditing.value = true
    pageUi.resetStatusFilters()
    if (!fromImport) {
      forEachTableInstance((instance) => instance.clearImportedFileName?.())
    }
  }

  const handleSubmit = async () => {
    if (submitLoading) submitLoading.value = true
    try {
      if (pageUi.viewMode.value === 'mappings') {
        await submitMappings()
      } else {
        await submitPoints()
      }
    } finally {
      if (submitLoading) submitLoading.value = false
    }
  }

  const handleSubmitPublish = async () => {
    const activeInstance = getTableInstance(activeTab.value) as {
      getPublishCommands?: () => Array<{ id: string | number; value: unknown }>
      resetPublish?: () => void
    } | undefined
    const commands = activeInstance?.getPublishCommands?.() ?? []
    if (!commands.length) return

    if (publishLoading) publishLoading.value = true
    try {
      const res = await publishPointValue(channelId.value, {
        type: MAPPING_TYPE_TO_TAB_NAME[activeTab.value],
        points: commands.map((cmd) => ({ id: Number(cmd.id), value: Number(cmd.value) })),
      })
      if (res.success) {
        pageUi.publishDirty.value = false
        pageUi.isPublish.value = false
        activeInstance?.resetPublish?.()
        ElMessage.success('Batch publish successful')
      }
    } finally {
      if (publishLoading) publishLoading.value = false
    }
  }

  const handleTabChange = (tabName: string | number) => {
    pageUi.handleTabChange(tabName)
    nextTick(() => {
      channelTabsRef.value?.scrollActiveTabToTop?.(activeTab.value)
    })
  }

  const performDiscardEdit = () => {
    if (restorePointsOnCancelEdit) {
      pointsData.value = deepClone(originalPointsData.value)
    }
    isEditing.value = false
    pageUi.resetStatusFilters()
    forEachTableInstance((instance) => instance.clearImportedFileName?.())
    pageUi.resetPublishState()
    clearAllSignalFilters()
  }

  const confirmDiscardPublishOnClose = async (onComplete: () => void) => {
    if (pageUi.isPublish.value && pageUi.publishDirty.value) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved publish values. Submit them before closing?',
          'Unsaved Changes',
          {
            confirmButtonText: 'Submit',
            cancelButtonText: 'Discard',
            type: 'warning',
            center: true,
            showClose: false,
          },
        )
        await handleSubmitPublish()
        clearAllSignalFilters()
        onComplete()
      } catch {
        resetPublishAll()
        pageUi.publishDirty.value = false
        pageUi.isPublish.value = false
        clearAllSignalFilters()
        onComplete()
      }
      return
    }

    if (pageUi.isPublish.value && !pageUi.publishDirty.value) {
      pageUi.isPublish.value = false
    }
    clearAllSignalFilters()
    onComplete()
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

  const subscribeWebSocket = (localChannelId: number) => {
    teardownWebSocket()
    pageId.value = `points-${localChannelId}-${Date.now()}`
    wsManager.subscribe(
      {
        source: 'comsrv',
        channels: [localChannelId],
        dataTypes: ['T', 'S', 'C', 'A'],
        interval: 1000,
      },
      {
        onBatchDataUpdate: (payload: any) => {
          if (!payload?.updates?.length) return
          payload.updates.forEach((update: any) => {
            if (update.channel_id !== localChannelId) return
            channelTabsRef.value?.applyRealtimeValues?.(
              update.data_type as DataType,
              update.values,
              update.ts,
            )
          })
        },
      },
      pageId.value,
    )
  }

  const loadChannelContext = async (params: {
    id: number
    name?: string
    protocol?: ChannelProtocol
    fetchNameIfMissing?: boolean
  }) => {
    channelId.value = params.id
    if (params.name) channelName.value = params.name
    if (params.protocol) {
      channelProtocol.value = params.protocol
      activeTab.value = params.protocol === 'di_do' ? 'signal' : 'telemetry'
    }

    await refreshPointsBaseline()

    if (params.fetchNameIfMissing && !params.name) {
      const detail = await getChannelDetail(params.id)
      if (detail.success) {
        channelName.value = detail.data.name || ''
      }
    }
  }

  const resetHostState = () => {
    isEditing.value = false
    pageUi.resetPublishState()
    pageUi.resetStatusFilters()
    pageUi.viewModeSwitch.value = false
  }

  const handleCancelEdit = () => {
    pageUi.handleCancelEdit(getHasChanges, performDiscardEdit)
  }

  return {
    ...pageUi,
    isEditing,
    activeTab,
    channelId,
    channelName,
    channelProtocol,
    pointsData,
    originalPointsData,
    pageId,
    getHasChanges,
    handleEdit,
    handleSubmit,
    handleSubmitPublish,
    handleTabChange,
    refreshPointsBaseline,
    performDiscardEdit,
    handleCancelEdit,
    confirmDiscardPublishOnClose,
    clearAllSignalFilters,
    clearStatusFilters,
    subscribeWebSocket,
    teardownWebSocket,
    loadChannelContext,
    resetHostState,
  }
}
