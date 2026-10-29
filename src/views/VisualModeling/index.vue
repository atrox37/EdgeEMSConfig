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
        :connection-line-options="connectionLineOptions"
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
import { ref, markRaw, computed, onMounted, onUnmounted, nextTick, provide, defineComponent, h, type Ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  useVueFlow,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeTypesObject,
  type EdgeTypesObject,
} from '@vue-flow/core'
import TopologyNode from './components/customNodes/TopologyNode.vue'
import DeletableSmoothStepEdge from './components/customEdges/DeletableSmoothStepEdge.vue'
import useModelDnd from './useModelDnd'
import { topologyMiniMapColor, topologyMiniMapStrokeColor } from './composables/useTopologyMinimap'
import { useTopologyPersistence } from './composables/useTopologyPersistence'
import { useVisualModelingFlowCore, type UseVisualModelingFlowCoreOptions } from './composables/useVisualModelingFlowCore'
import { useVisualModelingConnections, type UseVisualModelingConnectionsOptions } from './composables/useVisualModelingConnections'
import {
  TOPOLOGY_CONNECTION_HINT_KEY,
  useTopologyConnectionHint,
} from './composables/useTopologyConnectionHint'
import { useVisualModelingImportExport } from './composables/useVisualModelingImportExport'
import { useVisualModelingEditLifecycle, type UseVisualModelingEditLifecycleOptions } from './composables/useVisualModelingEditLifecycle'

import { useVisualModelingStore, STATION_EDITOR_ID } from '@/stores/visualModeling'
import type { ModelFlowNode, ModelInstanceBinding, ModelNodeData } from '@/types/visualModeling'
import { collectBoundInstanceIds, collectNodesToDelete } from '@/utils/visualModeling'
import TopologyIssuesDialog from './components/dialogs/TopologyIssuesDialog.vue'
import { MODELING_EDITOR_KEY } from './modelingEditorContext'
import { useTopologyRealtime } from './composables/useTopologyRealtime'
import { TOPOLOGY_REALTIME_KEY, type RealtimeBinding } from './topologyRealtime'
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

const { onDragOver, onDragLeave, onDrop } = useModelDnd()
const fixedStationBinding = ref<ModelInstanceBinding | null>(null)
const fixedEnvironmentBinding = ref<ModelInstanceBinding | null>(null)
const primaryTopLevelProduct = computed(() =>
  store.products.find((product) => product.type === 'Station'),
)
const secondaryTopLevelProduct = computed(() =>
  store.products.find((product) => product.type === 'Environment'),
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
} = useVueFlow()

// ---- 节点类型注册（markRaw 避免 Vue Flow 节点被深度响应式包装）----
const nodeTypes = {
  product: markRaw(TopologyNode),
} as unknown as NodeTypesObject

const edgeTypes = {
  'deletable-smoothstep': markRaw(DeletableSmoothStepEdge),
} as unknown as EdgeTypesObject

// ---- 连线类型定义 ----
// ---- 基础状态 ----
const nodes = ref<FlowNode[]>([])
const edges = ref<FlowEdge[]>([])
const isViewMode = ref(true)
const realtimeNodes = nodes as unknown as Ref<Array<{ data: ModelNodeData }>>
const realtimeBindings = computed<RealtimeBinding[]>(() => {
  const bindings = realtimeNodes.value.map((node) => {
    const instance = store.instances.find((item) => item.instance_id === node.data?.instanceId)
    return {
      productName: instance?.product_name || node.data?.productName || '',
      instanceId: node.data?.instanceId as number | null | undefined,
    }
  })
  for (const [binding, product] of [
    [fixedStationBinding.value, primaryTopLevelProduct.value],
    [fixedEnvironmentBinding.value, secondaryTopLevelProduct.value],
  ] as const) {
    if (product) bindings.push({
      productName: binding?.productName || product.product_name,
      instanceId: binding?.instanceId,
    })
  }
  return bindings
})
const topologyRealtime = useTopologyRealtime(isViewMode, realtimeBindings)
provide(TOPOLOGY_REALTIME_KEY, topologyRealtime)
const isFullscreen = ref(false)
const hasUnsavedChanges = ref(false)
const selectedNode = ref<ModelFlowNode | null>(null)
const selectedEdgeId = ref<string | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const modelingCanvasRef = ref<InstanceType<typeof ModelingCanvas> | null>(null)
const exportLoading = ref(false)
const topologyIssuesDialogRef = ref<InstanceType<typeof TopologyIssuesDialog> | null>(null)

