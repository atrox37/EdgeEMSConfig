<template>
  <div class="voltage-class rule-chain-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <el-page-header
      class="rule-chain-editor__page-header"
      :content="ruleChainStore.currentRuleChain?.name || 'Rule Chain'"
      @back="goBackToList"
    >
      <template #extra>
        <EditorToolbar
          :is-view-mode="isMonitorMode"
          :is-fullscreen="isFullscreen"
          export-mode="button"
          @toggle-fullscreen="toggleFullscreen"
          @export="handleExport"
          @enter-edit="enterEditMode"
          @auto-layout="handleAutoLayout"
          @import="handleImportClick"
          @exit-edit="handleExitEdit"
        />
      </template>
    </el-page-header>

    <div class="rule-chain-editor__content">
      <div v-if="!isMonitorMode" class="rule-chain-editor__left-panel">
        <div class="rule-chain-editor__left-title">Function Nodes</div>
        <div class="rule-chain-editor__card-categories">
          <el-collapse
            v-model="activeCategories"
            expand-icon-position="left"
            class="rule-chain-editor__collapse"
          >
            <el-collapse-item
              v-for="category in cardCategories"
              :key="category.type"
              :name="category.type"
              :title="category.title"
            >
              <template #title>
                <div class="rule-chain-editor__category-title">
                  <span>{{ category.title }}</span>
                </div>
              </template>

              <div class="rule-chain-editor__cards">
                <RuleChainPaletteCard
                  v-for="card in category.cards"
                  :key="card.id"
                  :card="card"
                  @dragstart="onDragStart($event, card as unknown as RuleCard)"
                />
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <div ref="centerPanelRef" class="rule-chain-editor__center-panel">
        <VueFlow
          fit-view-on-init
          :connection-mode="ConnectionMode.Strict"
          :only-render-visible-elements="true"
          :nodes="nodes"
          :edges="edges"
          class="rule-chain-editor__flow rule-editor__flow"
          :default-viewport="{ zoom: 1, x: 0, y: 0 }"
          :min-zoom="0.1"
          :max-zoom="4"
          :snap-to-grid="true"
          :snap-grid="[1, 1]"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-edge-options="{ type: 'deletable-smoothstep' }"
          :connection-line-style="{ stroke: '#B3CEFA', strokeWidth: 3 }"
          :nodes-draggable="true"
          :nodes-connectable="!isMonitorMode"
          :elements-selectable="!isMonitorMode"
          @drop.prevent="handleDropGuard"
          @dragover.prevent="handleDragOverGuard"
          @dragleave="handleDragLeaveGuard"
          @connect="handleConnectGuard"
          @node-double-click="handleNodeDoubleClick"
        >
          <template #node-custom="nodeProps">
            <div class="rf-node-with-vars">
              <CustomNode v-bind="nodeProps" :is-monitor-mode="isMonitorMode" />
            </div>
          </template>
          <template #node-start="nodeProps">
            <StartNode v-bind="nodeProps" />
          </template>
          <template #node-end="nodeProps">
            <EndNode v-bind="nodeProps" />
          </template>
          <Background variant="lines" :gap="20" color="rgba(180, 180, 180, 0.35)" />
          <MiniMap
            v-show="showMiniMap"
            class="rf-minimap-custom"
            :width="200"
            :height="200"
            :node-stroke-color="'#2878ff'"
            :node-color="'#edf4ff'"
            :node-stroke-width="1.5"
            :node-border-radius="4"
            mask-color="rgba(255, 105, 0, 0.06)"
            mask-stroke-color="#ff6900"
            :mask-stroke-width="2"
            :pannable="true"
            :zoomable="true"
            position="top-right"
          />
          <div class="rule-editor__flow-controls" aria-label="Canvas controls">
            <button type="button" class="flow-control-button" aria-label="Fit view" @click="fitFlowToViewport()">
              <img class="flow-control-button__icon" :src="fitViewIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-divider" aria-hidden="true"></span>
            <button type="button" class="flow-control-button" aria-label="Zoom out" @click="zoomOut()">
              <img class="flow-control-button__icon" :src="zoomOutIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-zoom">{{ Math.round((viewport?.zoom ?? 1) * 100) }}%</span>
            <button type="button" class="flow-control-button" aria-label="Zoom in" @click="zoomIn()">
              <img class="flow-control-button__icon" :src="zoomInIcon" alt="" aria-hidden="true" />
            </button>
            <span class="flow-control-divider" aria-hidden="true"></span>
            <button
              type="button"
              class="flow-control-button"
              :class="{ 'is-active': showMiniMap }"
              aria-label="Toggle minimap"
              @click="showMiniMap = !showMiniMap"
            >
              <img class="flow-control-button__icon" :src="toggleMinimapIcon" alt="" aria-hidden="true" />
            </button>
          </div>
        </VueFlow>
        <Teleport to="body">
          <template v-for="nodeId in Array.from(visibleVarsNodes)" :key="nodeId">
            <div
              v-if="isMonitorMode && nodeVarsPositions.has(nodeId) && getNodeVarsData(nodeId)"
              class="node-vars-bubble-fixed"
              :style="getBubbleStyle(nodeId)"
            >
              <div
                class="node-vars-bubble__row"
                v-for="v in getNodeVarsData(nodeId)"
                :key="`${nodeId}-${v.name}-${v.instance}-${v.point}`"
              >
                <div class="node-vars-bubble__left">
                  <span class="var-item">{{
                    `${v.instance_name || v.instance || '-'}/${v.point_name || v.point || '-'}`
                  }}</span>
                </div>
                <div class="node-vars-bubble__right">
                  <span>{{ formatNodeVarValue(v.value) }}</span>
                  <span v-if="v.unit" class="node-vars-bubble__unit">{{ v.unit }}</span>
                </div>
              </div>
            </div>
          </template>
        </Teleport>
      </div>
    </div>

    <div v-if="!isMonitorMode" v-permission="'engineer'" class="rule-chain-editor__floating-actions">
      <el-button
        class="floating-btn floating-btn--cancel"
        title="Restore to last saved"
        @click="handleRestoreToSaved"
      >
        <AppIcon name="i-tabler-rotate-2" />
        <span>Restart</span>
      </el-button>
      <el-button
        type="primary"
        class="floating-btn floating-btn--submit"
        :class="{ 'is-dirty': hasUnsavedChanges }"
        @click="handleSave"
        :disabled="!hasUnsavedChanges"
        title="Submit"
      >
        <AppIcon name="i-tabler-device-floppy" />
        <span>Save</span>
      </el-button>
    </div>

    <CardEditDialog
      v-model:visible="cardEditDialogVisible"
      :card="editingCard"
      @save="handleCardEditConfirm"
    />

    <input
      ref="importFileInput"
      type="file"
      accept="application/json"
      style="display: none"
      @change="handleImportChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick, markRaw, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Background } from '@vue-flow/background'
