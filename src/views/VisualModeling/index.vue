<template>
  <div
    class="voltage-class rule-management modeling-editor"
    :class="{ 'is-fullscreen': isFullscreen, 'is-editing': !isViewMode }"
  >
    <ModelingToolbar
      :is-view-mode="isViewMode"
      :is-fullscreen="isFullscreen"
      :export-loading="exportLoading"
      @toggle-fullscreen="toggleFullscreen"
      @export="handleExportCommand"
      @enter-edit="enterEditMode"
      @auto-layout="handleAutoLayout"
      @import="handleImportClick"
      @exit-edit="handleExitEdit"
    />

    <div class="modeling-editor__body">
      <div v-if="!isViewMode" class="modeling-editor__left-panel">
        <LeftPanel />
      </div>

      <ModelingCanvas
        ref="modelingCanvasRef"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :is-view-mode="isViewMode"
        :is-canvas-loading="isCanvasLoading"
        :has-unsaved-changes="hasUnsavedChanges"
        :fixed-station-binding="fixedStationBinding"
        :fixed-environment-binding="fixedEnvironmentBinding"
        :station-label="primaryTopLevelProduct?.product_name ?? ''"
        :environment-label="secondaryTopLevelProduct?.product_name ?? ''"
        :show-environment="!!secondaryTopLevelProduct"
        :station-instances="stationInstances"
        :environment-instances="environmentInstances"
        :viewport="viewport"
        :mini-map-node-color="miniMapNodeColor"
        :mini-map-node-stroke-color="miniMapNodeStrokeColor"
        :fit-view="fitView"
        :zoom-in="zoomIn"
        :zoom-out="zoomOut"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @connect="handleConnectGuard"
        @node-click="handleNodeClick"
        @edge-click="handleEdgeClickGuard"
        @pane-click="handlePaneClick"
        @update:fixed-station-binding="updateFixedBinding('station', $event)"
        @update:fixed-environment-binding="updateFixedBinding('environment', $event)"
        @restore="handleRestoreToSaved"
        @save="handleSave"
      />

    </div>

    <!-- 隐藏的 import input -->
    <input
      ref="importInput"
      type="file"
      accept="application/json"
      style="display:none"
      @change="handleImportChange"
    />

    <TopologyIssuesDialog ref="topologyIssuesDialogRef" />
  </div>
</template>

<script setup lang="ts">
import LeftPanel from './components/LeftPanel.vue'
import ModelingToolbar from './components/ModelingToolbar.vue'
import ModelingCanvas from './components/ModelingCanvas.vue'
import { useFlowHistory } from '@/composables/flow/useFlowHistory'
import { useFlowViewport } from '@/composables/flow/useFlowViewport'
import { ref, markRaw, computed, onMounted, onUnmounted, nextTick, provide, defineComponent, h } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useVueFlow,
  type Connection,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeChange,
  type EdgeChange,
  type NodeTypesObject,
  type EdgeTypesObject,
} from '@vue-flow/core'
import TopologyNode from './components/customNodes/TopologyNode.vue'
import DeletableSmoothStepEdge from './components/customEdges/DeletableSmoothStepEdge.vue'
import useModelDnd from './useModelDnd'
import { normalizeTopologyEdges } from './composables/useTopologyEdges'
import { topologyMiniMapColor, topologyMiniMapStrokeColor } from './composables/useTopologyMinimap'
import { useTopologyPersistence } from './composables/useTopologyPersistence'

import { useVisualModelingStore, STATION_EDITOR_ID } from '@/stores/visualModeling'
import { alignEdgeHandlesToLayout, getGroupContentLayout, layoutModelGraph } from './useModelLayout'
import {
  createDefaultModelFlow,
  createFlowEdgeId,
  isEmptyFlow,
  repairMissingFlowEdges,
} from '@/utils/defaultModelFlow'
import type { ModelFlowData, ModelInstanceBinding } from '@/types/visualModeling'
import {
  getConnectionRuleHint,
  hasEdgeBetweenNodesEitherDirection,
  resolveConnectionEndpoints,
} from '@/utils/modelFlowRules'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import { toPng } from 'html-to-image'
import type { ModelFlowNode } from '@/types/visualModeling'
import { MODELING_EDITOR_KEY } from './modelingEditorContext'
import { collectBoundInstanceIds, collectNodesToDelete, normalizeNodeInstances } from '@/utils/visualModeling'
import { normalizeTopology, validateTopologyForPersistence, validateTopologyImport } from '@/utils/topologyNormalize'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import TopologyIssuesDialog from './components/dialogs/TopologyIssuesDialog.vue'
import { isFlowSnapshotEqual } from '@/utils/flowSnapshot'
import { enrichFlowWithLiveChannelBindings } from '@/utils/topologyChannelBindings'
import messageWarningIcon from '@/assets/icons/message-warning.svg'

const MessageWarningIcon = defineComponent({
  name: 'MessageWarningIcon',
  setup() {
    return () => h('img', {
      src: messageWarningIcon,
      alt: '',
      'aria-hidden': 'true',
      style: 'width: 24px; height: 24px; object-fit: contain;',
    })
  },
})

const store = useVisualModelingStore()
const modelId = STATION_EDITOR_ID
const isCanvasLoading = ref(true)

