<template>
  <div
    class="voltage-class rule-management modeling-editor"
    :class="{ 'is-fullscreen': isFullscreen, 'is-editing': !isViewMode }"
  >
    <ModulePageHeader title="Visual Modeling" variant="actions">
      <template #toolbar>
        <el-button size="small" type="primary" class="custom-button" @click="toggleFullscreen">
          <img
            :src="fullscreenIcon"
            class="modeling-editor__toolbar-icon"
          />
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </el-button>

        <el-dropdown
          v-if="isViewMode"
          trigger="click"
          :teleported="true"
          popper-class="visual-modeling-popper"
          :disabled="exportLoading"
          split-button
          @command="handleExportCommand"
        >
          <!-- <el-button size="small"  class="custom-button" :loading="exportLoading"> -->
            <img :src="exportIcon" class="modeling-editor__toolbar-icon" />
            Export
          <!-- </el-button> -->
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">Export JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button
          v-if="isViewMode"
          v-permission="'engineer'"
          size="small"
          type="primary"
          class="custom-button"
          @click="enterEditMode"
        >
          <img :src="editIcon" class="modeling-editor__toolbar-icon" />
          Edit
        </el-button>

        <template v-if="!isViewMode">
          <el-button
            v-permission="'engineer'"
            size="small"
            class="custom-button"
            @click="handleAutoLayout"
          >
            <AppIcon name="i-tabler-layout-distribute-vertical" class="modeling-editor__toolbar-icon" />
            Auto Layout
          </el-button>
          <el-button
            v-permission="'engineer'"
            size="small"
            type="primary"
            class="custom-button"
            @click="handleImportClick"
          >
            <AppIcon name="i-tabler-upload" class="modeling-editor__toolbar-icon" />
            Import
          </el-button>
          <el-button
            v-permission="'engineer'"
            size="small"
            type="primary"
            class="custom-button"
            @click="handleExitEdit"
          >
            <AppIcon name="i-tabler-arrow-left" class="modeling-editor__toolbar-icon" />
            Exit Edit
          </el-button>
        </template>
      </template>
    </ModulePageHeader>

    <div class="modeling-editor__body">
      <div v-if="!isViewMode" class="modeling-editor__left-panel">
        <LeftPanel />
      </div>

      <div ref="canvasRef" class="modeling-editor__canvas">
        <div class="modeling-editor__fixed-bindings">
          <FixedBindingCard
            kind="station"
            label="Station"
            :instances="stationInstances"
            :readonly="isViewMode"
            :model-value="fixedStationBinding"
            @update:model-value="updateFixedBinding('station', $event)"
          />
          <FixedBindingCard
            kind="environment"
            label="Environment"
            :instances="environmentInstances"
            :readonly="isViewMode"
            :model-value="fixedEnvironmentBinding"
            @update:model-value="updateFixedBinding('environment', $event)"
          />
        </div>
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :node-types="nodeTypes"
          :connection-mode="ConnectionMode.Loose"
          :connection-radius="48"
          :connect-on-click="false"
          :connection-line-style="{ stroke: '#B3CEFA', strokeWidth: 1 }"
          :min-zoom="0.1"
          :max-zoom="4"
          :snap-to-grid="true"
          :snap-grid="[10, 10]"
          :nodes-draggable="true"
          :nodes-connectable="!isViewMode"
          :nodes-deletable="!isViewMode"
          :edges-deletable="!isViewMode"
          :delete-key-code="null"
          :elements-selectable="!isViewMode"
          :edges-focusable="!isViewMode"
          :elevate-edges-on-select="!isViewMode"
          :elevate-nodes-on-select="!isViewMode"
          :class="['modeling-editor__flow', { 'modeling-editor__flow--view': isViewMode }]"
          @connect="handleConnectGuard"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClickGuard"
          @pane-click="handlePaneClick"
          @edge-double-click="handleEdgeDoubleClickGuard"
        >
          <Background variant="lines" :gap="10" color="rgba(220, 226, 238, 0.78)" />
          <FlowMiniMap
            v-show="showMiniMap"
          />
          <div class="modeling-editor__flow-controls" aria-label="Canvas controls">
            <button type="button" class="flow-control-button" aria-label="Fit view" @click="fitView()">
              <img class="flow-control-button__icon" :src="fitViewIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-divider" aria-hidden="true"></span>
            <button type="button" class="flow-control-button" aria-label="Zoom out" @click="zoomOut()">
              <img class="flow-control-button__icon" :src="zoomOutIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-zoom">{{ Math.round(viewport.zoom * 100) }}%</span>
            <button type="button" class="flow-control-button" aria-label="Zoom in" @click="zoomIn()">
              <img class="flow-control-button__icon" :src="zoomInIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-divider" aria-hidden="true"></span>
            <button type="button" class="flow-control-button" :class="{ 'is-active': showMiniMap }" aria-label="Toggle minimap" @click="showMiniMap = !showMiniMap">
              <img class="flow-control-button__icon" :src="toggleMinimapIcon" alt="" aria-hidden="true" />
            </button>
          </div>
        </VueFlow>

        <Transition name="edge-toolbar">
          <div v-if="!isViewMode && selectedEdgeId" class="modeling-editor__edge-toolbar">
            <button class="edge-toolbar__btn edge-toolbar__btn--label" title="Edit label" @click="openEdgeLabelEdit">
              <AppIcon name="i-tabler-tag" />
              <span>Label</span>
            </button>
            <button class="edge-toolbar__btn edge-toolbar__btn--del" title="Delete edge" @click="deleteSelectedEdge">
              <AppIcon name="i-tabler-trash" />
              <span>Delete</span>
            </button>
          </div>
        </Transition>

        <div v-if="!isViewMode" v-permission="'engineer'" class="modeling-editor__floating-actions">
          <el-button
            class="floating-btn floating-btn--cancel"
            title="Restore to last saved"
            :disabled="!hasUnsavedChanges"
            @click="handleRestoreToSaved"
          >
            <AppIcon name="i-tabler-rotate-2" />
            <span>Restart</span>
            ×
          </el-button>
          <el-button
            type="primary"
            class="floating-btn floating-btn--submit"
            :class="{ 'is-dirty': hasUnsavedChanges }"
            :disabled="!hasUnsavedChanges"
            title="Save"
            @click="handleSave"
          >
            <AppIcon name="i-tabler-device-floppy" />
            <span>Save</span>
            √
          </el-button>
        </div>
      </div>

    </div>

    <!-- 边标签编辑对话框 -->
    <el-dialog
      v-model="edgeLabelDialogVisible"
      title="Edit Edge Label"
      width="340px"
      destroy-on-close
    >
      <el-input v-model="editingEdgeLabel" placeholder="Edge label (e.g. contains, relates)" clearable />
      <template #footer>
        <el-button @click="edgeLabelDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="confirmEdgeLabel">OK</el-button>
      </template>
    </el-dialog>

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
import { ref, markRaw, computed, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  VueFlow,
  ConnectionMode,
  useVueFlow,
  type Connection,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type NodeChange,
  type EdgeChange,
  type NodeTypesObject,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'

import AppIcon from '@/components/AppIcon.vue'
import ModulePageHeader from '@/components/common/ModulePageHeader.vue'
import FixedBindingCard from './components/FixedBindingCard.vue'
import TopologyNode from './components/customNodes/TopologyNode.vue'
import FlowMiniMap from './components/FlowMiniMap.vue'

import { useVisualModelingStore, STATION_EDITOR_ID } from '@/stores/visualModeling'
import { getGroupContentLayout, layoutModelGraph } from './useModelLayout'
import {
  createDefaultModelFlow,
  createFlowEdgeId,
  isEmptyFlow,
  repairMissingFlowEdges,
} from '@/utils/defaultModelFlow'
import type { ModelFlowData, ModelInstanceBinding } from '@/types/visualModeling'
import {
  getConnectionRuleHint,
  canConnectNodes,
  hasEdgeBetweenNodesEitherDirection,
  resolveConnectionEndpoints,
  correctEdgeDirection,
  toSourceHandle,
  toTargetHandle,
} from '@/utils/modelFlowRules'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import type { ModelFlowNode } from '@/types/visualModeling'
import { MODELING_EDITOR_KEY } from './modelingEditorContext'
import { collectBoundInstanceIds, collectNodesToDelete, normalizeNodeInstances } from '@/utils/visualModeling'
import { normalizeTopology } from '@/utils/topologyNormalize'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import TopologyIssuesDialog from './components/dialogs/TopologyIssuesDialog.vue'
import { isFlowSnapshotEqual } from '@/utils/flowSnapshot'
import { enrichFlowWithLiveChannelBindings } from '@/utils/topologyChannelBindings'

import fullscreenIcon from '@/assets/icons/button-fullscreen.svg'
import editIcon from '@/assets/icons/button-edit.svg'
import exportIcon from '@/assets/icons/button-download.svg'
import fitViewIcon from '@/assets/icons/tuopu-fitView.svg'
import toggleMinimapIcon from '@/assets/icons/tuopu-toggleMinimap.svg'
import zoomInIcon from '@/assets/icons/tuopu-zoomIn.svg'
import zoomOutIcon from '@/assets/icons/tuopu-zoomOut.svg'

const store = useVisualModelingStore()
const modelId = STATION_EDITOR_ID
const showMiniMap = ref(true)
const fixedStationBinding = ref<ModelInstanceBinding | null>(null)
const fixedEnvironmentBinding = ref<ModelInstanceBinding | null>(null)
const stationInstances = computed(() => store.instances.filter((item) => item.product_name === 'Station'))
const environmentInstances = computed(() =>
  store.instances.filter((item) => ['Env', 'Environment'].includes(item.product_name)),
)

const {
  setNodes,
  setEdges,
  addEdges,
  removeEdges,
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
  findNode,
  setViewport,
} = useVueFlow()

// ---- 节点类型注册（markRaw 避免 Vue Flow 节点被深度响应式包装）----
const nodeTypes = {
  station: markRaw(TopologyNode),
  product: markRaw(TopologyNode),
  group: markRaw(TopologyNode),
} as unknown as NodeTypesObject

// ---- 连线类型定义 ----
type EdgeVariantKey = 'hierarchy' | 'association' | 'dataflow'

interface EdgeVariantDef {
  value: EdgeVariantKey
  label: string
  icon: string
  color: string
  strokeDasharray?: string
  animated: boolean
  bidirectional: boolean
}

const EDGE_VARIANTS: EdgeVariantDef[] = [
  {
    value: 'hierarchy',
    label: 'Hierarchy',
    icon: 'i-tabler-git-branch',
    color: '#6F3381',
    animated: false,
    bidirectional: false,
  },
  {
    value: 'association',
    label: 'Association',
    icon: 'i-tabler-arrows-exchange',
    color: '#4a90d9',
    strokeDasharray: '6 4',
    animated: false,
    bidirectional: true,
  },
  {
    value: 'dataflow',
    label: 'Data Flow',
    icon: 'i-tabler-wave-sine',
    color: '#43a047',
    strokeDasharray: '16 10',
    animated: true,
    bidirectional: false,
  },
]

function buildEdgeStyle(
  variant: EdgeVariantKey,
  options?: { dataFlowActive?: boolean },
): Partial<FlowEdge> {
  const def = EDGE_VARIANTS.find((v) => v.value === variant) ?? EDGE_VARIANTS[0]
  const animated =
    variant === 'dataflow' ? (options?.dataFlowActive ?? true) : def.animated
  return {
    type: 'smoothstep',
    animated,
    zIndex: 1001,
    style: {
      stroke: '#B3CEFA',
      strokeWidth: 1,
    },
    data: { edgeVariant: variant, dataFlowActive: variant === 'dataflow' ? animated : undefined },
  }
}

// ---- 基础状态 ----
const nodes = ref<FlowNode[]>([])
const edges = ref<FlowEdge[]>([])
const isViewMode = ref(true)
const isFullscreen = ref(false)
const hasUnsavedChanges = ref(false)
const selectedNode = ref<ModelFlowNode | null>(null)
const selectedEdgeId = ref<string | null>(null)
const expandedNodeIds = ref(new Set<string>())
const EDIT_SIDEBAR_OFFSET = 381
const edgeLabelDialogVisible = ref(false)
const editingEdgeLabel = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const exportLoading = ref(false)
const topologyIssuesDialogRef = ref<InstanceType<typeof TopologyIssuesDialog> | null>(null)

function setNodeExpanded(nodeId: string, expanded: boolean) {
  const next = new Set(expandedNodeIds.value)
  if (expanded) next.add(nodeId)
  else next.delete(nodeId)
  expandedNodeIds.value = next

  const group = getFlowNodes().find((node) => node.id === nodeId)
  if (!group) return
  const children = getFlowNodes().filter((node) => node.parentNode === nodeId)
  const productName = String((group.data as { productName?: string })?.productName ?? '')
  const topologyType = String((group.data as { topologyType?: string })?.topologyType ?? '')
  const isContainer = topologyType === 'container' || /container|distribution board/i.test(productName)
  const layout = getGroupContentLayout(children, expanded, isContainer)

  updateNode(nodeId, {
    data: { ...group.data, uiExpanded: expanded, width: layout.size.width, height: layout.size.height },
    style: { ...(group.style as Record<string, string | number>), width: `${layout.size.width}px`, height: `${layout.size.height}px` },
  })
  layout.positions.forEach((position, childId) => {
    updateNode(childId, { position, hidden: true })
  })
  children.forEach((child) => {
    if (!layout.positions.has(child.id)) updateNode(child.id, { hidden: true })
  })
}

provide(MODELING_EDITOR_KEY, {
  isViewMode,
  instances: store.instances,
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
  getBoundInstanceIdsExcluding: (nodeId: string) =>
    collectBoundInstanceIds(getFlowNodes(), nodeId),
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

// ---- 撤销/重做 ----
type Snapshot = { nodes: any[]; edges: any[] }
const MAX_HISTORY = 50
const snapshots = ref<Snapshot[]>([])
const snapIdx = ref(-1)
let isRestoringHistory = false
/** 上次已保存/加载时的画布基线（× 恢复目标） */
const savedSnapshot = ref<Snapshot | null>(null)

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

/** 将 Vue Flow 内部边同步到本地 ref（单向绑定时以内部状态为准） */
async function syncEdgesFromFlow() {
  await nextTick()
  const latest = (toObject().edges ?? []) as FlowEdge[]
  const normalized = normalizeFlowEdges(JSON.parse(JSON.stringify(latest)))
  edges.value = normalized
  setEdges(normalized)
}

/** 导出当前画布（保存/持久化必须用此函数，避免 toObject 丢边） */
function exportCurrentFlow(): ModelFlowData {
  const flowObj = toObject()
  const flowNodes = JSON.parse(JSON.stringify(getFlowNodes())) as FlowNode[]
  let flowEdges = getFlowEdges()
  const objectEdges = (flowObj.edges ?? []) as FlowEdge[]
  if (objectEdges.length > flowEdges.length) {
    flowEdges = JSON.parse(JSON.stringify(objectEdges)) as FlowEdge[]
  }
  return {
    nodes: flowNodes as unknown as ModelFlowData['nodes'],
    edges: flowEdges as unknown as ModelFlowData['edges'],
    fixedBindings: {
      station: fixedStationBinding.value,
      environment: fixedEnvironmentBinding.value,
    },
  }
}

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
  if (!flowNodes.length) return false
  savedSnapshot.value = {
    nodes: JSON.parse(JSON.stringify(flowNodes)),
    edges: JSON.parse(JSON.stringify(flowEdges)),
  }
  return true
}

function isSameAsSavedSnapshot(): boolean {
  if (!savedSnapshot.value?.nodes?.length) return true
  return isFlowSnapshotEqual(
    { nodes: getFlowNodes(), edges: getFlowEdges() },
    { nodes: savedSnapshot.value.nodes as FlowNode[], edges: savedSnapshot.value.edges as FlowEdge[] },
  )
}

function pushUndoSnapshot() {
  if (isRestoringHistory || isViewMode.value) return
  const s: Snapshot = {
    nodes: JSON.parse(JSON.stringify(getFlowNodes())),
    edges: JSON.parse(JSON.stringify(getFlowEdges())),
  }
  const next = snapshots.value.slice(0, snapIdx.value + 1)
  next.push(s)
  while (next.length > MAX_HISTORY) {
    next.shift()
    snapIdx.value = Math.max(0, snapIdx.value - 1)
  }
  snapshots.value = next
  snapIdx.value = next.length - 1
}

function saveSnapshot() {
  pushUndoSnapshot()
  markDirty()
}

async function undo() {
  if (!canUndo.value) return
  snapIdx.value--
  const s = snapshots.value[snapIdx.value]
  await applyFlowState(
    JSON.parse(JSON.stringify(s.nodes)) as FlowNode[],
    JSON.parse(JSON.stringify(s.edges)) as FlowEdge[],
  )
  selectedNode.value = null
  selectedEdgeId.value = null
  markDirty()
}

async function redo() {
  if (!canRedo.value) return
  snapIdx.value++
  const s = snapshots.value[snapIdx.value]
  await applyFlowState(
    JSON.parse(JSON.stringify(s.nodes)) as FlowNode[],
    JSON.parse(JSON.stringify(s.edges)) as FlowEdge[],
  )
  selectedNode.value = null
  selectedEdgeId.value = null
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
    .filter((node) => node.selected)
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
    currentEdges.filter((edge) => edge.selected).map((edge) => edge.id),
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
  return flowNodes.map((node) => {
    const data = node.data as { productName?: string; imageUrl?: string }
    const imageUrl = getProductInstanceImageUrl(data.productName)
    if (!imageUrl || data.imageUrl === imageUrl) return node
    return { ...node, data: { ...node.data, imageUrl } }
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
    const isEnvironment = productName === 'Env' || productName === 'Environment'
    const isFixed = node.type === 'station' || isEnvironment
    if (isFixed) {
      fixedNodeIds.add(node.id)
      const binding = normalizeNodeInstances(node.data as ModelFlowNode['data'])[0] ?? null
      if (node.type === 'station') fixedStationBinding.value = binding
      if (isEnvironment) fixedEnvironmentBinding.value = binding
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
  if (!model?.flowJson?.nodes?.length) {
    ElMessage.warning('No saved baseline to restore')
    hasUnsavedChanges.value = false
    return false
  }
  await hydrateCanvasFromFlow(model.flowJson, { autoLayout: false })
  if (!getFlowNodes().length) {
    ElMessage.error('Restore failed')
    hasUnsavedChanges.value = false
    return false
  }
  selectedNode.value = null
  selectedEdgeId.value = null
  snapshots.value = []
  snapIdx.value = -1
  hasUnsavedChanges.value = false
  store.hasUnsavedChanges = false
  await captureSavedSnapshot()
  return true
}

async function enterEditMode() {
  if (!savedSnapshot.value?.nodes?.length) {
    await captureSavedSnapshot()
  }
  await store.loadChannelBindings(true)
  isViewMode.value = false
  selectedNode.value = null
  selectedEdgeId.value = null
  snapshots.value = []
  snapIdx.value = -1
  hasUnsavedChanges.value = false
  store.hasUnsavedChanges = false
  await nextTick()
  const currentViewport = viewport.value
  setViewport(
    {
      x: currentViewport.x + EDIT_SIDEBAR_OFFSET,
      y: currentViewport.y,
      zoom: currentViewport.zoom,
    },
    { duration: 0 },
  )
  pushUndoSnapshot()
}

function exitEditMode() {
  isViewMode.value = true
  selectedNode.value = null
  selectedEdgeId.value = null
  nextTick(() => fitFlowToViewport(true))
}

async function handleExitEdit() {
  if (!hasUnsavedChanges.value) {
    exitEditMode()
    return
  }
  try {
    await ElMessageBox.confirm(
      'You have unsaved changes. Discard them and exit edit mode?',
      'Unsaved Changes',
      {
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep Editing',
        type: 'warning',
        appendTo: document.body,
        customClass: 'visual-modeling-confirm-box',
      },
    )
    await restoreToSavedSnapshot()
    exitEditMode()
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
    const hasSelectedElements = getNodes.value.some((node) => node.selected)
      || getFlowEdges().some((edge) => edge.selected)
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

function handleEdgeDoubleClickGuard(event: any) {
  if (isViewMode.value) return
  handleEdgeDoubleClick(event)
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
    labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#4a5568' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
    labelBgPadding: [4, 6],
    labelBgBorderRadius: 4,
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

// ---- 边双击 → 编辑标签 ----
function handleEdgeDoubleClick(event: any) {
  const edge = event.edge ?? event
  if (!edge?.id) return
  selectedEdgeId.value = edge.id
  editingEdgeLabel.value = typeof edge.label === 'string' ? edge.label : ''
  edgeLabelDialogVisible.value = true
}

function openEdgeLabelEdit() {
  if (!selectedEdgeId.value) return
  const edge = edges.value.find((e) => e.id === selectedEdgeId.value)
  editingEdgeLabel.value = typeof edge?.label === 'string' ? edge.label : ''
  edgeLabelDialogVisible.value = true
}

function confirmEdgeLabel() {
  if (!selectedEdgeId.value) return
  const edgeId = selectedEdgeId.value
  const label = editingEdgeLabel.value.trim() || undefined
  const nextEdges = getFlowEdges().map((e) => (e.id === edgeId ? { ...e, label } : e))
  const normalized = normalizeFlowEdges(nextEdges, getFlowNodes())
  setEdges(normalized)
  edges.value = normalized
  edgeLabelDialogVisible.value = false
  markDirty()
  saveSnapshot()
}

// ---- 删除选中边 ----
function deleteSelectedEdge() {
  if (!selectedEdgeId.value) return
  const edgeId = selectedEdgeId.value
  removeEdges([edgeId])
  edges.value = edges.value.filter((e) => e.id !== edgeId)
  selectedEdgeId.value = null
  markDirty()
  nextTick(() => saveSnapshot())
}

// ---- 右侧面板：更新节点 ----
function handleUpdateNode(updated: ModelFlowNode) {
  updateNode(updated.id, {
    data: JSON.parse(JSON.stringify(updated.data)),
  })
  selectedNode.value = JSON.parse(JSON.stringify(updated))
  markDirty()
  saveSnapshot()
}

async function persistFlowJson() {
  await syncEdgesFromFlow()
  const flow = exportCurrentFlow()
  await store.saveFlowJson(modelId, flow)
}

// ---- 右侧面板：删除节点 ----
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
    cancelButtonClass:'el-button--cancel',
    confirmButtonClass:'el-button--confirm',
  })
    .then(() => {
      removeNodesByIds(collectNodesToDelete(id, getFlowNodes()))
    })
    .catch(() => {})
}

function normalizeFlowEdges(raw: FlowEdge[], flowNodes?: FlowNode[]): FlowEdge[] {
  const nodes = flowNodes ?? getFlowNodes()
  return raw
    .filter((edge) => Boolean(edge?.id && edge?.source && edge?.target))
    .filter((edge) => {
      if (!nodes.length) return true
      const source = nodes.find((node) => node.id === edge.source)
      const target = nodes.find((node) => node.id === edge.target)
      return canConnectNodes(source, target) || canConnectNodes(target, source)
    })
    .map((edge) => {
      const corrected = nodes.length
        ? correctEdgeDirection({ ...edge }, nodes)
        : edge
      let variant = corrected.data?.edgeVariant as EdgeVariantKey | 'classification' | undefined
      if (variant === 'classification' || !variant) variant = 'hierarchy'
      const isDataflow = variant === 'dataflow'
      const flowActive = isDataflow ? corrected.animated !== false : undefined
      const styled = buildEdgeStyle(
        variant,
        isDataflow ? { dataFlowActive: flowActive } : undefined,
      )
      const hasLabel = corrected.label != null && String(corrected.label).trim() !== ''
      const defaultLabelStyle = { fontSize: '11px', fontWeight: 600, fill: '#4a5568' }
      const defaultLabelBgStyle = { fill: '#ffffff', fillOpacity: 0.92 }
      return {
        id: corrected.id,
        source: corrected.source,
        target: corrected.target,
        sourceHandle: toSourceHandle(corrected.sourceHandle),
        targetHandle: toTargetHandle(corrected.targetHandle),
        type: corrected.type ?? styled.type,
        animated: isDataflow ? flowActive : (corrected.animated ?? styled.animated),
        zIndex: corrected.zIndex ?? styled.zIndex,
        label: hasLabel ? String(corrected.label).trim() : corrected.label,
        labelStyle: hasLabel
          ? { ...defaultLabelStyle, ...(corrected.labelStyle ?? {}) }
          : corrected.labelStyle,
        labelBgStyle: hasLabel
          ? { ...defaultLabelBgStyle, ...(corrected.labelBgStyle ?? {}) }
          : corrected.labelBgStyle,
        labelBgPadding: corrected.labelBgPadding ?? (hasLabel ? [4, 6] : undefined),
        labelBgBorderRadius: corrected.labelBgBorderRadius ?? (hasLabel ? 4 : undefined),
        style: {
          ...(corrected.style ?? {}),
          stroke: '#B3CEFA',
          strokeWidth: 1,
        },
        markerEnd: undefined,
        markerStart: undefined,
        data: { ...styled.data, ...corrected.data, edgeVariant: variant },
      } as FlowEdge
    })
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
  isRestoringHistory = true
  setNodes(clonedNodes)
  await nextTick()
  nodes.value = (toObject().nodes ?? clonedNodes) as FlowNode[]
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
  await syncEdgesFromFlow()
  const flow = enrichFlowWithLiveChannelBindings(exportCurrentFlow(), store.channelBindings)

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

// ---- 导入 ----
function handleImportClick() { importInput.value?.click() }

function handleImportChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result as string)
      const flow = parsed.flowJson || parsed
      const rawNodes = Array.isArray(flow.nodes) ? flow.nodes : []
      const rawEdges = Array.isArray(flow.edges) ? flow.edges : []
      if (!rawNodes.length && !rawEdges.length) {
        ElMessage.error('Import failed: no node data found')
        return
      }

      const normalized = normalizeTopology(
        { nodes: rawNodes, edges: rawEdges },
        store.products,
        topologyValidationOptions(),
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
function fitFlowToViewport(animated = false) {
  if (!getNodes.value.length) return
  fitView({
    includeHiddenNodes: true,
    padding: 0.15,
    duration: animated ? 300 : 0,
  })
}

// ---- 窗口 resize ----
let resizeTimer: number | null = null
function onWindowResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => fitFlowToViewport(true), 150)
}

async function initEditorCanvas() {
  try {
    await Promise.all([
      store.loadStationTopology(true),
      store.loadInstances(true),
      store.loadProducts(),
      store.loadChannelBindings(true),
    ])
  } catch (err) {
    console.error('[VisualModeling] load topology failed', err)
    ElMessage.error('Failed to load station topology')
    return
  }

  fixedStationBinding.value ??= stationInstances.value[0]
    ? {
        instanceId: stationInstances.value[0].instance_id,
        instanceName: stationInstances.value[0].instance_name,
        productName: stationInstances.value[0].product_name,
      }
    : null
  fixedEnvironmentBinding.value ??= environmentInstances.value[0]
    ? {
        instanceId: environmentInstances.value[0].instance_id,
        instanceName: environmentInstances.value[0].instance_name,
        productName: environmentInstances.value[0].product_name,
      }
    : null

  const model = store.getModelById(modelId)
  if (!model) {
    ElMessage.warning('Station topology not loaded')
    return
  }

  let flow = model.flowJson
  const isNewFlow = isEmptyFlow(flow)
  const hadLegacyEdgeIds = (flow.edges ?? []).some((e) => !/^edge-\d+$/.test(e.id))

  if (isNewFlow) {
    const instanceInputs = store.instances.map((item) => ({
      instance_id: item.instance_id,
      instance_name: item.instance_name,
      product_name: item.product_name,
    }))
    flow = createDefaultModelFlow(instanceInputs)
  }

  flow = repairMissingFlowEdges(flow)

  store.setCurrentModel(modelId)
  setModelFlowProductRules(store.products)
  await hydrateCanvasFromFlow(flow, { autoLayout: true })

  isRestoringHistory = true
  await nextTick()
  isRestoringHistory = false

  if (isNewFlow || hadLegacyEdgeIds) {
    await persistFlowJson()
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
  await initEditorCanvas()
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

    :deep(.module-page-header__toolbar) {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      flex-wrap: wrap;

      .el-button,
      .el-dropdown {
        margin-left: 0 !important;
      }

      .el-button {
        height: 24px;
        padding: 0 8px;
        font-size: 11px;
      }
    }

    .modeling-editor__toolbar-icon {
      margin-right: 6px;
      :deep(svg) {
        width: 12px;
        height: 12px;
      }
    }

    .modeling-editor__canvas .modeling-editor__floating-actions {
      position: absolute;
      right: auto;
      bottom: 48px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 16px;
      z-index: 10;
      pointer-events: none;

      .floating-btn {
        pointer-events: auto;
        width: auto !important;
        min-width: 96px;
        height: 36px !important;
        padding: 0 16px !important;
        font-size: 0 !important;
        border-radius: 4px !important;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);

        span {
          font-size: 14px;
        }

        :deep(svg) {
          width: 15px;
          height: 15px;
        }

        .floating-btn--submit.is-dirty:not(:disabled) {
          box-shadow: 0 0 0 3px rgba(255, 138, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35);
        }
      }
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
      left: 0;
      z-index: 20;
      display: flex;
      flex: 0 0 348px;
      width: 348px;
      min-width: 348px;
      height: auto;
      min-height: 0;
      overflow: hidden;
      background-color: transparent;
    }

    .modeling-editor__left-panel :deep(.left-panel-shell) {
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: 100%;
    }

    // .modeling-editor__left-panel :deep(.left-panel-shell) {
    //   flex: 1 1 auto;
    //   width: 100%;
    //   min-width: 0;
    //   height: 100%;
    // }

    // ---- 画布 ----
    .modeling-editor__canvas {
      flex: 1;
      min-height: 0;
      min-width: 0;
      position: relative;
      background: #fbfcff;
    }

    .modeling-editor__fixed-bindings {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 12;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      pointer-events: auto;
    }

    &.is-editing .modeling-editor__fixed-bindings {
      left: 381px;
    }

    @media (max-width: 900px) {
      .modeling-editor__fixed-bindings {
        gap: 8px;
        transform: scale(0.86);
        transform-origin: top left;
      }
    }

    .modeling-editor__flow {
      width: 100%;
      height: 100%;
      min-height: 320px;
    }

    // ---- 边工具栏 ----
    .modeling-editor__edge-toolbar {
      position: absolute;
      bottom: 52px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      border: 1px solid #dce4f0;
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 6px 18px rgba(31, 57, 100, 0.16);
      z-index: 50;
      pointer-events: all;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__label {
      font-size: 11px;
      color: #767d8a;
      margin-right: 2px;
      white-space: nowrap;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__sep {
      width: 1px;
      height: 22px;
      background: #e5eaf2;
      margin: 0 2px;
      flex-shrink: 0;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #f7f9fd;
      border: 1px solid #dce4f0;
      border-radius: 6px;
      padding: 5px 10px;
      color: #395583;
      font-size: 11px;
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn :deep(svg) {
      width: 14px;
      height: 14px;
      color: inherit !important;
      flex-shrink: 0;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn:hover {
      background: #edf4ff;
      color: #2878ff;
      border-color: #8bb5ff;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn.active {
      background: var(--ec, #6f3381);
      border-color: var(--ec, #6f3381);
      color: #ffffff;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn--del:hover {
      background: rgba(229, 57, 53, 0.28);
      color: #ffcdd2;
      border-color: rgba(229, 57, 53, 0.45);
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn--label:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    :deep(.vue-flow__handle) {
      z-index: 50 !important;
    }

    .modeling-editor__flow:not(.modeling-editor__flow--view) :deep(.vue-flow__handle.connecting) {
      opacity: 1 !important;
    }

    .modeling-editor__flow--view :deep(.vue-flow__handle) {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .modeling-editor__flow--view :deep(.node-connection-handle--connected) {
      opacity: 1 !important;
    }

    .modeling-editor__flow--view :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
      stroke-width: 1px !important;
      stroke: #B3CEFA !important;
      filter: none !important;
    }

    .modeling-editor__edge-toolbar .edge-toolbar__btn--dim {
      background: rgba(67, 160, 71, 0.18);
      border-color: rgba(67, 160, 71, 0.35);
      color: rgba(255, 255, 255, 0.65);
    }

    // VueFlow 样式覆盖
    :deep(.vue-flow__edge-path) {
      fill: none !important;
      stroke: #B3CEFA !important;
      stroke-width: 1px !important;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    :deep(.vue-flow__edge) {
      backface-visibility: hidden;
      transform: translateZ(0);
    }

    :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
      stroke-width: 1px !important;
      stroke: #B3CEFA !important;
      filter: none;
    }

    // :deep(.vue-flow__node.selected) {
    //   box-shadow:
    //     0 0 12px rgba(40, 120, 255, 0.38),
    //     0 0 20px rgba(40, 120, 255, 0.24),
    //     2px 2px 8px rgba(0, 0, 0, 0.15) !important;
    // }

    :deep(.vue-flow__edge-label),
    :deep(.vue-flow__edge-text) {
      font-size: 11px !important;
      fill: #4f5561 !important;
      font-weight: 600;
    }

    :deep(.vue-flow__edge-textwrapper),
    :deep(.vue-flow__edge-textbg) {
      fill: #ffffff !important;
      fill-opacity: 0.92 !important;
    }

    :deep(.rf-minimap-custom) {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(15,31,61,0.1);
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  }
}

.el-button--cancel {
  background: #F7F8FA;
  color: #272E3B;
}

.el-button--confirm {
  background: #F53F3F;
  color: #F7F8FA;
}
// 边工具栏出现动画
.edge-toolbar-enter-active, .edge-toolbar-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.edge-toolbar-enter-from, .edge-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
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