import AppIcon from '@/components/AppIcon.vue'
import EditorToolbar from '@/components/common/EditorToolbar.vue'
import fitViewIcon from '@/assets/icons/tuopu-fitView.svg'
import toggleMinimapIcon from '@/assets/icons/tuopu-toggleMinimap.svg'
import zoomInIcon from '@/assets/icons/tuopu-zoomIn.svg'
import zoomOutIcon from '@/assets/icons/tuopu-zoomOut.svg'
import {
  VueFlow,
  ConnectionMode,
  useVueFlow,
  type Connection,
  type NodeTypesObject,
  type EdgeTypesObject,
} from '@vue-flow/core'
import CustomNode from './components/customCard/CustomNode.vue'
import StartNode from './components/customCard/StartNode.vue'
import EndNode from './components/customCard/EndNode.vue'
import RuleChainPaletteCard from './components/RuleChainPaletteCard.vue'
import DeletableSmoothStepEdge from '@/views/VisualModeling/components/customEdges/DeletableSmoothStepEdge.vue'
import { MiniMap } from '@vue-flow/minimap'
import { useRuleChainStore } from '@/stores/ruleChain.ts'
import type { RuleCard } from '@/types/ruleConfiguration'
import useDragAndDrop from '@/utils/useDnd'
import CardEditDialog from './components/CardEditDialog.vue'
import { useFlowViewport } from '@/composables/flow/useFlowViewport'
import { useRuleMonitorRuntime } from '@/composables/rule/useRuleMonitorRuntime'
import { useRuleFlowConnections } from '@/composables/rule/useRuleFlowConnections'
import { useRuleFlowChangeHandlers } from '@/composables/rule/useRuleFlowChangeHandlers'
import { useRuleChainEditLifecycle } from '@/composables/rule/useRuleChainEditLifecycle'
import { useRuleNodeDelete } from '@/composables/rule/useRuleNodeDelete'
import { isProtectedRuleNodeId } from '@/utils/ruleFlowNodeCleanup'
import { RULE_CHAIN_EDITOR_KEY } from './ruleChainEditorContext'
const {
  updateNode,
  toObject,
  addEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeUpdate,
  onNodeDragStop,
  setNodes,
  setEdges,
  applyEdgeChanges,
  removeEdges,
  removeNodes,
  fitView,
  zoomIn,
  zoomOut,
  viewport,
  findNode,
} = useVueFlow()
const { onDragStart, onDragOver, onDragLeave, onDrop } = useDragAndDrop()
const route = useRoute()
const router = useRouter()
const ruleChainStore = useRuleChainStore()

