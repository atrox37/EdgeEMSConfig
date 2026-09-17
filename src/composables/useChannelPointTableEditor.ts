import { computed, inject, ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useCsvImportExport } from '@/composables/useCsvImportExport'
import { useFieldErrors } from '@/composables/useFieldErrors'
import { usePointCsvHandlers } from '@/composables/usePointCsvHandlers'
import { usePointInlineEditing } from '@/composables/usePointInlineEditing'
import { usePointNumericCellInput } from '@/composables/usePointNumericCellInput'
import { usePointPublish } from '@/composables/usePointPublish'
import { usePointRowEditing } from '@/composables/usePointRowEditing'
import { usePointTableFilters } from '@/composables/usePointTableFilters'
import { useRowStatusHelpers } from '@/composables/useRowStatusHelpers'
import { getPointCsvSchema } from '@/schemas/channelProtocols'
import { getPointColumns } from '@/schemas/channelTableColumns'
import type { PointInfo } from '@/types/channelConfiguration'
import {
  buildChannelCsvFilename,
  downloadCsv,
  formatUpdateTimeForCsv,
  getTimestampCompact,
} from '@/utils/csvExport'
import { buildCsv } from '@/utils/csvSchema'
import { ChannelNameKey, OriginalPointsKey } from '@/utils/key'
import { asTableRow } from '@/utils/tableRow'
import { validatePointField, validatePointRow } from '@/validators/channelPoints'

export type ChannelPointType = 'T' | 'S' | 'C' | 'A'
export type ChannelProtocol = 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can' | 'di_do'

export interface UseChannelPointTableEditorOptions {
  pointType: () => ChannelPointType
  points: () => PointInfo[]
  originalPoints?: () => PointInfo[] | undefined
  editFilters: () => string[]
  isEditing: () => boolean
  publishMode: () => boolean
  channelProtocol: () => ChannelProtocol
  showRealtimeColumns?: () => boolean
  onPublishChange: (dirty: boolean) => void
  onEnterEditMode: (payload?: { fromImport?: boolean }) => void
  openValuePublishDialog: (params: {
    pointId: number
    dataType: string
    category: 'C' | 'A' | 'T' | 'S'
  }) => void
}