const waitForCanvasLayout = async () => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}
const { onDragOver, onDragLeave, onDrop } = useModelDnd()
const fixedStationBinding = ref<ModelInstanceBinding | null>(null)
const fixedEnvironmentBinding = ref<ModelInstanceBinding | null>(null)
const topLevelProducts = computed(() =>
  store.products.filter((product) => product.topology?.enabled && product.topology?.type === 'top-level'),
)
const primaryTopLevelProduct = computed(() =>
  topLevelProducts.value.find((product) => product.parent_name === null) ?? topLevelProducts.value[0],
)
const secondaryTopLevelProduct = computed(() =>
  topLevelProducts.value.find((product) => product.product_name !== primaryTopLevelProduct.value?.product_name),
)
const stationInstances = computed(() => store.instances.filter(
  (item) => item.product_name === primaryTopLevelProduct.value?.product_name
    && (item.instance_id !== fixedEnvironmentBinding.value?.instanceId
      || item.instance_id === fixedStationBinding.value?.instanceId),
))
const environmentInstances = computed(() => store.instances.filter(
  (item) => item.product_name === secondaryTopLevelProduct.value?.product_name
    && (item.instance_id !== fixedStationBinding.value?.instanceId
      || item.instance_id === fixedEnvironmentBinding.value?.instanceId),
))

const {
  setNodes,
  setEdges,
  addEdges,
  applyEdgeChanges,
  onNodesChange,
  onEdgesChange,
  toObject,
  fitView,
  zoomIn,
  zoomOut,
  viewport,
  getNodes,
  updateNode,
  updateNodeInternals,
} = useVueFlow()

// ---- 节点类型注册（markRaw 避免 Vue Flow 节点被深度响应式包装）----
const nodeTypes = {
  station: markRaw(TopologyNode),
  product: markRaw(TopologyNode),
  group: markRaw(TopologyNode),
} as unknown as NodeTypesObject

const edgeTypes = {
  'deletable-smoothstep': markRaw(DeletableSmoothStepEdge),
} as unknown as EdgeTypesObject

// ---- 连线类型定义 ----
// ---- 基础状态 ----
const nodes = ref<FlowNode[]>([])
const edges = ref<FlowEdge[]>([])
const isViewMode = ref(true)
const isFullscreen = ref(false)
const hasUnsavedChanges = ref(false)
const selectedNode = ref<ModelFlowNode | null>(null)
const selectedEdgeId = ref<string | null>(null)
const expandedNodeIds = ref(new Set<string>())
const importInput = ref<HTMLInputElement | null>(null)
const modelingCanvasRef = ref<InstanceType<typeof ModelingCanvas> | null>(null)
const exportLoading = ref(false)
const topologyIssuesDialogRef = ref<InstanceType<typeof TopologyIssuesDialog> | null>(null)

const miniMapNodeColor = topologyMiniMapColor
const miniMapNodeStrokeColor = topologyMiniMapStrokeColor

function setNodeExpanded(nodeId: string, expanded: boolean) {
  const next = new Set(expandedNodeIds.value)
  if (expanded) next.add(nodeId)
  else next.delete(nodeId)
  expandedNodeIds.value = next

  const group = getFlowNodes().find((node) => node.id === nodeId)
  if (!group) return
  const children = getFlowNodes().filter((node) => node.parentNode === nodeId)
  const topologyType = String((group.data as { topologyType?: string })?.topologyType ?? '')
  const isContainer = topologyType === 'container' || (group.data as { isContainer?: boolean }).isContainer === true
  const layout = getGroupContentLayout(children, expanded, isContainer)
  const groupWidth = Number((group.data as { width?: number }).width ?? 280)
  const groupHeight = Number(
    (group.data as { height?: number }).height
      ?? (parseFloat(String((group.style as Record<string, unknown> | undefined)?.height ?? '254')) || 254),
  )
  const nextGroupBottom = group.position.y + layout.size.height
  const previousGroupBottom = group.position.y + groupHeight
  const expansionDelta = Math.max(0, nextGroupBottom - previousGroupBottom)

  function getNodeWidth(node: FlowNode): number {
    return Number(
      (node.data as { width?: number }).width
        ?? (parseFloat(String((node.style as Record<string, unknown> | undefined)?.width ?? '280')) || 280),
    )
  }

  const shouldMoveBelowExpandedGroup = (node: FlowNode) => {
    if (!expanded || !expansionDelta || node.id === nodeId || node.parentNode) return false
    const nodeRight = node.position.x + getNodeWidth(node)
    const groupRight = group.position.x + groupWidth
    const overlapsHorizontally = node.position.x < groupRight && nodeRight > group.position.x
    const startsBelowPreviousGroup = node.position.y >= previousGroupBottom - 12
    const overlapsNewGroup = node.position.y < nextGroupBottom
    return overlapsHorizontally && startsBelowPreviousGroup && overlapsNewGroup
  }

  // Keep the parent size and all child visibility/positions in one state update.
  // Calling updateNode separately can be overwritten by the controlled nodes
  // prop during an expand, leaving a child rendered outside its group.
  const nextNodes = getFlowNodes().map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: { ...node.data, uiExpanded: expanded, width: layout.size.width, height: layout.size.height },
        style: {
          ...(node.style as Record<string, string | number>),
          width: `${layout.size.width}px`,
          height: `${layout.size.height}px`,
        },
      }
    }

    if (shouldMoveBelowExpandedGroup(node)) {
      return {
        ...node,
        position: { ...node.position, y: node.position.y + expansionDelta + 24 },
      }
    }

    if (node.parentNode !== nodeId) return node

    return {
      ...node,
      position: layout.positions.get(node.id) ?? node.position,
      // Child cards are rendered inside the group card. Keep their Vue Flow
      // nodes hidden so they cannot escape the group's visual bounds.
      hidden: true,
    }
  })

  setNodes(nextNodes)
  nodes.value = nextNodes
  void nextTick().then(() => {
    requestAnimationFrame(() => updateNodeInternals([nodeId]))
  })
}