const currentChainId = ref('')
const isMonitorMode = ref(true)
const activeCategories = ref(['function', 'action'])
const cardEditDialogVisible = ref(false)
const editingCard = ref<RuleCard | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const showMiniMap = ref(true)
const centerPanelRef = ref<HTMLElement | null>(null)

const nodeTypes = {
  custom: markRaw(CustomNode),
  start: markRaw(StartNode),
  end: markRaw(EndNode),
} as unknown as NodeTypesObject

const edgeTypes = {
  'deletable-smoothstep': markRaw(DeletableSmoothStepEdge),
} as unknown as EdgeTypesObject

const nodes = computed(() =>
  isMonitorMode.value ? ruleChainStore.monitorNodes : ruleChainStore.nodes,
)
const edges = computed(() =>
  isMonitorMode.value ? ruleChainStore.monitorEdges : ruleChainStore.edges,
)
const isFullscreen = computed(() => ruleChainStore.isFullscreen)
const hasUnsavedChanges = computed(() => ruleChainStore.hasUnsavedChanges)

const {
  visibleVarsNodes,
  nodeVarsPositions,
  formatNodeVarValue,
  getNodeVarsData,
  getBubbleStyle,
  updateAllBubblePositions,
  startMonitorSubscription,
  stopMonitorSubscription,
  startSimulation,
  clearSimulation,
  resetRuntimeVisuals,
  clearMonitorOverlay,
} = useRuleMonitorRuntime({
  currentChainId,
  isMonitorMode,
  centerPanelRef,
  edges,
  ruleChainStore,
  findNode,
  viewport,
  setNodes,
  setEdges,
  toObject,
})

const { fitFlowToViewport, handleWindowResize } = useFlowViewport({
  fitView,
  getNodes: () => nodes.value,
  padding: 0.2,
  resizeDelay: 160,
})

let saveEditSnapshotBridge = () => {}

function syncStoreFromFlow() {
  const flow = toObject()
  ruleChainStore.nodes = JSON.parse(JSON.stringify(flow.nodes))
  ruleChainStore.edges = JSON.parse(JSON.stringify(flow.edges))
}

const { applyWireCleanup, deleteRuleNode } = useRuleNodeDelete({
  isMonitorMode,
  toObject,
  updateNode,
  removeNodes,
  removeEdges,
  syncStoreFromFlow,
})

function editRuleNode(nodeId: string) {
  if (isMonitorMode.value || isProtectedRuleNodeId(nodeId)) return
  const node = findNode(nodeId)
  if (!node?.data) return
  editingCard.value = { ...(node.data as RuleCard) }
  cardEditDialogVisible.value = true
}

provide(RULE_CHAIN_EDITOR_KEY, {
  isMonitorMode,
  editNode: editRuleNode,
  deleteNode: deleteRuleNode,
})