const miniMapNodeColor = topologyMiniMapColor
const miniMapNodeStrokeColor = topologyMiniMapStrokeColor

const snapshotBridge = { onSnapshot: (() => {}) as () => void }

const flowCore = useVisualModelingFlowCore({
  nodes: nodes as UseVisualModelingFlowCoreOptions['nodes'],
  edges: edges as UseVisualModelingFlowCoreOptions['edges'],
  isViewMode,
  hasUnsavedChanges,
  selectedNode: selectedNode as Ref<unknown>,
  selectedEdgeId,
  storeHasUnsavedChanges: store,
  getNodes: getNodes as { value: unknown[] },
  toObject: toObject as () => { nodes?: unknown[]; edges?: unknown[] },
  setNodes,
  setEdges,
  onSnapshot: () => snapshotBridge.onSnapshot(),
})

const {
  normalizeFlowEdges,
  getFlowNodes,
  getFlowEdges,
  markDirty,
  captureSavedSnapshot,
  applyFlowState,
  removeNodesByIds,
  removeSelectedElements,
  onNodesChangeHandler,
  isRestoring,
  setRestoring,
} = flowCore

const flowHistory = useFlowHistory({
  enabled: () => !isViewMode.value && !isRestoring(),
  capture: () => ({ nodes: getFlowNodes(), edges: getFlowEdges() }),
  restore: async (snapshot) => {
    await applyFlowState(snapshot.nodes as FlowNode[], snapshot.edges as FlowEdge[])
    selectedNode.value = null
    selectedEdgeId.value = null
    markDirty()
  },
})

function pushUndoSnapshot() {
  flowHistory.saveSnapshot()
}

function saveSnapshot() {
  pushUndoSnapshot()
  markDirty()
}

snapshotBridge.onSnapshot = saveSnapshot

const { syncEdgesFromFlow, exportCurrentFlow } = useTopologyPersistence({
  toObject,
  getNodes: getFlowNodes,
  getEdges: getFlowEdges,
  normalizeEdges: normalizeFlowEdges,
  setEdges,
  updateEdges: (next) => { edges.value = next as FlowEdge[] },
  fixedBindings: () => ({
    stationInstanceId: fixedStationBinding.value?.instanceId ?? null,
    environmentInstanceId: fixedEnvironmentBinding.value?.instanceId ?? null,
  }),
  saveFlow: (flow) => store.saveFlowJson(modelId, flow),
})

const topologyConnectionHint = useTopologyConnectionHint({
  isViewMode,
  getFlowNodes,
  getFlowEdges,
})
provide(TOPOLOGY_CONNECTION_HINT_KEY, topologyConnectionHint)

// composable 返回的是普通对象，嵌套的 computed 在模板中不会自动解包，这里提升为顶层 computed
const connectionLineOptions = computed(() => topologyConnectionHint.connectionLineOptions.value)

const connections = useVisualModelingConnections({
  isViewMode,
  getFlowNodes,
  getFlowEdges,
  toObject: toObject as UseVisualModelingConnectionsOptions['toObject'],
  addEdges,
  setEdges,
  applyEdgeChanges,
  normalizeFlowEdges,
  updateEdges: (next) => { edges.value = next },
  isRestoring,
  markDirty,
  onSnapshot: saveSnapshot,
  selectedNode: selectedNode as Ref<unknown>,
  selectedEdgeId,
})