function collapseAllGroups() {
  getFlowNodes()
    .filter((node) => node.type === 'group')
    .forEach((node) => setNodeExpanded(node.id, false))
}

provide(MODELING_EDITOR_KEY, {
  isViewMode,
  instances: computed(() => store.instances),
  expandedNodeIds,
  setNodeExpanded,
  notifyFlowChanged: () => {
    if (isViewMode.value || isRestoringHistory) return
    void nextTick().then(() => {
      nodes.value = getFlowNodes()
      markDirty()
      saveSnapshot()
    })
  },
  getBoundInstanceIdsExcluding: (nodeId: string) => {
    const ids = collectBoundInstanceIds(getFlowNodes(), nodeId)
    if (fixedStationBinding.value?.instanceId && nodeId !== 'fixed-station') {
      ids.add(fixedStationBinding.value.instanceId)
    }
    if (fixedEnvironmentBinding.value?.instanceId && nodeId !== 'fixed-environment') {
      ids.add(fixedEnvironmentBinding.value.instanceId)
    }
    return ids
  },
  updateNodeData: (nodeId, data) => {
    const current = getFlowNodes().find((node) => node.id === nodeId)
    if (!current) return
    updateNode(nodeId, { data: { ...current.data, ...data } })
    markDirty()
    void nextTick().then(() => saveSnapshot())
  },
  deleteNode: handleDeleteNode,
})

function topologyValidationOptions() {
  return {
    resolveChannelIds: (nodeId: string, instanceId: number) =>
      store.getLiveChannelIds(nodeId, instanceId),
  }
}


function persistenceValidationOptions(useCurrentFixedBindings = true) {
  return {
    ...topologyValidationOptions(),
    ...(useCurrentFixedBindings
      ? {
          fixedBindings: {
            station: fixedStationBinding.value,
            environment: fixedEnvironmentBinding.value,
          },
        }
      : {}),
    instances: store.instances,
    stationProductName: primaryTopLevelProduct.value?.product_name,
    environmentProductName: secondaryTopLevelProduct.value?.product_name,
    requireEnvironmentBinding: !!secondaryTopLevelProduct.value,
  }
}

async function refreshTopologyValidationData() {
  await Promise.all([
    store.loadProducts(true),
    store.loadInstances(true),
  ])
}

function buildPersistedFlow() {
  return enrichFlowWithLiveChannelBindings(exportCurrentFlow(), store.channelBindings)
}

function validatePersistedFlow(flow: ModelFlowData) {
  return validateTopologyForPersistence(flow, store.products, persistenceValidationOptions())
}
// ---- 撤销/重做 ----
let isRestoringHistory = false
/** 上次已保存/加载时的画布基线（× 恢复目标） */
const savedSnapshot = ref<{ nodes: FlowNode[]; edges: FlowEdge[] } | null>(null)

function markDirty() {
  if (isViewMode.value) return
  const dirty = !isSameAsSavedSnapshot()
  hasUnsavedChanges.value = dirty
  store.hasUnsavedChanges = dirty
}

function getFlowNodes(): FlowNode[] {
  const fromRef = nodes.value
  const fromFlow = getNodes.value as FlowNode[]
  return (fromRef.length >= fromFlow.length ? fromRef : fromFlow) as FlowNode[]
}

function getFlowEdges(): FlowEdge[] {
  const fromRef = edges.value
  const fromFlow = toObject().edges as FlowEdge[]
  const pick = fromRef.length >= fromFlow.length ? fromRef : fromFlow
  return JSON.parse(JSON.stringify(pick)) as FlowEdge[]
}

const flowHistory = useFlowHistory({
  enabled: () => !isViewMode.value && !isRestoringHistory,
  capture: () => ({ nodes: getFlowNodes(), edges: getFlowEdges() }),
  restore: async (snapshot) => {
    await applyFlowState(snapshot.nodes as FlowNode[], snapshot.edges as FlowEdge[])
    selectedNode.value = null
    selectedEdgeId.value = null
    markDirty()
  },
})
// const { snapshots, snapIdx, canUndo, canRedo } = flowHistory

/** 将 Vue Flow 内部边同步到本地 ref（单向绑定时以内部状态为准） */
const { syncEdgesFromFlow, exportCurrentFlow } = useTopologyPersistence({
  toObject,
  getNodes: getFlowNodes,
  getEdges: getFlowEdges,
  normalizeEdges: normalizeFlowEdges,
  setEdges,
  updateEdges: (next) => { edges.value = next as FlowEdge[] },
  fixedBindings: () => ({ station: fixedStationBinding.value, environment: fixedEnvironmentBinding.value }),
  saveFlow: (flow) => store.saveFlowJson(modelId, flow),
})

function updateFixedBinding(
  kind: 'station' | 'environment',
  value: ModelInstanceBinding | null,
) {
  if (kind === 'station') fixedStationBinding.value = value
  else fixedEnvironmentBinding.value = value
  if (!isViewMode.value) {
    hasUnsavedChanges.value = true
    store.hasUnsavedChanges = true
  }
}