const { handleConnect, pruneInvalidIncomingEdges } = useRuleFlowConnections({
  toObject,
  updateNode,
  addEdges,
  removeEdges,
  onHasChanges: () => {
    ruleChainStore.hasUnsavedChanges = true
  },
  onSnapshot: () => saveEditSnapshotBridge(),
})

const {
  cardCategories,
  saveEditSnapshot,
  handleAutoLayout,
  handleRestoreToSaved,
  handleExitEdit,
  handleCardEditConfirm,
  handleSave,
  handleExport,
  enterEditMode,
  handleImportClick,
  handleImportChange,
  loadRuleDetail,
} = useRuleChainEditLifecycle({
  isMonitorMode,
  activeCategories,
  currentChainId,
  importFileInput,
  cardEditDialogVisible,
  ruleChainStore,
  toObject,
  setNodes,
  setEdges,
  updateNode,
  fitFlowToViewport,
  pruneInvalidIncomingEdges,
  monitorRuntime: {
    stopMonitorSubscription,
    clearSimulation,
    resetRuntimeVisuals,
    visibleVarsNodes,
    clearMonitorOverlay,
    startMonitorSubscription,
    startSimulation,
  },
  nodes,
  edges,
})

saveEditSnapshotBridge = saveEditSnapshot

useRuleFlowChangeHandlers({
  isMonitorMode,
  toObject,
  setNodes,
  updateNode,
  syncStoreFromFlow,
  applyWireCleanup,
  applyEdgeChanges,
  onHasChanges: () => {
    ruleChainStore.hasUnsavedChanges = true
  },
  saveEditSnapshot,
  visibleVarsNodes,
  updateAllBubblePositions,
  onNodesChange,
  onConnect,
  onEdgeUpdate,
  onNodeDragStop,
  onEdgesChange,
})

const toggleFullscreen = () => {
  ruleChainStore.toggleFullscreen()
  nextTick(() => fitFlowToViewport())
}

const handleConnectGuard = (connection: Connection) => {
  if (isMonitorMode.value) return
  handleConnect(connection)
}
const handleDragOverGuard = (e: DragEvent) => {
  if (isMonitorMode.value) return
  onDragOver(e)
}
const handleDragLeaveGuard = () => {
  if (isMonitorMode.value) return
  onDragLeave()
}
const handleDropGuard = (e: DragEvent) => {
  if (isMonitorMode.value) return
  e.preventDefault()
  e.stopPropagation()
  onDrop(e)
}

const handleNodeDoubleClick = (event: { node?: { id: string } }) => {
  if (isMonitorMode.value) return
  const node = event.node
  if (!node?.id) return
  editRuleNode(node.id)
}

const goBackToList = () => {
  router.push({ name: 'ruleConfiguration' })
}

onMounted(async () => {
  ruleChainStore.isFullscreen = false
  const chainId = route.params.id as string
  if (chainId) {
    try {
      currentChainId.value = chainId
      await loadRuleDetail(chainId)
    } catch (error) {
      console.error(error)
    }
  }
  window.addEventListener('resize', handleWindowResize)
  fitFlowToViewport()
  if (isMonitorMode.value) {
    startMonitorSubscription()
  }
  startSimulation()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
  ruleChainStore.hasUnsavedChanges = false
  stopMonitorSubscription()
  clearSimulation()
})

watch(
  () => [nodes.value, viewport.value],
  () => {
    if (isMonitorMode.value && visibleVarsNodes.value.size > 0) {
      requestAnimationFrame(() => {
        updateAllBubblePositions()
      })
    }
  },
  { deep: true },
)

watch(
  () => viewport.value,
  (newViewport, oldViewport) => {
    if (!isMonitorMode.value || visibleVarsNodes.value.size === 0) return

    if (
      newViewport &&
      oldViewport &&
      (newViewport.zoom !== oldViewport.zoom ||
        newViewport.x !== oldViewport.x ||
        newViewport.y !== oldViewport.y)
    ) {
      requestAnimationFrame(() => {
        updateAllBubblePositions()
      })
    }
  },
  { deep: true, immediate: false },
)
</script>

<style lang="scss" scoped>
@use '@/assets/styles/components/rule-chain-editor' as rce;

.voltage-class.rule-chain-editor {
  @include rce.rule-chain-editor-host();
}
</style>