const {
  handleConnectGuard,
  handleEdgeClickGuard,
  onEdgesChangeHandler,
} = connections

onNodesChange(onNodesChangeHandler)
onEdgesChange(onEdgesChangeHandler)

const { fitFlowToViewport, handleWindowResize: onWindowResize } = useFlowViewport({
  fitView,
  getNodes: () => getNodes.value,
  padding: 0.15,
  resizeDelay: 150,
})

// 卡片尺寸固定；点位加载和模式切换均保留用户当前的缩放及视口。

const editLifecycleOptions = {
  modelId,
  store: store as unknown as UseVisualModelingEditLifecycleOptions['store'],
  isViewMode,
  isCanvasLoading,
  isFullscreen,
  hasUnsavedChanges,
  selectedNode,
  selectedEdgeId,
  fixedStationBinding,
  fixedEnvironmentBinding,
  primaryTopLevelProduct,
  secondaryTopLevelProduct,
  nodes,
  edges,
  topologyIssuesDialogRef,
  getFlowNodes,
  getFlowEdges,
  normalizeFlowEdges,
  applyFlowState,
  markDirty,
  captureSavedSnapshot,
  setRestoring,
  setNodes,
  setEdges,
  toObject,
  fitView,
  getNodes,
  syncEdgesFromFlow,
  exportCurrentFlow,
  flowHistory,
  pushUndoSnapshot,
  saveSnapshot,
  fitFlowToViewport,
  removeSelectedElements,
} as UseVisualModelingEditLifecycleOptions

const editLifecycle = useVisualModelingEditLifecycle(editLifecycleOptions)

const {
  persistenceValidationOptions,
  refreshTopologyValidationData,
  updateFixedBinding,
  hydrateCanvasFromFlow,
  enterEditMode,
  handleExitEdit,
  handleRestoreToSaved,
  toggleFullscreen,
  handleAutoLayout,
  handleSave,
  onKeydown,
  initEditorCanvas,
} = editLifecycle

const importExport = useVisualModelingImportExport({
  modelId,
  getModelById: (id) => store.getModelById(id) ?? undefined,
  products: () => store.products,
  modelingCanvasRef,
  importInput,
  topologyIssuesDialogRef,
  exportLoading,
  syncEdgesFromFlow,
  exportCurrentFlow,
  refreshTopologyValidationData,
  persistenceValidationOptions,
  hydrateCanvasFromFlow,
  markDirty,
  onSnapshot: saveSnapshot,
})

const {
  handleExportCommand,
  handleImportClick,
  handleImportChange,
} = importExport

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
      style: fresh.style,
    } as ModelFlowNode
  }
}

// ---- 画布空白点击 ----
function handlePaneClick() {
  selectedNode.value = null
  selectedEdgeId.value = null
}

// ---- 删除节点 ----
function handleDeleteNode(id: string) {
  if (isViewMode.value) return
  const message = 'Delete this node and its related connections?'
  ElMessageBox.confirm(message, 'Delete Node', {
    type: 'warning',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    center: true,
    customClass: 'delete-confirm-box',
    showClose: false,
    icon: MessageWarningIcon,
    cancelButtonType : 'text',
    confirmButtonType : 'danger'
  })
    .then(() => {
      removeNodesByIds(collectNodesToDelete(id))
    })
    .catch(() => {})
}

provide(MODELING_EDITOR_KEY, {
  isViewMode,
  instances: computed(() => store.instances),
  notifyFlowChanged: () => {
    if (isViewMode.value || isRestoring()) return
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
@use '@/assets/styles/components/visual-modeling-editor' as vme;

.voltage-class.modeling-editor.rule-management {
  @include vme.visual-modeling-editor-host();
  @include vme.visual-modeling-editor-global();
}
</style>