async function captureSavedSnapshot(): Promise<boolean> {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const flowNodes = getFlowNodes()
  const flowEdges = getFlowEdges()
  savedSnapshot.value = {
    nodes: JSON.parse(JSON.stringify(flowNodes)),
    edges: JSON.parse(JSON.stringify(flowEdges)),
  }
  return true
}

function isSameAsSavedSnapshot(): boolean {
  if (!savedSnapshot.value) return false
  return isFlowSnapshotEqual(
    { nodes: getFlowNodes(), edges: getFlowEdges() },
    { nodes: savedSnapshot.value.nodes as FlowNode[], edges: savedSnapshot.value.edges as FlowEdge[] },
  )
}

function pushUndoSnapshot() {
  flowHistory.saveSnapshot()
}

function saveSnapshot() {
  pushUndoSnapshot()
  markDirty()
}

function removeNodesByIds(idsToRemove: string[]) {
  const idSet = new Set(idsToRemove)
  const currentNodes = getFlowNodes()
  const nextNodes = currentNodes.filter((n) => !idSet.has(n.id))
  const nextEdges = getFlowEdges().filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
  isRestoringHistory = true
  setNodes(nextNodes)
  setEdges(nextEdges)
  void nextTick().then(() => {
    nodes.value = (toObject().nodes ?? nextNodes) as FlowNode[]
    edges.value = normalizeFlowEdges((toObject().edges ?? nextEdges) as FlowEdge[])
    if (selectedNode.value && idSet.has(selectedNode.value.id)) {
      selectedNode.value = null
    }
    isRestoringHistory = false
    markDirty()
    saveSnapshot()
  })
}

function removeSelectedElements() {
  const currentNodes = getNodes.value as FlowNode[]
  const currentEdges = getFlowEdges()
  const selectedNodeIds = currentNodes
    .filter((node) => (node as FlowNode & { selected?: boolean }).selected)
    .map((node) => node.id)

  if (selectedNodeIds.some((id) => currentNodes.find((node) => node.id === id)?.type === 'station')) {
    ElMessage.warning('Station node cannot be deleted')
    return
  }

  const nodeIds = new Set<string>()
  for (const id of selectedNodeIds) {
    for (const childId of collectNodesToDelete(id, currentNodes)) nodeIds.add(childId)
  }
  const edgeIds = new Set(
    currentEdges.filter((edge) => (edge as FlowEdge & { selected?: boolean }).selected).map((edge) => edge.id),
  )

  if (!nodeIds.size && !edgeIds.size) return

  const nextNodes = currentNodes.filter((node) => !nodeIds.has(node.id))
  const nextEdges = currentEdges.filter(
    (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
  )

  isRestoringHistory = true
  setNodes(nextNodes)
  setEdges(nextEdges)
  selectedNode.value = null
  selectedEdgeId.value = null
  void nextTick().then(() => {
    nodes.value = (toObject().nodes ?? nextNodes) as FlowNode[]
    edges.value = normalizeFlowEdges((toObject().edges ?? nextEdges) as FlowEdge[])
    isRestoringHistory = false
    markDirty()
    saveSnapshot()
  })
}

function onNodesChangeHandler(changes: NodeChange[]) {
  if (isViewMode.value || isRestoringHistory) return

  const removeChanges = changes.filter((c) => c.type === 'remove')
  if (removeChanges.length > 0) {
    const snapshotNodes = JSON.parse(
      JSON.stringify(nodes.value.length ? nodes.value : getFlowNodes()),
    ) as FlowNode[]
    const stationIds = new Set(
      snapshotNodes.filter((n) => n.type === 'station').map((n) => n.id),
    )
    const removingStation = removeChanges.some((c) =>
      stationIds.has((c as { id: string }).id),
    )
    if (removingStation) {
      ElMessage.warning('Station node cannot be deleted')
      isRestoringHistory = true
      setNodes(snapshotNodes)
      void nextTick(() => {
        nodes.value = snapshotNodes
        isRestoringHistory = false
      })
      return
    }

    const currentNodes = getFlowNodes()
    const extraIds = new Set<string>()
    for (const change of removeChanges) {
      const id = (change as { id: string }).id
      for (const childId of collectNodesToDelete(id, currentNodes)) {
        if (childId !== id && currentNodes.some((n) => n.id === childId)) {
          extraIds.add(childId)
        }
      }
    }
    if (extraIds.size > 0) {
      const removedIds = removeChanges.map((c) => (c as { id: string }).id)
      removeNodesByIds([...removedIds, ...extraIds])
      return
    }
  }

  const meaningful = changes.some(
    (c) =>
      c.type === 'position'
      || c.type === 'add'
      || c.type === 'remove'
      || c.type === 'dimensions',
  )
  if (!meaningful) return
  void nextTick().then(() => {
    nodes.value = (toObject().nodes ?? nodes.value) as FlowNode[]
  })
  markDirty()
  saveSnapshot()
}

function purgeInvalidFlowEdges() {
  const current = (toObject().edges ?? []) as FlowEdge[]
  const valid = current.filter((e) => e?.id && e.source && e.target)
  if (valid.length === current.length) return
  const normalized = normalizeFlowEdges(valid)
  setEdges(normalized)
  edges.value = normalized
}

function onEdgesChangeHandler(changes: EdgeChange[]) {
  const list = changes || []
  const safe = list.filter((change) => {
    if (change.type !== 'add') return true
    const item = (change as { item?: FlowEdge }).item
    return !!(item?.source && item?.target)
  })

  if (safe.length) {
    applyEdgeChanges(safe)
  }

  if (safe.length !== list.length) {
    purgeInvalidFlowEdges()
  }

  if (isViewMode.value || isRestoringHistory) return
  const meaningful = safe.filter((c) => c.type !== 'select')
  if (!meaningful.some((c) => c.type === 'add' || c.type === 'remove')) return

  void nextTick().then(() => {
    purgeInvalidFlowEdges()
    edges.value = normalizeFlowEdges((toObject().edges ?? []) as FlowEdge[])
    markDirty()
    saveSnapshot()
  })
}

onNodesChange(onNodesChangeHandler)
onEdgesChange(onEdgesChangeHandler)

function enrichNodesWithImages(flowNodes: FlowNode[]): FlowNode[] {
  const nodeById = new Map(flowNodes.map((node) => [node.id, node]))
  return flowNodes.map((node) => {
    if (!node.parentNode) return node
    const parentProductName = (nodeById.get(node.parentNode)?.data as { productName?: string } | undefined)?.productName
    const parentProduct = store.products.find((product) => product.product_name === parentProductName)
    const componentName = (node.data as { productName?: string } | undefined)?.productName
    const component = parentProduct?.topology?.components?.find(
      (item) => (item.productName ?? item.name) === componentName,
    )
    if (!component) return node
    return {
      ...node,
      data: {
        ...node.data,
        selectableProductTypes: component.selectableProductTypes ?? [],
      },
    }
  })
}

async function hydrateCanvasFromFlow(
  rawFlow: ModelFlowData,
  options?: { autoLayout?: boolean },
) {
  const flow = repairMissingFlowEdges(rawFlow)
  if (flow.fixedBindings) {
    fixedStationBinding.value = flow.fixedBindings.station ?? null
    fixedEnvironmentBinding.value = flow.fixedBindings.environment ?? null
  }
  const fixedNodeIds = new Set<string>()
  const topologyNodes = (flow.nodes as FlowNode[]).filter((node) => {
    const productName = String((node.data as { productName?: string })?.productName ?? '')
    const isPrimaryTopLevel = productName === primaryTopLevelProduct.value?.product_name
    const isSecondaryTopLevel = productName === secondaryTopLevelProduct.value?.product_name
    const isFixed = isPrimaryTopLevel || isSecondaryTopLevel
    if (isFixed) {
      fixedNodeIds.add(node.id)
      const binding = normalizeNodeInstances(node.data as ModelFlowNode['data'])[0] ?? null
      if (isPrimaryTopLevel) fixedStationBinding.value = binding
      if (isSecondaryTopLevel) fixedEnvironmentBinding.value = binding
    }
    return !isFixed
  })
  const nodesWithImages = enrichNodesWithImages(topologyNodes)
  const topologyEdges = (flow.edges ?? []).filter(
    (edge) => !fixedNodeIds.has(edge.source) && !fixedNodeIds.has(edge.target),
  )
  const flowEdges = normalizeFlowEdges(topologyEdges as FlowEdge[], nodesWithImages)
  await applyFlowState(nodesWithImages, flowEdges)
  if (options?.autoLayout) {
    const preservedEdges = JSON.parse(JSON.stringify(getFlowEdges())) as FlowEdge[]
    await runAutoLayout({ silent: true, fitView: false, markDirty: false })
    const nodeIds = new Set(getFlowNodes().map((n) => n.id))
    const safe = normalizeFlowEdges(preservedEdges).filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    )
    isRestoringHistory = true
    setEdges(safe)
    await nextTick()
    edges.value = normalizeFlowEdges((toObject().edges ?? safe) as FlowEdge[])
    isRestoringHistory = false
  }
}

