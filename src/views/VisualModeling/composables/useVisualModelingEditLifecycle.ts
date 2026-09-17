import { nextTick, type ComputedRef, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import type { FitView } from '@vue-flow/core'
import { STATION_EDITOR_ID } from '@/stores/visualModeling'
import { alignEdgeHandlesToLayout, layoutModelGraph } from '../useModelLayout'
import { isEmptyFlow, repairMissingFlowEdges } from '@/utils/defaultModelFlow'
import { enrichTopologyNodesWithImages } from '@/utils/enrichTopologyNodes'
import type { ModelFlowData, ModelFlowNode, ModelInstanceBinding } from '@/types/visualModeling'
import { validateTopologyForPersistence } from '@/utils/topologyNormalize'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import type TopologyIssuesDialog from '../components/dialogs/TopologyIssuesDialog.vue'
import type { ProductListItem, DeviceInstanceBasic } from '@/types/deviceConfiguration'

interface VisualModelingStoreBridge {
  products: ProductListItem[]
  instances: DeviceInstanceBasic[]
  hasUnsavedChanges: boolean
  loadProducts: (force?: boolean) => Promise<void>
  loadInstances: (force?: boolean) => Promise<void>
  loadStationTopology: (force?: boolean) => Promise<void>
  getModelById: (id: string) => { flowJson?: ModelFlowData } | null | undefined
  saveFlowJson: (modelId: string, flow: ModelFlowData) => Promise<boolean>
  setCurrentModel: (modelId: string | null) => void
}

export interface UseVisualModelingEditLifecycleOptions {
  modelId?: string
  store: VisualModelingStoreBridge
  isViewMode: Ref<boolean>
  isCanvasLoading: Ref<boolean>
  isFullscreen: Ref<boolean>
  hasUnsavedChanges: Ref<boolean>
  selectedNode: Ref<ModelFlowNode | null>
  selectedEdgeId: Ref<string | null>
  fixedStationBinding: Ref<ModelInstanceBinding | null>
  fixedEnvironmentBinding: Ref<ModelInstanceBinding | null>
  primaryTopLevelProduct: ComputedRef<ProductListItem | undefined>
  secondaryTopLevelProduct: ComputedRef<ProductListItem | undefined>
  nodes: Ref<FlowNode[]>
  edges: Ref<FlowEdge[]>
  topologyIssuesDialogRef: Ref<InstanceType<typeof TopologyIssuesDialog> | null>
  getFlowNodes: () => FlowNode[]
  getFlowEdges: () => FlowEdge[]
  normalizeFlowEdges: (raw: FlowEdge[], flowNodes?: FlowNode[]) => FlowEdge[]
  applyFlowState: (nextNodes: FlowNode[], nextEdges: FlowEdge[]) => Promise<void>
  markDirty: () => void
  captureSavedSnapshot: () => Promise<boolean>
  setRestoring: (value: boolean) => void
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  toObject: () => { nodes?: FlowNode[]; edges?: FlowEdge[] }
  fitView: FitView
  getNodes: { value: FlowNode[] }
  syncEdgesFromFlow: () => Promise<void>
  exportCurrentFlow: () => ModelFlowData
  flowHistory: FlowHistoryBridge
  pushUndoSnapshot: () => void
  saveSnapshot: () => void
  fitFlowToViewport: (force?: boolean) => void
  removeSelectedElements: () => void
  handleSaveShortcut?: () => void
}

interface FlowHistoryBridge {
  clear: () => void
  saveSnapshot: () => void
}

async function waitForCanvasLayout() {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export function useVisualModelingEditLifecycle(options: UseVisualModelingEditLifecycleOptions) {
  const modelId = options.modelId ?? STATION_EDITOR_ID

  function topologyValidationOptions() {
    return {}
  }

  function persistenceValidationOptions(useCurrentFixedBindings = true) {
    return {
      ...topologyValidationOptions(),
      requireStationNode: false,
      ...(useCurrentFixedBindings
        ? {
            fixedBindings: {
              stationInstanceId: options.fixedStationBinding.value?.instanceId ?? null,
              environmentInstanceId: options.fixedEnvironmentBinding.value?.instanceId ?? null,
            },
          }
        : {}),
      instances: options.store.instances,
      stationProductName: options.primaryTopLevelProduct.value?.product_name,
      environmentProductName: options.secondaryTopLevelProduct.value?.product_name,
    }
  }

  async function refreshTopologyValidationData() {
    await Promise.all([options.store.loadProducts(true), options.store.loadInstances(true)])
  }

  function buildPersistedFlow() {
    return options.exportCurrentFlow()
  }

  function validatePersistedFlow(flow: ModelFlowData) {
    return validateTopologyForPersistence(flow, options.store.products, persistenceValidationOptions())
  }

  function updateFixedBinding(kind: 'station' | 'environment', value: ModelInstanceBinding | null) {
    if (kind === 'station') options.fixedStationBinding.value = value
    else options.fixedEnvironmentBinding.value = value
    if (!options.isViewMode.value) {
      options.hasUnsavedChanges.value = true
      options.store.hasUnsavedChanges = true
    }
  }

  async function runAutoLayout(layoutOptions?: {
    markDirty?: boolean
    fitView?: boolean
    silent?: boolean
  }): Promise<boolean> {
    await nextTick()
    const currentNodes = options.getFlowNodes()
    const currentEdges = options.getFlowEdges()

    if (!currentNodes.length) {
      if (!layoutOptions?.silent) ElMessage.warning('No nodes on canvas')
      return false
    }

    const laidOut = layoutModelGraph(currentNodes, currentEdges, 'TB')
    const clonedNodes = JSON.parse(JSON.stringify(laidOut)) as FlowNode[]
    const clonedEdges = JSON.parse(
      JSON.stringify(alignEdgeHandlesToLayout(clonedNodes, currentEdges)),
    ) as FlowEdge[]
    options.setRestoring(true)
    options.setNodes(clonedNodes)
    options.setEdges(clonedEdges)
    await nextTick()
    options.nodes.value = (options.toObject().nodes ?? clonedNodes) as FlowNode[]
    options.edges.value = options.normalizeFlowEdges(
      (options.toObject().edges ?? clonedEdges) as FlowEdge[],
      clonedNodes,
    )
    options.setRestoring(false)

    if (layoutOptions?.markDirty) {
      options.markDirty()
      options.saveSnapshot()
    }
    if (layoutOptions?.fitView !== false) {
      await waitForCanvasLayout()
      options.fitFlowToViewport(!!layoutOptions?.fitView)
    }
    return true
  }

  async function hydrateCanvasFromFlow(rawFlow: ModelFlowData) {
    const flow = repairMissingFlowEdges(rawFlow)
    const resolveFixedBinding = (instanceId: number | null, productName?: string) => {
      if (!instanceId) return null
      const instance = options.store.instances.find((item) => item.instance_id === instanceId)
      return {
        instanceId,
        instanceName: instance?.instance_name ?? '',
        productName: instance?.product_name ?? productName,
      }
    }
    options.fixedStationBinding.value = resolveFixedBinding(
      flow.fixedBindings?.stationInstanceId ?? null,
      options.primaryTopLevelProduct.value?.product_name,
    )
    options.fixedEnvironmentBinding.value = resolveFixedBinding(
      flow.fixedBindings?.environmentInstanceId ?? null,
      options.secondaryTopLevelProduct.value?.product_name,
    )
    const topologyNodes = flow.nodes as FlowNode[]
    const nodesWithImages = enrichTopologyNodesWithImages(topologyNodes, options.store.products)
    const flowEdges = options.normalizeFlowEdges(flow.edges as FlowEdge[], nodesWithImages)
    await options.applyFlowState(nodesWithImages, flowEdges)
  }

  async function restoreToSavedSnapshot() {
    try {
      await options.store.loadStationTopology(true)
    } catch {
      ElMessage.error('Failed to reload saved topology')
      return false
    }
    const model = options.store.getModelById(modelId)
    if (!model?.flowJson) {
      ElMessage.warning('No saved baseline to restore')
      options.hasUnsavedChanges.value = false
      return false
    }
    await hydrateCanvasFromFlow(model.flowJson)
    options.selectedNode.value = null
    options.selectedEdgeId.value = null
    options.flowHistory.clear()
    options.hasUnsavedChanges.value = false
    options.store.hasUnsavedChanges = false
    await options.captureSavedSnapshot()
    return true
  }

  async function enterEditMode() {
    options.isCanvasLoading.value = true
    try {
      const restored = await restoreToSavedSnapshot()
      if (!restored) return
      options.isViewMode.value = false
      options.selectedNode.value = null
      options.selectedEdgeId.value = null
      options.flowHistory.clear()
      options.hasUnsavedChanges.value = false
      options.store.hasUnsavedChanges = false
      await waitForCanvasLayout()
      options.pushUndoSnapshot()
    } finally {
      options.isCanvasLoading.value = false
    }
  }

  async function exitEditMode() {
    options.isCanvasLoading.value = true
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    try {
      options.isViewMode.value = true
      options.selectedNode.value = null
      options.selectedEdgeId.value = null
      await waitForCanvasLayout()
      options.fitFlowToViewport(true)
    } finally {
      options.isCanvasLoading.value = false
    }
  }

  async function handleExitEdit() {
    try {
      if (options.hasUnsavedChanges.value) {
        await ElMessageBox.confirm(
          'You have unsaved changes. Discard them and exit edit mode?',
          'Unsaved Changes',
          {
            confirmButtonText: 'Discard',
            cancelButtonText: 'Keep Editing',
            type: 'warning',
            center: true,
            showClose: false,
            appendTo: document.body,
            customClass: 'visual-modeling-confirm-box',
          },
        )
      }
      const restored = await restoreToSavedSnapshot()
      if (restored) await exitEditMode()
    } catch {
      // keep editing
    }
  }

  async function handleRestoreToSaved() {
    if (!options.hasUnsavedChanges.value) {
      ElMessage.info('Already matches the last saved state')
      return
    }
    try {
      await ElMessageBox.confirm(
        'Restore canvas to the last saved state? Unsaved edits will be lost.',
        'Restore',
        {
          confirmButtonText: 'Restore',
          cancelButtonText: 'Cancel',
          type: 'warning',
          center: true,
          showClose: false,
          appendTo: document.body,
          customClass: 'visual-modeling-confirm-box',
        },
      )
      const ok = await restoreToSavedSnapshot()
      if (ok) ElMessage.success('Restored to last saved state')
    } catch {
      // cancelled
    }
  }

  function toggleFullscreen() {
    options.isFullscreen.value = !options.isFullscreen.value
    nextTick(() => options.fitFlowToViewport(true))
  }

  async function handleAutoLayout() {
    try {
      const ok = await runAutoLayout({ markDirty: true, fitView: true })
      if (ok) ElMessage.success('Auto layout completed')
    } catch (err) {
      console.error(err)
      ElMessage.error('Auto layout failed')
    }
  }

  async function handleSave() {
    await refreshTopologyValidationData()
    await options.syncEdgesFromFlow()
    const flow = buildPersistedFlow()

    const validation = validatePersistedFlow(flow)
    if (!validation.canSave) {
      await options.topologyIssuesDialogRef.value?.open({
        mode: 'save-blocked',
        issues: validation.issues,
      })
      return
    }

    if (validation.warnings.length) {
      const proceed = await options.topologyIssuesDialogRef.value?.open({
        mode: 'save-confirm',
        issues: validation.issues,
      })
      if (!proceed) return
    }

    const ok = await options.store.saveFlowJson(modelId, flow)
    if (!ok) {
      ElMessage.error('Failed to save topology')
      return
    }
    options.hasUnsavedChanges.value = false
    options.store.hasUnsavedChanges = false
    await options.captureSavedSnapshot()
    ElMessage.success('Saved successfully')
  }

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null
    const isEditableTarget =
      target?.isContentEditable ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.tagName === 'SELECT'

    if (options.isViewMode.value) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        e.stopPropagation()
      }
      return
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && !isEditableTarget) {
      const hasSelectedElements =
        options.getNodes.value.some(
          (node) => (node as FlowNode & { selected?: boolean }).selected,
        ) ||
        options.getFlowEdges().some((edge) => (edge as FlowEdge & { selected?: boolean }).selected)
      if (hasSelectedElements) {
        e.preventDefault()
        e.stopPropagation()
        options.removeSelectedElements()
        return
      }
    }

    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    if (e.key === 's') {
      e.preventDefault()
      void handleSave()
    }
  }

  async function initEditorCanvas() {
    try {
      await Promise.all([
        options.store.loadStationTopology(true),
        options.store.loadInstances(true),
        options.store.loadProducts(true),
      ])
    } catch (err) {
      console.error('[TopologyConfig] load topology failed', err)
      ElMessage.error('Failed to load station topology')
      return
    }
    const model = options.store.getModelById(modelId)
    if (!model) {
      ElMessage.warning('Station topology not loaded')
      return
    }

    let flow: ModelFlowData = model.flowJson ?? { nodes: [], edges: [] }
    const isNewFlow = isEmptyFlow(flow)

    if (isNewFlow) {
      flow = { nodes: [], edges: [], fixedBindings: flow.fixedBindings }
    }

    flow = repairMissingFlowEdges(flow)

    options.store.setCurrentModel(modelId)
    setModelFlowProductRules(options.store.products)
    await hydrateCanvasFromFlow(flow)

    options.setRestoring(true)
    await nextTick()
    options.setRestoring(false)

    if (isNewFlow) {
      await options.syncEdgesFromFlow()
      const flowToPersist = buildPersistedFlow()
      if (validatePersistedFlow(flowToPersist).canSave) {
        await options.store.saveFlowJson(modelId, flowToPersist)
      }
    }

    await options.captureSavedSnapshot()
    options.hasUnsavedChanges.value = false
    options.isViewMode.value = true

    await nextTick()
    requestAnimationFrame(() => {
      options.fitFlowToViewport(false)
    })
  }

  onBeforeRouteLeave(async () => {
    if (!options.hasUnsavedChanges.value) return true
    try {
      await ElMessageBox.confirm(
        'The canvas has unsaved changes. Leave this page without saving?',
        'Unsaved Changes',
        {
          confirmButtonText: 'Leave',
          cancelButtonText: 'Stay',
          type: 'warning',
          center: true,
          showClose: false,
          appendTo: document.body,
          customClass: 'visual-modeling-confirm-box',
        },
      )
      options.hasUnsavedChanges.value = false
      options.store.hasUnsavedChanges = false
      return true
    } catch {
      return false
    }
  })

  return {
    topologyValidationOptions,
    persistenceValidationOptions,
    refreshTopologyValidationData,
    buildPersistedFlow,
    validatePersistedFlow,
    updateFixedBinding,
    hydrateCanvasFromFlow,
    restoreToSavedSnapshot,
    enterEditMode,
    exitEditMode,
    handleExitEdit,
    handleRestoreToSaved,
    toggleFullscreen,
    handleAutoLayout,
    handleSave,
    onKeydown,
    initEditorCanvas,
  }
}