export function useChannelPointTableEditor(options: UseChannelPointTableEditorOptions) {
  const injectedOriginalPoints = inject(OriginalPointsKey, ref<PointInfo[]>([]))
  const injectedChannelName = inject(ChannelNameKey, ref(''))

  const editPoints = ref<PointInfo[]>([])
  const pendingNewRow = ref<PointInfo | null>(null)
  const importedFileName = ref('')
  const showSignalNameFilter = ref(false)

  let rowKeySeed = 1
  const createRowKey = () => `row_${Date.now()}_${rowKeySeed++}`

  const originalPointsList = computed<PointInfo[]>(() => {
    const fromProps = options.originalPoints?.()
    if (Array.isArray(fromProps)) return fromProps
    return (injectedOriginalPoints?.value || []) as PointInfo[]
  })

  const isTA = computed(
    () => options.pointType() === 'T' || options.pointType() === 'A',
  )

  const {
    publishValues,
    getPublishCommands,
    hasPublishChanges,
    resetPublish,
    notifyPublishChange,
  } = usePointPublish({
    editPoints,
    publishMode: () => options.publishMode(),
    onPublishChange: options.onPublishChange,
  })

  const { getCellInputValue, handleNumberOrTextInput, handleNumberOrTextBlur } =
    usePointNumericCellInput(editPoints)

  const {
    signalNameFilterRaw,
    signalNameFilter,
    signalNameOptions,
    currentPage,
    pageSize,
    paginatedData,
    total,
  } = usePointTableFilters<PointInfo>({
    listRef: editPoints,
    getSignalName: (point) => point.signal_name || '',
    getEditFilters: () => options.editFilters(),
    invalidExcludesDeleted: true,
    applyListFilters: (list) => {
      if (
        importedFileName.value &&
        (!options.editFilters()?.length || options.editFilters()[0] !== 'deleted')
      ) {
        return list.filter((point) => (point as { rowStatus?: string }).rowStatus !== 'deleted')
      }
      return list
    },
  })

  const { getRowClass, getFieldClass, hasChanges } = useRowStatusHelpers<PointInfo>({
    listRef: editPoints,
    isEditing: () => options.isEditing(),
    getBaseRowClass: (row) =>
      (row as { isImported?: boolean; rowStatus?: string }).isImported
        ? 'row-status-added'
        : `row-status-${(row as { rowStatus?: string }).rowStatus || 'normal'}`,
  })

  function validateRowValidity(point: PointInfo): boolean {
    return validatePointRow(point, {
      channelProtocol: options.channelProtocol(),
      pointType: options.pointType(),
    })
  }

  const validatePointFieldOnly = (item: PointInfo, field: string) =>
    validatePointField(item, field, {
      channelProtocol: options.channelProtocol(),
      pointType: options.pointType(),
      points: editPoints.value,
    })

  const {
    getFieldError: getFieldErrorCore,
    refreshFieldErrorsForRow,
    refreshFieldErrorsForList,
    validateAndSetField,
  } = useFieldErrors<PointInfo>({
    listRef: editPoints,
    validateField: validatePointFieldOnly,
    getFieldsForRow: () => {
      if (options.channelProtocol() === 'can') {
        if (options.pointType() === 'T') return ['point_id', 'signal_name', 'scale', 'offset']
        return ['point_id', 'signal_name']
      }
      const fields = ['point_id', 'signal_name', 'reverse']
      if (options.channelProtocol() !== 'di_do') fields.push('scale', 'offset', 'unit')
      return fields
    },
    clearFields: () => {
      if (options.channelProtocol() === 'can') return ['reverse', 'unit']
      return options.channelProtocol() === 'di_do' ? ['scale', 'offset', 'unit'] : []
    },
  })

  const {
    applyDuplicatePointIdInvalid,
    recomputeAllValidity,
    deletePoint,
    restorePoint,
  } = usePointRowEditing({
    listRef: editPoints,
    channelProtocol: () => options.channelProtocol(),
    validateRow: validateRowValidity,
    refreshFieldErrorsForRow,
  })

  const { updateRowChangeStatus } = usePointInlineEditing({
    editPoints,
    originalPointsList,
    pendingNewRow,
    signalNameFilter,
    showSignalNameFilter,
    validateRowValidity,
    applyDuplicatePointIdInvalid,
    recomputeAllValidity,
    refreshFieldErrorsForRow,
  })

  function getFieldError(item: PointInfo, field: string): string {
    if (item && (item as { hideErrorsOnce?: boolean }).hideErrorsOnce) return ''
    return getFieldErrorCore(item, field)
  }

  function onFieldInput(item: PointInfo, field: string) {
    if (item && (item as { hideErrorsOnce?: boolean }).hideErrorsOnce) {
      ;(item as { hideErrorsOnce?: boolean }).hideErrorsOnce = false
    }
    validateAndSetField(item, field)
    updateRowChangeStatus(item)
  }

  const pointColumns = computed(() =>
    getPointColumns({
      isEditing: options.isEditing(),
      isTA: isTA.value,
      channelProtocol: options.channelProtocol(),
      onFieldInput,
      canEditPointId: (row) =>
        (row as { rowStatus?: string; isNewUnconfirmed?: boolean; isImported?: boolean })
          .rowStatus === 'added' ||
        !!(row as { isNewUnconfirmed?: boolean }).isNewUnconfirmed ||
        !!(row as { isImported?: boolean }).isImported,
      showRealtimeColumns: options.showRealtimeColumns?.() ?? true,
    }),
  )

  function clonePointRow(item: PointInfo) {
    const clone = {
      ...item,
      rowStatus: item.rowStatus || 'normal',
    } as PointInfo & { rowKey?: string; originalPointId?: number }
    clone.rowKey = (item as { rowKey?: string }).rowKey || createRowKey()
    if (clone.originalPointId === undefined) clone.originalPointId = item.point_id
    return clone
  }

  watch(
    () => ({ points: options.points(), isEditing: options.isEditing() }),
    (value) => {
      if (!value.isEditing && Array.isArray(value.points)) {
        pendingNewRow.value = null
        editPoints.value = value.points.map(clonePointRow)
        editPoints.value.forEach((point) => validateRowValidity(point))
        refreshFieldErrorsForList()
      }
    },
    { immediate: true, deep: true },
  )

  watch(
    () => options.isEditing(),
    (editing) => {
      if (editing && Array.isArray(editPoints.value)) {
        pendingNewRow.value = null
        editPoints.value.forEach((point) => validateRowValidity(point))
        refreshFieldErrorsForList()
      } else if (!editing) {
        editPoints.value = originalPointsList.value.map(clonePointRow)
        pendingNewRow.value = null
        refreshFieldErrorsForList()
      }
    },
  )

  function handleDeletePoint(row: PointInfo) {
    if ((row as { isNewUnconfirmed?: boolean }).isNewUnconfirmed) {
      const idx = editPoints.value.findIndex(
        (point) => (point as { rowKey?: string }).rowKey === (row as { rowKey?: string }).rowKey,
      )
      if (idx !== -1) editPoints.value.splice(idx, 1)
      recomputeAllValidity()
      refreshFieldErrorsForList()
      return
    }
    deletePoint(row)
    recomputeAllValidity()
    refreshFieldErrorsForList()
  }

  function handleRestorePoint(row: PointInfo) {
    restorePoint(row, originalPointsList.value)
    recomputeAllValidity()
    refreshFieldErrorsForList()
  }

  const { handlePointsCsvContent } = usePointCsvHandlers({
    pointType: () => options.pointType(),
    channelProtocol: () => options.channelProtocol() || 'modbus_tcp',
    editPoints,
    originalPointsList,
    createRowKey,
    setImportedFileName: (name) => {
      importedFileName.value = name
    },
    enterEditMode: (payload) => options.onEnterEditMode(payload),
    refreshFieldErrorsForList,
    recomputeAllValidity,
    notify: {
      success: (message) => ElMessage.success(message),
      warning: (message) => ElMessage.warning(message),
      error: (message) => ElMessage.error(message),
    },
  })

  const { fileInputRef, handleImportClick, handleFileChange } = useCsvImportExport({
    onParse: handlePointsCsvContent,
    onError: (message) => {
      ElMessage.error(message)
    },
  })

  const getNextPointId = () => {
    const allIds = editPoints.value.map((point) => point.point_id).filter((id) => id > 0)
    return allIds.length > 0 ? Math.max(...allIds) + 1 : 1
  }

  function scrollToTop() {
    currentPage.value = 1
  }

  function handleAddNewPoint() {
    const isCan = options.channelProtocol() === 'can'
    const isCanTelemetry = isCan && options.pointType() === 'T'
    const newPoint = {
      point_id: getNextPointId(),
      signal_name: '',
      scale: isCan && !isCanTelemetry ? (undefined as unknown as number) : 1,
      offset: isCan && !isCanTelemetry ? (undefined as unknown as number) : 0,
      unit: '',
      data_type: isCan ? '' : 'float',
      reverse: isCan ? (undefined as unknown as boolean) : false,
      description: '',
      isNewUnconfirmed: true,
      rowStatus: 'added',
    } as PointInfo & {
      rowKey?: string
      originalPointId?: number
      hideErrorsOnce?: boolean
    }
    newPoint.rowKey = createRowKey()
    newPoint.originalPointId = undefined
    newPoint.hideErrorsOnce = false
    editPoints.value.unshift(newPoint)
    validateRowValidity(newPoint)
    refreshFieldErrorsForRow(newPoint)
    applyDuplicatePointIdInvalid()
    scrollToTop()
  }

  function applyRealtimeValues(
    values: Record<string | number, number>,
    ts?: Record<string | number, number>,
  ) {
    if (!values || !Array.isArray(editPoints.value)) return
    const valueMap = new Map<number, number>()
    Object.entries(values).forEach(([key, value]) => {
      const id = Number(key)
      if (Number.isFinite(id)) valueMap.set(id, Number(value))
    })
    const tsMap = new Map<number, number>()
    if (ts && typeof ts === 'object') {
      Object.entries(ts).forEach(([key, value]) => {
        const id = Number(key)
        if (Number.isFinite(id)) tsMap.set(id, Number(value))
      })
    }
    if (valueMap.size === 0 && tsMap.size === 0) return
    editPoints.value.forEach((point) => {
      const row = point as PointInfo & { value?: number; update_ts?: number }
      const newVal = valueMap.get(point.point_id)
      if (newVal !== undefined) row.value = newVal
      const newTs = tsMap.get(point.point_id)
      if (newTs !== undefined) row.update_ts = newTs
    })
  }

  function handlePublish(point: PointInfo) {
    options.openValuePublishDialog({
      pointId: point.point_id,
      dataType: point.data_type,
      category: options.pointType() as 'C' | 'A' | 'T' | 'S',
    })
  }

  function addPoint(point: PointInfo) {
    editPoints.value.push({ ...point, rowStatus: 'added' })
  }

  function getEditedData() {
    return editPoints.value
  }

  function clearImportedFileName() {
    importedFileName.value = ''
  }

  async function handleExport() {
    if (!editPoints.value || editPoints.value.length === 0) {
      ElMessage.warning('No data to export')
      return
    }

    const schema = getPointCsvSchema(options.pointType(), options.channelProtocol() || 'modbus_tcp')
    const rows = editPoints.value.map((point) => ({
      point_id: String(point.point_id ?? ''),
      point_name: String(point.signal_name ?? ''),
      value: String((point as { value?: unknown }).value ?? ''),
      update_time: formatUpdateTimeForCsv(
        (point as { update_ts?: number }).update_ts,
      ),
      scale: String(point.scale ?? ''),
      offset: String(point.offset ?? ''),
      unit: String(point.unit ?? ''),
      reverse: point.reverse ? 'true' : 'false',
    }))
    const tabNames: Record<string, string> = {
      T: 'telemetry',
      S: 'signal',
      C: 'control',
      A: 'adjustment',
    }
    const filename = buildChannelCsvFilename(String(injectedChannelName?.value || ''), [
      tabNames[options.pointType()],
      getTimestampCompact(),
    ])
    const csvContent = buildCsv(schema, rows)
    const saveResult = await downloadCsv(csvContent, filename)
    ElMessage.success(`Exported to ${saveResult.displayPath}`)
  }

  function hasInvalid() {
    return Array.isArray(editPoints.value)
      ? editPoints.value.some(
          (point) =>
            point &&
            point.rowStatus !== 'deleted' &&
            (((point as { isInvalid?: boolean }).isInvalid === true) ||
              !validateRowValidity(point)),
        )
      : false
  }

  function getInvalidDetails() {
    editPoints.value.forEach((point) => {
      if (point && point.rowStatus !== 'deleted') {
        ;(point as { hideErrorsOnce?: boolean }).hideErrorsOnce = false
      }
    })
    refreshFieldErrorsForList()
    applyDuplicatePointIdInvalid()
    const tabNames: Record<string, string> = {
      T: 'Telemetry',
      S: 'Signal',
      C: 'Control',
      A: 'Adjustment',
    }
    const tab = tabNames[options.pointType()] || options.pointType()
    const lines: string[] = []
    editPoints.value.forEach((point) => {
      if (!point || point.rowStatus === 'deleted') return
      const fieldErrors = (point as { fieldErrors?: Record<string, string> }).fieldErrors
      const errs =
        fieldErrors && Object.entries(fieldErrors).filter(([, message]) => message)
      if (errs && errs.length > 0) {
        const id = point.point_id ?? '-'
        const name = point.signal_name
          ? ` (${String(point.signal_name).slice(0, 20)}${String(point.signal_name).length > 20 ? '...' : ''})`
          : ''
        errs.forEach(([field, message]) => {
          lines.push(`${tab} Point ${id}${name} - ${field}: ${message}`)
        })
      }
    })
    return lines
  }

  function clearSignalNameFilter() {
    signalNameFilter.value = ''
    showSignalNameFilter.value = false
  }

  const pointRow = (row: unknown): PointInfo => asTableRow<PointInfo>(row)

  return {
    pointRow,
    pointColumns,
    importedFileName,
    signalNameFilterRaw,
    signalNameOptions,
    currentPage,
    pageSize,
    paginatedData,
    total,
    publishValues,
    notifyPublishChange,
    fileInputRef,
    getRowClass,
    getFieldClass,
    getCellInputValue,
    handleNumberOrTextInput,
    handleNumberOrTextBlur,
    getFieldError,
    handleDeletePoint,
    handleRestorePoint,
    handleAddNewPoint,
    handleImportClick,
    handleFileChange,
    handleExport,
    handlePublish,
    applyRealtimeValues,
    getEditedData,
    addPoint,
    getPublishCommands,
    resetPublish,
    hasPublishChanges,
    clearImportedFileName,
    scrollToTop,
    hasInvalid,
    getInvalidDetails,
    hasChanges,
    clearSignalNameFilter,
  }
}

export type ChannelPointTableEditorApi = ReturnType<typeof useChannelPointTableEditor>