// ---- 查看 / 编辑模式：× 恢复到最近一次已持久化的拓扑 ----
async function restoreToSavedSnapshot() {
  try {
    await store.loadStationTopology(true)
  } catch {
    ElMessage.error('Failed to reload saved topology')
    return false
  }
  const model = store.getModelById(modelId)
  if (!model?.flowJson) {
    ElMessage.warning('No saved baseline to restore')
    hasUnsavedChanges.value = false
    return false
  }
  await hydrateCanvasFromFlow(model.flowJson, { autoLayout: false })
  collapseAllGroups()
  selectedNode.value = null
  selectedEdgeId.value = null
  flowHistory.clear()
  hasUnsavedChanges.value = false
  store.hasUnsavedChanges = false
  await captureSavedSnapshot()
  return true
}

async function enterEditMode() {
  isCanvasLoading.value = true
  try {
    const restored = await restoreToSavedSnapshot()
    if (!restored) return
    await store.loadChannelBindings(true)
    collapseAllGroups()
    isViewMode.value = false
    selectedNode.value = null
    selectedEdgeId.value = null
    flowHistory.clear()
    hasUnsavedChanges.value = false
    store.hasUnsavedChanges = false
    await waitForCanvasLayout()
    pushUndoSnapshot()
  } finally {
    isCanvasLoading.value = false
  }
}

async function exitEditMode() {
  isCanvasLoading.value = true
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  try {
    collapseAllGroups()
    isViewMode.value = true
    selectedNode.value = null
    selectedEdgeId.value = null
    await waitForCanvasLayout()
    fitFlowToViewport(true)
  } finally {
    isCanvasLoading.value = false
  }
}

async function handleExitEdit() {
  try {
    if (hasUnsavedChanges.value) {
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
  if (!hasUnsavedChanges.value) {
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
  isFullscreen.value = !isFullscreen.value
  nextTick(() => fitFlowToViewport(true))
}

// ---- 键盘快捷键 ----
function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const isEditableTarget = target?.isContentEditable
    || target?.tagName === 'INPUT'
    || target?.tagName === 'TEXTAREA'
    || target?.tagName === 'SELECT'

  if (isViewMode.value) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }

  if ((e.key === 'Backspace' || e.key === 'Delete') && !isEditableTarget) {
    const hasSelectedElements = getNodes.value.some((node) => (node as FlowNode & { selected?: boolean }).selected)
      || getFlowEdges().some((edge) => (edge as FlowEdge & { selected?: boolean }).selected)
    if (hasSelectedElements) {
      e.preventDefault()
      e.stopPropagation()
      removeSelectedElements()
      return
    }
  }

  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  if (e.key === 's') { e.preventDefault(); handleSave() }
}

function handleConnectGuard(connection: Connection) {
  if (isViewMode.value) return
  handleConnect(connection)
}

function handleEdgeClickGuard(event: any) {
  if (isViewMode.value) return
  handleEdgeClick(event)
}

// ---- 连线（父→子；允许从任意方向拖线并自动纠正）----
function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target) return

  const flowNodes = getFlowNodes()
  const flowEdges = getFlowEdges()
  const resolved = resolveConnectionEndpoints(connection, flowNodes)

  if (!resolved) {
    const source = flowNodes.find((n) => n.id === connection.source)
    const target = flowNodes.find((n) => n.id === connection.target)
    ElMessage.warning(getConnectionRuleHint(source, target, flowEdges))
    void nextTick().then(() => purgeInvalidFlowEdges())
    return
  }

  if (hasEdgeBetweenNodesEitherDirection(flowEdges, resolved.source.id, resolved.target.id)) {
    ElMessage.info('An edge already exists between these two nodes')
    void nextTick().then(() => purgeInvalidFlowEdges())
    return
  }

  const newEdge = normalizeFlowEdges([{
    id: createFlowEdgeId(),
    source: resolved.source.id,
    target: resolved.target.id,
    sourceHandle: resolved.sourceHandle,
    targetHandle: resolved.targetHandle,
  } as FlowEdge], flowNodes)[0]

  addEdges(newEdge)
  void nextTick().then(() => {
    edges.value = normalizeFlowEdges((toObject().edges ?? []) as FlowEdge[], getFlowNodes())

    markDirty()
    saveSnapshot()
  })
}

// ---- 节点点击：只更新选中状态，不改变当前画布视口 ----
function handleNodeClick(event: any) {
  selectedEdgeId.value = null
  const node = event.node ?? event
  const fresh = getFlowNodes().find((n) => n.id === node.id) ?? node
  if (fresh?.data) {
    selectedNode.value = {
      id: fresh.id,
      type: fresh.type,
      position: fresh.position,
      data: JSON.parse(JSON.stringify(fresh.data)),
      parentNode: fresh.parentNode,
      extent: fresh.extent,
      style: fresh.style,
    } as ModelFlowNode
  }
}

// ---- 边点击 ----
function handleEdgeClick(event: any) {
  selectedNode.value = null
  const edge = event.edge ?? event
  selectedEdgeId.value = edge?.id ?? null
}

// ---- 画布空白点击 ----
function handlePaneClick() {
  selectedNode.value = null
  selectedEdgeId.value = null
}

// ---- 删除节点 ----
function handleDeleteNode(id: string) {
  if (isViewMode.value) return
  const target = getFlowNodes().find((n) => n.id === id)
  if (target?.type === 'station') {
    ElMessage.warning('Station node cannot be deleted')
    return
  }
  // const childCount = collectNodesToDelete(id, getFlowNodes()).length - 1
  const message = 'Delete this node and its related connections?'
  ElMessageBox.confirm(message, 'Delete Node', {
    type: 'warning',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    center: true,
    showClose: false,
    icon: MessageWarningIcon,
    cancelButtonType : 'text',
    confirmButtonType : 'danger'
  })
    .then(() => {
      removeNodesByIds(collectNodesToDelete(id, getFlowNodes()))
    })
    .catch(() => {})
}

function normalizeFlowEdges(raw: FlowEdge[], flowNodes?: FlowNode[]): FlowEdge[] {
  return normalizeTopologyEdges(raw, flowNodes ?? getFlowNodes()) as FlowEdge[]
}

async function applyFlowState(
  nextNodes: FlowNode[],
  nextEdges: FlowEdge[],
  options?: { resetDirty?: boolean },
) {
  const clonedNodes = JSON.parse(JSON.stringify(nextNodes)) as FlowNode[]
  const clonedEdges = normalizeFlowEdges(
    JSON.parse(JSON.stringify(nextEdges)) as FlowEdge[],
    clonedNodes,
  )
  const nodeIds = new Set(clonedNodes.map((n) => n.id))
  const safeEdges = clonedEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

  isRestoringHistory = true
  setNodes(clonedNodes)
  setEdges(safeEdges)
  await nextTick()
  nodes.value = (toObject().nodes ?? clonedNodes) as FlowNode[]
  edges.value = normalizeFlowEdges((toObject().edges ?? safeEdges) as FlowEdge[])
  isRestoringHistory = false
  if (options?.resetDirty) {
    hasUnsavedChanges.value = false
  }
}

async function runAutoLayout(options?: {
  markDirty?: boolean
  fitView?: boolean
  silent?: boolean
}): Promise<boolean> {
  await nextTick()
  const currentNodes = getFlowNodes()
  const currentEdges = getFlowEdges()

  if (!currentNodes.length) {
    if (!options?.silent) ElMessage.warning('No nodes on canvas')
    return false
  }

  const laidOut = layoutModelGraph(currentNodes, currentEdges, 'TB')
  const clonedNodes = JSON.parse(JSON.stringify(laidOut)) as FlowNode[]
  const clonedEdges = JSON.parse(JSON.stringify(alignEdgeHandlesToLayout(clonedNodes, currentEdges))) as FlowEdge[]
  isRestoringHistory = true
  setNodes(clonedNodes)
  setEdges(clonedEdges)
  await nextTick()
  nodes.value = (toObject().nodes ?? clonedNodes) as FlowNode[]
  edges.value = normalizeFlowEdges((toObject().edges ?? clonedEdges) as FlowEdge[], clonedNodes)
  isRestoringHistory = false

  if (options?.markDirty) {
    markDirty()
    saveSnapshot()
  }
  if (options?.fitView !== false) {
    // Wait for node dimensions to be computed before fitting
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    fitFlowToViewport(!!options?.fitView)
  }
  return true
}

// ---- 自动布局 ----
async function handleAutoLayout() {
  try {
    const ok = await runAutoLayout({ markDirty: true, fitView: true })
    if (ok) ElMessage.success('Auto layout completed')
  } catch (err) {
    console.error(err)
    ElMessage.error('Auto layout failed')
  }
}

// ---- 保存 ----
async function handleSave() {
  await refreshTopologyValidationData()
  await syncEdgesFromFlow()
  const flow = buildPersistedFlow()

  const validation = validatePersistedFlow(flow)
  if (!validation.canSave) {
    await topologyIssuesDialogRef.value?.open({ mode: 'save-blocked', issues: validation.issues })
    return
  }

  const ok = await store.saveFlowJson(modelId, flow)
  if (!ok) {
    ElMessage.error('Failed to save topology')
    return
  }
  hasUnsavedChanges.value = false
  store.hasUnsavedChanges = false
  await captureSavedSnapshot()
  ElMessage.success('Saved successfully')
}
async function handleExportCommand(cmd: string) {
  if (exportLoading.value) return
  exportLoading.value = true
  try {
    if (cmd === 'json') await handleExportJson()
    if (cmd === 'png') await handleExportPng()
  } finally {
    exportLoading.value = false
  }
}

async function handleExportJson() {
  const model = store.getModelById(modelId)
  if (!model) return
  await syncEdgesFromFlow()
  const exportData = { ...model, flowJson: exportCurrentFlow() }
  const bytes = new TextEncoder().encode(JSON.stringify(exportData, null, 2))
  const saveResult = await saveBytesWithPreferredPath(bytes, `${model.name}.json`, 'application/json')
  ElMessage.success(`JSON exported: ${saveResult.displayPath}`)
}

async function handleExportPng() {
  const model = store.getModelById(modelId)
  const canvas = modelingCanvasRef.value?.getExportElement()
  if (!model || !canvas) {
    ElMessage.error('PNG export failed: canvas is not ready')
    return
  }

  const edgePaths = Array.from(canvas.querySelectorAll<SVGPathElement>(
    '.vue-flow__edge path, .vue-flow__edge-path',
  ))
  const originalEdgeStyles = edgePaths.map((path) => ({
    path,
    style: path.getAttribute('style'),
  }))

  // html-to-image does not reliably retain Vue Flow's stylesheet rule that
  // clears SVG path fills. Without an explicit fill, the cloned edge paths
  // use the SVG default (black) and turn into large opaque polygons.
  edgePaths.forEach((path) => {
    path.style.setProperty('fill', 'none', 'important')
    path.style.setProperty('stroke', '#B3CEFA', 'important')
    path.style.setProperty('stroke-width', '3', 'important')
  })

  try {
    const dataUrl = await toPng(canvas, {
      backgroundColor: '#fbfcff',
      cacheBust: true,
      pixelRatio: 2,
      filter: (node) => !(node instanceof HTMLElement && (
        node.classList.contains('modeling-editor__flow-controls')
        || node.classList.contains('modeling-editor__minimap')
        || node.classList.contains('modeling-editor__floating-actions')
      )),
    })
    const response = await fetch(dataUrl)
    const bytes = new Uint8Array(await response.arrayBuffer())
    const saveResult = await saveBytesWithPreferredPath(bytes, `${model.name}.png`, 'image/png')
    ElMessage.success(`PNG exported: ${saveResult.displayPath}`)
  } catch (error) {
    console.error('[VisualModeling] PNG export failed', error)
    ElMessage.error('PNG export failed')
  } finally {
    originalEdgeStyles.forEach(({ path, style }) => {
      if (style === null) path.removeAttribute('style')
      else path.setAttribute('style', style)
    })
  }
}

// ---- 导入 ----
function handleImportClick() { importInput.value?.click() }

function handleImportChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result as string)
      const flow = parsed.flowJson || parsed
      const rawNodes = Array.isArray(flow.nodes) ? flow.nodes : []
      const rawEdges = Array.isArray(flow.edges) ? flow.edges : []
      if (!rawNodes.length && !rawEdges.length) {
        ElMessage.error('Import failed: no node data found')
        return
      }

      await refreshTopologyValidationData()
      const importOptions = persistenceValidationOptions(false)
      const strictValidation = validateTopologyImport(flow, store.products, importOptions)
      if (!strictValidation.canSave) {
        void topologyIssuesDialogRef.value?.open({ mode: 'import', issues: strictValidation.issues })
        return
      }

      const normalized = normalizeTopology(
        flow as ModelFlowData,
        store.products,
        importOptions,
      )

      void (async () => {
        if (!normalized.canImport) {
          await topologyIssuesDialogRef.value?.open({
            mode: 'import',
            issues: normalized.issues,
            appliedFixes: normalized.appliedFixes,
          })
          return
        }

        if (normalized.warnings.length || normalized.appliedFixes.length) {
          const proceed = await topologyIssuesDialogRef.value?.open({
            mode: 'import',
            issues: normalized.issues,
            appliedFixes: normalized.appliedFixes,
          })
          if (!proceed) return
        }

        await hydrateCanvasFromFlow(normalized.flow)
        markDirty()
        saveSnapshot()
        ElMessage.success(
          normalized.appliedFixes.length
            ? 'Imported successfully (data was cleaned up)'
            : 'Imported successfully',
        )
      })()
    } catch {
      ElMessage.error('Import failed: invalid JSON')
    } finally {
      ;(e.target as HTMLInputElement).value = ''
    }
  }
  reader.readAsText(file)
}

// ---- 视口适配（避免 fit-view-on-init + 多次 fitView 导致首次打开画面缩放跳动）----
const { fitFlowToViewport, handleWindowResize: onWindowResize } = useFlowViewport({
  fitView,
  getNodes: () => getNodes.value,
  padding: 0.15,
  resizeDelay: 150,
})

async function initEditorCanvas() {
  try {
    await Promise.all([
      store.loadStationTopology(true),
      store.loadInstances(true),
      store.loadProducts(true),
      store.loadChannelBindings(true),
    ])
  } catch (err) {
    console.error('[TopologyConfig] load topology failed', err)
    ElMessage.error('Failed to load station topology')
    return
  }
  const model = store.getModelById(modelId)
  if (!model) {
    ElMessage.warning('Station topology not loaded')
    return
  }

  let flow = model.flowJson
  const isNewFlow = isEmptyFlow(flow)
  const hadLegacyEdgeIds = (flow.edges ?? []).some((e) => !/^edge-\d+$/.test(e.id))

  if (isNewFlow) {
    flow = { nodes: [], edges: [], fixedBindings: flow.fixedBindings }
  }

  flow = repairMissingFlowEdges(flow)

  store.setCurrentModel(modelId)
  setModelFlowProductRules(store.products)
  await hydrateCanvasFromFlow(flow, { autoLayout: false })
  collapseAllGroups()

  isRestoringHistory = true
  await nextTick()
  isRestoringHistory = false

  if (isNewFlow || hadLegacyEdgeIds) {
    await syncEdgesFromFlow()
    const flowToPersist = buildPersistedFlow()
    if (validatePersistedFlow(flowToPersist).canSave) {
      await store.saveFlowJson(modelId, flowToPersist)
    }
  }

  await captureSavedSnapshot()
  hasUnsavedChanges.value = false
  isViewMode.value = true

  await nextTick()
  requestAnimationFrame(() => {
    fitFlowToViewport(false)
  })
}

onBeforeRouteLeave(async () => {
  if (!hasUnsavedChanges.value) return true
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
    hasUnsavedChanges.value = false
    store.hasUnsavedChanges = false
    return true
  } catch {
    return false
  }
})

onMounted(async () => {
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
  try {
    await initEditorCanvas()
  } finally {
    await nextTick()
    requestAnimationFrame(() => {
      isCanvasLoading.value = false
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  store.setCurrentModel(null)
  store.hasUnsavedChanges = false
})
</script>

<style lang="scss" scoped>
.voltage-class {
  .modeling-editor.rule-management {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
    box-sizing: border-box;
    padding: 0;

    &.is-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      background: #ffffff;
    }

    // ---- 主体 ----
    .modeling-editor__body {
      position: relative;
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      width: 100%;
    }

    .modeling-editor__left-panel {
      position: absolute;
      top: 16px;
      bottom: 16px;
      left: 16px;
      z-index: 10;
      display: flex;
      width: 348px;
      min-width: 348px;
      height: auto;
      min-height: 0;
      overflow: visible;
      pointer-events: none;
    }

    .modeling-editor__left-panel :deep(.left-panel-shell) {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 100%;
      pointer-events: auto;
    }

    // ---- 画布 ----
    .modeling-editor__canvas {
      flex: 1;
      min-height: 0;
      min-width: 0;
      position: relative;
      background: #fbfcff;
    }

    @media (max-width: 900px) {
      .modeling-editor__canvas .modeling-editor__fixed-bindings {
        gap: 8px;
        transform: scale(0.86);
        transform-origin: top left;
      }
    }

    // VueFlow 样式覆盖
    :deep(.el-button.el-button + .el-button.el-button){
      margin-left: 0;
    }
  }
}

@keyframes modeling-editor-spin {
  to { transform: rotate(360deg); }
}

.el-button--cancel {
  background: #F7F8FA;
  color: #272E3B;
}

.el-button--confirm {
  background: #F53F3F;
  color: #F7F8FA;
}
/* 全屏编辑器的确认框需高于编辑器层 */
:global(.visual-modeling-confirm-box) {
  z-index: 10050 !important;
}
:global(.el-overlay:has(+ .visual-modeling-confirm-box)),
:global(.el-overlay.is-message-box) {
  z-index: 10049 !important;
}
</style>
