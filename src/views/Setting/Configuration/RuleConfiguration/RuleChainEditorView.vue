<template>
  <div class="voltage-class rule-chain-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <el-page-header
      class="rule-chain-editor__page-header"
      :content="ruleChainStore.currentRuleChain?.name || 'Rule Chain'"
      @back="goBackToList"
    >
      <template #extra>
        <el-button
          size="small"
          type="primary"
          class="custom-button"
          @click="toggleFullscreen"
        >
          <AppIcon
            :name="isFullscreen ? 'i-tabler-arrows-minimize' : 'i-tabler-arrows-maximize'"
            className="rule-chain-editor__toolbar-icon"
          />
          {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
        </el-button>
        <el-button
          v-if="isMonitorMode"
          size="small"
          type="primary"
          @click="handleExport"
          class="custom-button"
        >
          <AppIcon name="i-tabler-file-export" className="rule-chain-editor__toolbar-icon" />
          Export
        </el-button>
        <el-button
          v-if="isMonitorMode"
          v-permission="'engineer'"
          size="small"
          type="primary"
          @click="enterEditMode"
          class="custom-button"
        >
          <AppIcon name="i-tabler-pencil" className="rule-chain-editor__toolbar-icon" />
          Edit
        </el-button>
        <template v-if="!isMonitorMode">
          <el-button v-permission="'engineer'" size="small" class="custom-button" @click="handleAutoLayout">
            <AppIcon name="i-tabler-layout-distribute-vertical" style="margin-right:4px" />
            Auto Layout
          </el-button>
          <el-button
            v-permission="'engineer'"
            size="small"
            type="primary"
            class="custom-button"
            @click="handleImportClick"
          >
            <AppIcon name="i-tabler-upload" className="rule-chain-editor__toolbar-icon" />
            Import
          </el-button>
          <el-button
            v-permission="'engineer'"
            size="small"
            type="primary"
            class="custom-button"
            @click="handleExitEdit"
          >
            <AppIcon name="i-tabler-arrow-left" className="rule-chain-editor__toolbar-icon" />
            Exit Edit
          </el-button>
        </template>
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
              style="margin-bottom: 8px"
            >
              <template #title>
                <div class="rule-chain-editor__category-title">
                  <span>{{ category.title }}</span>
                </div>
              </template>

              <div class="rule-chain-editor__cards">
                <div
                  v-for="card in category.cards"
                  :key="card.id"
                  class="rule-chain-editor__card"
                  :data-type="card.type"
                  draggable="true"
                  @dragstart="onDragStart($event, card as unknown as RuleCard)"
                >
                  <div class="rule-chain-editor__card-icon" :class="`icon--${card.type}`">
                    <AppIcon
                      :name="String(card.icon || 'i-tabler-shape')"
                      className="rule-chain-editor__card-icon-svg"
                    />
                  </div>
                  <div class="rule-chain-editor__card-content">
                    <div class="rule-chain-editor__card-name">{{ card.name }}</div>
                    <div class="rule-chain-editor__card-description">
                      {{ card.description }}
                    </div>
                  </div>
                </div>
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
          :connection-line-style="{ stroke: '#B3CEFA', strokeWidth: 1 }"
          :nodes-draggable="true"
          :nodes-connectable="!isMonitorMode"
          :elements-selectable="!isMonitorMode"
          @drop.prevent="handleDropGuard"
          @dragover.prevent="handleDragOverGuard"
          @dragleave="handleDragLeaveGuard"
          @connect="handleConnectGuard"
          @node-double-click="handleNodeClick"
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
import { ref, computed, onMounted, watch, onUnmounted, nextTick, markRaw } from 'vue'
import { getCurrentFontSize } from '@/utils/responsive'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRuleDetail } from '@/api/rulesManagement'
import { Background } from '@vue-flow/background'
import AppIcon from '@/components/AppIcon.vue'
import fitViewIcon from '@/assets/icons/tuopu-fitView.svg'
import toggleMinimapIcon from '@/assets/icons/tuopu-toggleMinimap.svg'
import zoomInIcon from '@/assets/icons/tuopu-zoomIn.svg'
import zoomOutIcon from '@/assets/icons/tuopu-zoomOut.svg'
import {
  VueFlow,
  ConnectionMode,
  useVueFlow,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type Connection,
  type NodeChange,
  type NodeTypesObject,
} from '@vue-flow/core'
import CustomNode from './components/customCard/CustomNode.vue'
import StartNode from './components/customCard/StartNode.vue'
import EndNode from './components/customCard/EndNode.vue'
// import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
// import { Controls } from '@vue-flow/controls'
import { useRuleChainStore } from '@/stores/ruleChain.ts'
import type {
  RuleCard,
  RuleChain,
  Node as AppNode,
  Edge as AppEdge,
} from '@/types/ruleConfiguration'
import type { RuleChainPayload } from '@/types/ruleConfiguration'
import useDragAndDrop from '@/utils/useDnd'
import CardEditDialog from './components/CardEditDialog.vue'
import { updateRule } from '@/api/rulesManagement'
import wsManager from '@/utils/websocket'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import { layoutRuleChain } from '@/utils/ruleChainLayout'
import { useFlowHistory } from '@/composables/flow/useFlowHistory'
import { useFlowViewport } from '@/composables/flow/useFlowViewport'
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
  fitView,
  zoomIn,
  zoomOut,
  viewport,
  findNode,
} = useVueFlow()
const { onDragStart, onDragOver, onDragLeave, onDrop } = useDragAndDrop()
// 路由
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
const subscriptionId = ref<string>('')
const visibleVarsNodes = ref<Set<string>>(new Set())
const lastActiveNodeIds = ref<Set<string>>(new Set())
const nodeVarsPositions = ref<Map<string, { top: number; left: number }>>(new Map())
const centerPanelRef = ref<HTMLElement | null>(null)
const nodeVariablesData = ref<Map<string, Record<string, number>>>(new Map())

const nodeTypes = {
  custom: markRaw(CustomNode),
  start: markRaw(StartNode),
  end: markRaw(EndNode),
} as unknown as NodeTypesObject

const nodes = computed(() => {
  return isMonitorMode.value ? ruleChainStore.monitorNodes : ruleChainStore.nodes
})
const edges = computed(() => {
  return isMonitorMode.value ? ruleChainStore.monitorEdges : ruleChainStore.edges
})
const isFullscreen = computed(() => ruleChainStore.isFullscreen)
const hasUnsavedChanges = computed(() => ruleChainStore.hasUnsavedChanges)

let isRestoringEditHistory = false
const editHistory = useFlowHistory({
  enabled: () => !isMonitorMode.value && !isRestoringEditHistory,
  capture: () => {
    const flowObj = toObject()
    return {
      nodes: flowObj.nodes as FlowNode[],
      edges: flowObj.edges as FlowEdge[],
    }
  },
  restore: async (snapshot) => {
    isRestoringEditHistory = true
    setNodes(ensureStartEndNodesUndeletable(snapshot.nodes))
    setEdges(snapshot.edges)
    ruleChainStore.hasUnsavedChanges = true
    await nextTick()
    isRestoringEditHistory = false
  },
})
const { snapshots: editSnapshots, snapIdx: editSnapIdx, canUndo: canUndoEdit, canRedo: canRedoEdit } = editHistory

function saveEditSnapshot() {
  editHistory.saveSnapshot()
}

async function undoEdit() {
  await editHistory.undo()
}

async function redoEdit() {
  await editHistory.redo()
}

async function handleAutoLayout() {
  if (isMonitorMode.value) return
  const flowObj = toObject()
  const laidOut = layoutRuleChain(
    flowObj.nodes as FlowNode[],
    flowObj.edges as FlowEdge[],
  )
  setNodes(ensureStartEndNodesUndeletable(laidOut))
  ruleChainStore.hasUnsavedChanges = true
  saveEditSnapshot()
  await nextTick()
  fitFlowToViewport()
  ElMessage.success('Auto layout completed')
}

// 规则卡片分类
const cardCategories = ref([
  {
    type: 'function',
    title: 'Funtcion',
    icon: 'Filter',
    cards: [
      {
        id: 'function-2',
        name: 'Switch Function',
        type: 'function-switch',
        description: 'Switch function',
        icon: 'i-tabler-git-fork',
        config: {
          variables: [],
          rule: [],
          wires: {},
        },
      },
    ],
  },
  {
    type: 'action',
    title: 'Action',
    icon: 'Operation',
    tooltip: 'action cards are used to perform specific actions',
    cards: [
      {
        id: 'action-1',
        name: 'Change Value',
        type: 'action-changeValue',
        description: 'Change value',
        icon: 'i-tabler-adjustments',
        config: { rule: [], wires: {} },
      },
      {
        id: 'action-2',
        name: 'Period Delta',
        type: 'action-periodDelta',
        description: 'Period delta',
        icon: 'i-tabler-chart-line',
        config: {
          input: {
            name: 'X1',
            instance: 1,
            pointType: 'measurement',
            point: 9,
          },
          output: {
            name: 'X2',
            instance: 1,
            pointType: 'measurement',
            point: 101,
          },
          period: 'daily',
          wires: { default: [] },
        },
      },
    ],
  },
])

// 确保 start 和 end 节点不可删除
function ensureStartEndNodesUndeletable(nodes: FlowNode[]) {
  return nodes.map((node) => {
    if (node.id === 'start' || node.id === 'end') {
      return {
        ...node,
        deletable: false,
      }
    }
    return node
  })
}

let isInitNodes = true
onNodesChange((changes: NodeChange[]) => {
  if (isInitNodes) {
    isInitNodes = false
    return
  }

  // 拦截删除 start 和 end 节点的操作
  const removeChanges = changes.filter((change) => change.type === 'remove')
  if (removeChanges.length > 0 && !isMonitorMode.value) {
    const protectedNodeIds = new Set(['start', 'end'])
    const attemptedDeletes = removeChanges
      .map((change) => (change as any).id)
      .filter((id: string) => protectedNodeIds.has(id))

    if (attemptedDeletes.length > 0) {
      ElMessage.warning('Start and End nodes cannot be deleted')
      // 阻止删除操作：从 changes 中移除这些删除操作
      const filteredChanges = changes.filter((change) => {
        if (change.type === 'remove') {
          const nodeId = (change as any).id
          return !protectedNodeIds.has(nodeId)
        }
        return true
      })
      // 应用过滤后的 changes
      if (filteredChanges.length !== changes.length) {
        // 重新设置节点以确保 start 和 end 节点存在
        const currentNodes = toObject().nodes as FlowNode[]
        const updatedNodes = ensureStartEndNodesUndeletable(currentNodes)
        setNodes(updatedNodes)
        return
      }
    }
  }

  // 只在实际修改节点数据、位置、添加或删除时触发，过滤掉视图变化（如选中、尺寸变化等）
  const meaningfulChanges = changes.filter((change) => {
    // 过滤掉 select（选中）和 dimensions（尺寸变化，可能是视图变化导致的）
    if (change.type === 'select' || change.type === 'dimensions') {
      return false
    }
    // 保留 add（添加节点）、remove（删除节点）、position（位置变化，即拖拽）
    return change.type === 'add' || change.type === 'remove' || change.type === 'position'
  })
  if (meaningfulChanges.length > 0) {
    // 监视模式下：VueFlow 内部已维护状态，只需更新变量浮层位置
    if (isMonitorMode.value) {
      const positionChanges = meaningfulChanges.filter((c) => c.type === 'position')
      if (positionChanges.length > 0 && visibleVarsNodes.value.size > 0) {
        requestAnimationFrame(() => {
          updateAllBubblePositions()
        })
      }
    } else {
      ruleChainStore.hasUnsavedChanges = true
      saveEditSnapshot()
    }
  }
})

onConnect(() => {
  ruleChainStore.hasUnsavedChanges = true
  saveEditSnapshot()
})
onEdgeUpdate(() => {
  ruleChainStore.hasUnsavedChanges = true
  saveEditSnapshot()
})
onNodeDragStop(() => {
  if (isMonitorMode.value) {
    if (visibleVarsNodes.value.size > 0) {
      nextTick(() => {
        updateAllBubblePositions()
      })
    }
  } else {
    ruleChainStore.hasUnsavedChanges = true
  }
})
onEdgesChange((changes: any[]) => {
  // 过滤掉选择操作，选择操作不应该触发 hasUnsavedChanges
  const meaningfulChanges = (changes || []).filter((change) => {
    // 过滤掉 select（选中）操作
    return change.type !== 'select'
  })

  if (meaningfulChanges.length === 0) {
    // 如果没有有意义的变更，直接应用 changes（用于选择状态更新）但不设置 hasUnsavedChanges
    applyEdgeChanges && applyEdgeChanges(changes)
    return
  }

  for (const change of meaningfulChanges) {
    if (change.type === 'remove') {
      const sourceId = change.source
      const allNodes = (toObject().nodes as any[]) || []
      const sourceNode = allNodes.find((n) => n.id === sourceId)
      const key =
        sourceNode?.data?.type === 'function-switch' ? change.sourceHandle || '' : 'default'
      if (sourceNode && sourceNode.data?.config?.wires) {
        const wires = sourceNode.data.config.wires as Record<string, string[]>
        const arr = wires[key]
        if (Array.isArray(arr)) {
          const idx = arr.indexOf(change.target)
          if (idx > -1) arr.splice(idx, 1)
        }
      }
      updateNode(sourceNode?.id, {
        data: {
          ...sourceNode?.data,
        },
      })
    }
  }
  ruleChainStore.hasUnsavedChanges = true
  applyEdgeChanges && applyEdgeChanges(changes)
})

const { fitFlowToViewport, handleWindowResize } = useFlowViewport({
  fitView,
  getNodes: () => nodes.value,
  padding: 0.2,
  resizeDelay: 160,
})

function exitMonitorMode() {
  isMonitorMode.value = true
  nextTick(() => fitFlowToViewport())
}

const toggleFullscreen = () => {
  ruleChainStore.toggleFullscreen()
  nextTick(() => fitFlowToViewport())
}

const handleExitEdit = async () => {
  if (!hasUnsavedChanges.value) {
    exitMonitorMode()
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
        center: true,
        showClose: false,
      },
    )
    handleCancel()
    exitMonitorMode()
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
      'Restore rule chain to the last saved state? Unsaved edits will be lost.',
      'Restore',
      {
        confirmButtonText: 'Restore',
        cancelButtonText: 'Cancel',
        type: 'warning',
        center: true,
        showClose: false,
      },
    )
    handleCancel()
    ElMessage.success('Restored to last saved state')
  } catch {
    // cancelled
  }
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

const handleNodeClick = (event: any) => {
  if (isMonitorMode.value) return
  const node = event.node || event
  if (node.id === 'start' || node.id === 'end') return
  if (node && node.data) {
    editingCard.value = { ...node.data }
    cardEditDialogVisible.value = true
  }
}

const handleCardEditConfirm = (newCard: any) => {
  if (!newCard?.id) return
  updateNode(newCard.id, {
    data: {
      ...newCard,
    },
  })
  pruneInvalidIncomingEdges(newCard.id)
  ruleChainStore.hasUnsavedChanges = true
  cardEditDialogVisible.value = false
}

function pruneInvalidIncomingEdges(targetNodeId: string) {
  const obj = toObject()
  const allEdges = (obj.edges as any[]) || []
  const allNodes = (obj.nodes as any[]) || []
  const incoming = allEdges.filter((e) => e.source === targetNodeId)
  const removeChanges: any[] = []
  for (const edge of incoming) {
    const sourceNode = allNodes.find((n) => n.id === edge.source)
    if (!sourceNode) continue
    if (sourceNode.data?.type === 'function-switch') {
      const wires = sourceNode.data?.config?.wires
      const keys = wires && typeof wires === 'object' ? Object.keys(wires) : []
      const allowed = new Set<string>([...keys, ...keys.map((k) => `right${k}`)])
      if (!allowed.has(edge.sourceHandle)) {
        removeChanges.push(edge.id)
      }
    }
  }

  if (removeChanges.length) {
    removeEdges(removeChanges)
    ruleChainStore.hasUnsavedChanges = true
  }
}

const handleConnect = (connection: Connection) => {
  const newEdge: FlowEdge = {
    id: `edge-${Date.now()}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle || 'right',
    targetHandle: connection.targetHandle || 'left',
    style: {
      stroke: '#6F3381',
      strokeWidth: 3,
    },
  }

  const allNodes = (toObject().nodes as any[]) || []
  const sourceNode = allNodes.find((n) => n.id === newEdge.source)
  const key = sourceNode?.data?.type === 'function-switch' ? newEdge.sourceHandle || '' : 'default'
  if (sourceNode) {
    if (!sourceNode.data.config) sourceNode.data.config = {}
    if (!sourceNode.data.config.wires || typeof sourceNode.data.config.wires !== 'object') {
      sourceNode.data.config.wires = {}
    }
    const wires = sourceNode.data.config.wires as Record<string, string[]>
    const wireKey = key || 'default'
    if (!Array.isArray(wires[wireKey])) wires[wireKey] = []
    if (!wires[wireKey].includes(newEdge.target)) {
      wires[wireKey].push(newEdge.target)
    }
    // 使用传回的新数据更新节点
    updateNode(sourceNode.id, {
      data: {
        ...sourceNode.data,
      },
    })
  }
  ruleChainStore.hasUnsavedChanges = true
  addEdges(newEdge)
  saveEditSnapshot()
}

const handleSave = async () => {
  const flowObj = toObject()
  const newNodes = flowObj.nodes as unknown as AppNode[]
  const newEdges = flowObj.edges as unknown as AppEdge[]

  // 使用当前 VueFlow 中的数据构建 payload，而不是 store 中的旧数据
  const payload = ruleChainStore.exportRuleChain(
    flowObj.nodes as FlowNode[],
    flowObj.edges as FlowEdge[],
  ) as RuleChainPayload
  try {
    await updateRule(payload)
    ruleChainStore.saveChanges(newNodes, newEdges)
    ruleChainStore.hasUnsavedChanges = false
    editHistory.clear()
    nextTick(() => saveEditSnapshot())
    ElMessage.success('Submitted successfully')
    nextTick(() => {
      fitFlowToViewport()
    })
  } catch (error) {
    ruleChainStore.hasUnsavedChanges = true
    ElMessage.error('Submit failed')
  }
}

const handleCancel = () => {
  ruleChainStore.discardChanges()
  setNodes(nodes.value as unknown as FlowNode[])
  setEdges(edges.value as unknown as FlowEdge[])
  ElMessage.success('Changes discarded')
}

const handleExport = async () => {
  // 使用当前 VueFlow 中的数据导出，确保导出的是当前显示的数据
  const flowObj = toObject()
  const ruleChainData = ruleChainStore.exportRuleChain(
    flowObj.nodes as FlowNode[],
    flowObj.edges as FlowEdge[],
  )
  const dataStr = JSON.stringify(ruleChainData, null, 2)
  const bytes = new TextEncoder().encode(dataStr)
  const saveResult = await saveBytesWithPreferredPath(
    bytes,
    `${ruleChainData.name}.json`,
    'application/json',
  )
  ElMessage.success(`Rule chain exported: ${saveResult.displayPath}`)
}

const goBackToList = () => {
  router.push({ name: 'ruleConfiguration' })
}

function normalizeRuleRuntimePayload(rawData: any): {
  ruleId: number | null
  executionNodeIds: string[]
  nodeVariables: Map<string, Record<string, number>>
} | null {
  if (!rawData || typeof rawData !== 'object') return null

  // Runtime packets now use data.last_execution only.
  const runtime = rawData.last_execution
  if (!runtime || typeof runtime !== 'object') return null
  const ruleIdRaw = rawData.rule_id
  const ruleId = typeof ruleIdRaw === 'number' ? ruleIdRaw : Number(ruleIdRaw) || null

  const executionPath = Array.isArray(runtime.execution_path) ? runtime.execution_path : []
  const executionNodeIds: string[] = []
  const nodeVariables = new Map<string, Record<string, number>>()

  executionPath.forEach((item: any) => {
    // execution_path is string[] of node ids.
    if (typeof item === 'string' || typeof item === 'number') {
      const nodeId = String(item)
      if (nodeId && nodeId !== 'undefined' && nodeId !== 'null') {
        executionNodeIds.push(nodeId)
      }
    }
  })

  // New payload detail: values are in last_execution.node_details[*].input_values.
  const nodeDetails = runtime.node_details
  if (nodeDetails && typeof nodeDetails === 'object') {
    Object.entries(nodeDetails).forEach(([nodeId, detail]) => {
      if (!nodeId || nodeId === 'start' || nodeId === 'end') return
      const inputValues = (detail as any)?.input_values
      if (
        inputValues &&
        typeof inputValues === 'object' &&
        Object.keys(inputValues).length > 0
      ) {
        nodeVariables.set(nodeId, inputValues as Record<string, number>)
      }
    })
  }

  return {
    ruleId,
    executionNodeIds,
    nodeVariables,
  }
}

function applyRuntimeUpdate(data: any) {
  const normalized = normalizeRuleRuntimePayload(data)
  if (!normalized) return

  // Guard against unexpected cross-rule payloads.
  const currentRuleId = Number(currentChainId.value)
  if (normalized.ruleId != null && currentRuleId && normalized.ruleId !== currentRuleId) return
  if (!normalized.executionNodeIds.length) return

  visibleVarsNodes.value = new Set(normalized.nodeVariables.keys())
  nodeVariablesData.value = normalized.nodeVariables

  const currentActiveSet = new Set<string>(normalized.executionNodeIds)
  const lastActiveSet = lastActiveNodeIds.value
  const hasChanged =
    currentActiveSet.size !== lastActiveSet.size ||
    !Array.from(currentActiveSet).every((id: string) => lastActiveSet.has(id))

  if (hasChanged) {
    lastActiveNodeIds.value = currentActiveSet
    applyActiveRuntime(normalized.executionNodeIds)
  }

  if (visibleVarsNodes.value.size > 0) {
    nextTick(() => {
      updateAllBubblePositions()
    })
  }
}

function startMonitorSubscription() {
  if (!isMonitorMode.value) return
  try {
    subscriptionId.value = wsManager.subscribe(
      {
        source: 'rule',
        channels: [Number(currentChainId.value)],
        interval: 1000,
      },
      {
        onBatchDataUpdate: (payload: any) => {
          try {
            applyRuntimeUpdate(payload)
          } catch (error) {
            console.error('[RuleChainEditor] 处理规则执行数据失败:', error)
          }
        },
      } as any,
    )
  } catch (error) {
    console.error('[RuleChainEditor] 订阅规则失败:', error)
  }
}
function stopMonitorSubscription() {
  try {
    wsManager.unsubscribe(subscriptionId.value)
  } catch {}
}

function enterEditMode() {
  isMonitorMode.value = false
  activeCategories.value = cardCategories.value.map((category) => category.type)
  stopMonitorSubscription()
  clearSimulation()
  resetRuntimeVisuals()
  visibleVarsNodes.value.clear()
  editHistory.clear()
  nextTick(() => saveEditSnapshot())
}

function isCompositeVariable(varDef: any): boolean {
  const type = String(varDef?.type || '')
    .trim()
    .toLowerCase()
  return type === 'combined' || type === 'composite' || type === 'object' || type === 'array'
}

function formatNodeVarValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value.toFixed(3)).toString()
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '-'
    // 仅对纯数字字符串做小数位限制，其它字符串按原样展示
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const asNum = Number(trimmed)
      if (Number.isFinite(asNum)) {
        return Number(asNum.toFixed(3)).toString()
      }
    }
    return value
  }
  return String(value)
}

function getNodeVarsData(nodeId: string) {
  const node = findNode(nodeId)
  if (!node || node.type === 'start' || node.type === 'end') return null

  const varDefinitions = Array.isArray(node.data?.config?.variables)
    ? node.data.config.variables.filter((varDef: any) => !isCompositeVariable(varDef))
    : []

  const realtimeVars = nodeVariablesData.value.get(nodeId)
  if (realtimeVars) {
    return varDefinitions.map((varDef: any) => {
      const varName = varDef.name || varDef.point || ''
      const value = realtimeVars[varName] !== undefined ? realtimeVars[varName] : undefined
      return {
        ...varDef,
        value: value,
      }
    })
  }

  return varDefinitions
}

function updateBubblePosition(nodeId: string) {
  const node = findNode(nodeId)
  if (!node || !centerPanelRef.value) {
    visibleVarsNodes.value.delete(nodeId)
    nodeVarsPositions.value.delete(nodeId)
    return
  }

  try {
    let nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement
    if (!nodeElement) {
      nodeElement = document.querySelector(`.vue-flow__node[data-id="${nodeId}"]`) as HTMLElement
    }

    if (!nodeElement) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return
    }

    const nodeRect = nodeElement.getBoundingClientRect()
    if (nodeRect.width === 0 || nodeRect.height === 0) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return
    }

    const containerRect = centerPanelRef.value.getBoundingClientRect()
    const isFullscreen = ruleChainStore.isFullscreen
    const headerHeight = isFullscreen ? 0.6 * getCurrentFontSize() : 0

    const maxLeft = isFullscreen ? window.innerWidth : containerRect.right
    const maxTop = isFullscreen ? window.innerHeight - headerHeight : containerRect.bottom
    const minLeft = isFullscreen ? 0 : containerRect.left
    const minTop = isFullscreen ? containerRect.top : containerRect.top

    if (
      nodeRect.right < minLeft ||
      nodeRect.left > maxLeft ||
      nodeRect.bottom < minTop ||
      nodeRect.top > maxTop
    ) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return
    }

    const left = nodeRect.left
    const top = nodeRect.bottom
    nodeVarsPositions.value.set(nodeId, { top, left })
  } catch (error) {
    console.error('Failed to update bubble position:', error)
    visibleVarsNodes.value.delete(nodeId)
    nodeVarsPositions.value.delete(nodeId)
  }
}

function getBubbleStyle(nodeId: string): Record<string, string> {
  const position = nodeVarsPositions.value.get(nodeId)
  if (!position || !centerPanelRef.value) return { display: 'none' }

  const node = findNode(nodeId)
  if (!node) {
    visibleVarsNodes.value.delete(nodeId)
    nodeVarsPositions.value.delete(nodeId)
    return { display: 'none' }
  }

  const currentZoom = viewport.value?.zoom || 1
  const scale = currentZoom
  const bubbleWidth = 2.5 * getCurrentFontSize() * scale
  const bubbleHeight = 3 * getCurrentFontSize() * scale

  let left = position.left
  let top = position.top

  const containerRect = centerPanelRef.value.getBoundingClientRect()
  const isFullscreen = ruleChainStore.isFullscreen
  const headerHeight = isFullscreen ? 0.6 * getCurrentFontSize() : 0
  console.log(containerRect, '////')

  const maxLeft = isFullscreen ? window.innerWidth : containerRect.right
  const maxTop = isFullscreen ? window.innerHeight - headerHeight : containerRect.bottom
  const minLeft = isFullscreen ? 0 : containerRect.left
  const minTop = isFullscreen ? containerRect.top : containerRect.top
  console.log(maxLeft, 'maxLeft', maxTop, 'maxTop', minLeft, 'minLeft', minTop, 'minTop')
  console.log(bubbleWidth, 'bubbleWidth', bubbleHeight, 'bubbleHeight', scale, 'scale')

  if (left + bubbleWidth > maxLeft) {
    left = Math.max(minLeft, left)
  }
  if (left + bubbleWidth < minLeft) {
    left = minLeft + bubbleWidth
  }

  if (top > maxTop + bubbleHeight) {
    top = maxTop - bubbleHeight
  }
  if (top < minTop) {
    top = minTop
  }

  if (left < minLeft || left + bubbleWidth > maxLeft || top < minTop || top > maxTop) {
    visibleVarsNodes.value.delete(nodeId)
    nodeVarsPositions.value.delete(nodeId)
    return { display: 'none' }
  }

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: '99999',
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
}

function updateAllBubblePositions() {
  visibleVarsNodes.value.forEach((nodeId) => {
    updateBubblePosition(nodeId)
  })
}

let simTimer: any = null

function clearSimulation() {
  if (simTimer) {
    clearInterval(simTimer)
    simTimer = null
  }
}

function resetRuntimeVisuals() {
  setEdges((prev: any[]) =>
    prev.map((e: any) => ({
      ...e,
      class: '',
      data: { ...(e.data || {}), isAnimating: false },
    })),
  )
  setNodes((prev: any[]) =>
    prev.map((n: any) => ({
      ...n,
      class: '',
      data: { ...(n.data || {}), status: '' },
    })),
  )
}

function applyActiveRuntime(activeNodeIds: string[]) {
  const activeNodes = new Set(activeNodeIds)
  const currentEdges = edges.value
  const activeEdges = currentEdges
    .filter((e) => activeNodes.has(String(e.source)) && activeNodes.has(String(e.target)))
    .map((e) => String(e.id))
  const activeEdgeSet = new Set(activeEdges)

  setNodes((prev: any[]) =>
    prev.map((n: any) => ({
      ...n,
      class: activeNodes.has(String(n.id)) ? 'active-node' : '',
    })),
  )
  setEdges((prev: any[]) =>
    prev.map((e: any) => ({
      ...e,
      class: activeEdgeSet.has(String(e.id)) ? 'active-edge' : '',
      data: { ...(e.data || {}), isAnimating: activeEdgeSet.has(String(e.id)) },
    })),
  )

  if (isMonitorMode.value) {
    const updatedNodes = toObject().nodes as any[]
    const updatedEdges = toObject().edges as any[]
    ruleChainStore.updateMonitorNodes(updatedNodes as unknown as FlowNode[])
    ruleChainStore.updateMonitorEdges(updatedEdges as unknown as FlowEdge[])
  }
}

function startSimulation() {
  if (!isMonitorMode.value) return
  clearSimulation()
  resetRuntimeVisuals()
}

const handleImportClick = () => {
  importFileInput.value?.click()
}

const handleImportChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const text = reader.result as string
      const parsed = JSON.parse(text || '{}')
      const flow = parsed?.flow_json || parsed
      const nextNodes = Array.isArray(flow?.nodes) ? flow.nodes : []
      const nextEdges = Array.isArray(flow?.edges) ? flow.edges : []
      if (!nextNodes.length && !nextEdges.length) {
        ElMessage.error('Import failed: no nodes or edges found')
        return
      }
      // 确保 start 和 end 节点不可删除
      const protectedNodes = ensureStartEndNodesUndeletable(nextNodes as FlowNode[])
      setNodes(protectedNodes)
      setEdges(nextEdges as unknown as FlowEdge[])
      ruleChainStore.hasUnsavedChanges = true
      saveEditSnapshot()
      ElMessage.success('Imported successfully')
    } catch (error) {
      ElMessage.error('Import failed: invalid JSON structure')
    } finally {
      target.value = ''
    }
  }
  reader.readAsText(file)
}
const RuleDetail = async (chainId: string) => {
  const res = await getRuleDetail(chainId)
  if (res.success && res?.data) {
    const payload = res.data
    const flow = payload.flow_json
    const nextNodes = Array.isArray(flow?.nodes) ? flow.nodes : []
    const nextEdges = Array.isArray(flow?.edges) ? flow.edges : []
    if (nextNodes.length || nextEdges.length) {
      // 确保 start 和 end 节点不可删除
      const protectedNodes = ensureStartEndNodesUndeletable(nextNodes as FlowNode[])
      ruleChainStore.saveChanges(
        protectedNodes as unknown as AppNode[],
        nextEdges as unknown as AppEdge[],
      )
      ruleChainStore.setCurrentRuleChain({
        id: chainId,
        name: payload.name || '',
        description: payload.description || '',
        priority: payload.priority || 10,
        enabled: payload.enabled || true,
        cooldown_ms: payload.cooldown_ms || 5000,
      } as unknown as RuleChain)
      setNodes(protectedNodes)
      setEdges(nextEdges as unknown as FlowEdge[])
    } else {
      ruleChainStore.initDefaultGraph()
      setNodes(ruleChainStore.nodes as unknown as FlowNode[])
      setEdges([] as unknown as FlowEdge[])
      ruleChainStore.setCurrentRuleChain({
        id: chainId,
        name: payload.name || '',
        description: payload.description || '',
        priority: payload.priority || 10,
        enabled: payload.enabled || true,
        cooldown_ms: payload.cooldown_ms || 5000,
      })
    }
  }
}

onMounted(async () => {
  ruleChainStore.isFullscreen = false
  const chainId = route.params.id as string
  if (chainId) {
    try {
      currentChainId.value = chainId
      await RuleDetail(chainId)
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
  () => isMonitorMode.value,
  (val) => {
    if (val) {
      ruleChainStore.createMonitorSnapshot()
      nextTick(() => {
        const monitorNodes = ensureStartEndNodesUndeletable(
          ruleChainStore.monitorNodes as unknown as FlowNode[],
        )
        setNodes(monitorNodes)
        setEdges(ruleChainStore.monitorEdges as unknown as FlowEdge[])
        resetRuntimeVisuals()
        startSimulation()
        startMonitorSubscription()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitFlowToViewport()
          })
        })
      })
    } else {
      clearSimulation()
      const currentNodes = toObject().nodes as any[]
      const currentEdges = toObject().edges as any[]
      ruleChainStore.updateMonitorNodes(currentNodes as unknown as FlowNode[])
      ruleChainStore.updateMonitorEdges(currentEdges as unknown as FlowEdge[])
      nextTick(() => {
        const editNodes = ensureStartEndNodesUndeletable(
          ruleChainStore.nodes as unknown as FlowNode[],
        )
        setNodes(editNodes)
        setEdges(ruleChainStore.edges as unknown as FlowEdge[])
        resetRuntimeVisuals()
        visibleVarsNodes.value.clear()
        nodeVarsPositions.value.clear()
        nodeVariablesData.value.clear()
        lastActiveNodeIds.value.clear()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitFlowToViewport()
          })
        })
      })
    }
  },
)

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
.voltage-class {
  .rule-chain-editor {
    // background-color: ;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;

    &.is-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 10000;
      height: 100vh;
      width: 100vw;
      background-color: #ffffff;
      background-image: none;
    }

    .rule-chain-editor__page-header {
      height: 64px;
      display: flex;
      align-items: center;
      background-color: transparent;
      border-bottom: 1px solid rgba(15, 31, 61, 0.08);
      :deep(.el-page-header__left) {
        font-weight: 600;
      }
      :deep(.el-page-header__header) {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      // :deep(.el-page-header__extra) {
      //   display: flex;
      //   align-items: center;
      //   gap: 6px;
      //   flex-wrap: wrap;
      // }

      // .rule-chain-editor__save-btn.is-dirty:not(:disabled) {
      //   box-shadow: 0 0 0 2px rgba(255, 138, 0, 0.55);
      // }
      // :deep(.el-button) {
      //   height: 24px;
      //   padding: 0 8px;
      //   font-size: 11px;
      // }
      // :deep(.rule-chain-editor__toolbar-icon) {
      //   width: 12px;
      //   height: 12px;
      //   flex-shrink: 0;
      // }
    }

    .rule-chain-editor__content {
      display: flex;
      flex: 1;
      min-height: 0;
      background-color: transparent;

      .rule-chain-editor__left-panel {
        width: 348px;
        background: #ffffff;
        border: 2px solid #e3e6e9;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        transition: width 0.3s ease;
        box-shadow: 6px 0 12px rgba(15, 31, 61, 0.08);

        .rule-chain-editor__left-title {
          padding: 14px 16px;
          font-size: 16px;
          font-weight: 700;
          color: #354c7b;
          background: #ededf6;
        }

        .rule-chain-editor__chain-selector {
          padding: 16px 12px;
          position: relative;
        }

        .rule-chain-editor__card-categories {
          flex: 1;
          overflow-y: auto;
          padding: 16px;

          :deep(.el-collapse-item__content) {
            padding: 8px 8px 10px;
            border-radius: 0 0 8px 8px;
            background: #ffffff;
            border: 0;
          }
          :deep(.el-collapse) {
            border: none;
          }
          :deep(.el-collapse-item__wrap) {
            border-bottom: none;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
          }

          .rule-chain-editor__category-title {
            display: flex;
            align-items: center;
            gap: 8px;

            .rule-chain-editor__tooltip-icon {
              margin-left: auto;
              cursor: help;
              color: #909399;
            }
          }
        }

        .rule-chain-editor__cards {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;

          .rule-chain-editor__card {
            width: 100%;
            min-height: 72px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #eeeeee;
            background: #ffffff;
            cursor: grab;
            transition: all 0.2s ease;
            box-shadow: none;
          }

          .rule-chain-editor__card:hover {
            border-color: #b3cefa;
            background: #f8f9fb;
          }

          .rule-chain-editor__card:active {
            cursor: grabbing;
          }

          .rule-chain-editor__card[data-type='function-switch'] {
            background-color: #81c784;
            box-shadow: none;
          }

          .rule-chain-editor__card[data-type='action-changeValue'] {
            background-color: #4fc3f7;
            box-shadow: none;
          }

          .rule-chain-editor__card[data-type='action-periodDelta'] {
            background-color: #9c27b0;
            box-shadow: none;
          }

          .rule-chain-editor__card[data-type='function-switch'] .rule-chain-editor__card-name,
          .rule-chain-editor__card[data-type='function-switch'] .rule-chain-editor__card-description,
          .rule-chain-editor__card[data-type='action-changeValue'] .rule-chain-editor__card-name,
          .rule-chain-editor__card[data-type='action-changeValue'] .rule-chain-editor__card-description,
          .rule-chain-editor__card[data-type='action-periodDelta'] .rule-chain-editor__card-name,
          .rule-chain-editor__card[data-type='action-periodDelta'] .rule-chain-editor__card-description {
            color: #ffffff;
          }

          .rule-chain-editor__card-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #e8f4fd 0%, #d1e7f5 100%);
            border-radius: 6px;
            margin-right: 12px;
            font-size: 20px;
          }

          .rule-chain-editor__card-icon :deep(svg) {
            width: 20px;
            height: 20px;
          }

          .rule-chain-editor__card-icon img {
            width: 20px;
            height: 20px;
            object-fit: contain;
          }

          .rule-chain-editor__card-icon.icon--function-switch {
            background: #66bb6a;
          }

          .rule-chain-editor__card-icon.icon--function-switch :deep(svg) {
            color: #ffffff;
          }

          .rule-chain-editor__card-icon.icon--action-changeValue {
            background: #29b6f6;
          }

          .rule-chain-editor__card-icon.icon--action-changeValue :deep(svg) {
            color: #ffffff;
          }

          .rule-chain-editor__card-icon.icon--action-periodDelta {
            background: #7b1fa2;
          }

          .rule-chain-editor__card-icon.icon--action-periodDelta :deep(svg) {
            color: #ffffff;
          }

          .rule-chain-editor__card-content {
            flex: 1;
          }

          .rule-chain-editor__card-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 4px;
            font-size: 12px;
          }

          .rule-chain-editor__card-description {
            font-size: 10px;
            color: #909399;
            line-height: 1.4;
          }
        }
      }

      .rule-chain-editor__center-panel {
        flex: 1;
        height: 100%;
        position: relative;
        z-index: 1;
        background-color: #fbfcff;
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;

        .rule-chain-editor__flow {
          width: 100%;
          height: 100%;
        }

        @keyframes active-edge-dash {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -80;
          }
        }
        :deep(.active-edge .vue-flow__edge-path) {
          stroke: #ffd166 !important;
          stroke-width: 3 !important;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
          shape-rendering: geometricPrecision;
          stroke-dasharray: 8 12 !important;
          animation: active-edge-dash 2s linear infinite;
          will-change: stroke-dashoffset;
          filter: drop-shadow(0 0 3px rgba(255, 209, 102, 0.6));
          backface-visibility: hidden;
          transform: translateZ(0);
        }
        :deep(.vue-flow__edge) {
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
          stroke-width: 6px !important;
          stroke: #035def !important;
          filter: none;
        }

        :deep(.vue-flow__node.selected) {
          box-shadow: none !important;
        }

        @keyframes active-node-pulse {
          0% {
            filter: drop-shadow(0 0 2px rgba(255, 209, 102, 0.25));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(255, 209, 102, 0.95));
          }
          100% {
            filter: drop-shadow(0 0 2px rgba(255, 209, 102, 0.25));
          }
        }
        :deep(.active-node) {
          animation: active-node-pulse 1.2s ease-in-out infinite;
        }

        .rf-node-with-vars {
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 8px;
        }
        .node-vars-bubble__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          + .node-vars-bubble__row {
            margin-top: 6px;
          }
        }
        .node-vars-bubble__left {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
          .var-item {
            font-size: 12px;
            color: #cfe2ff;
            opacity: 0.9;
            word-break: break-word;
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: normal;
          }
        }
        .node-vars-bubble__right {
          font-size: 12px;
          color: #fff;
          opacity: 0.95;
        }
      }
    }

    .rule-chain-editor__floating-actions {
      position: absolute;
      bottom: 48px;
      left: 50%;
      z-index: 10;
      display: flex;
      gap: 16px;
      transform: translateX(-50%);
      pointer-events: none;

      .floating-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 96px;
        height: 36px !important;
        gap: 6px;
        padding: 0 16px !important;
        border-radius: 4px !important;
        pointer-events: auto;
      }

      .floating-btn span {
        font-size: 14px;
      }
    }

    // .rule-chain-editor__floating-actions {
    //   position: fixed;
    //   right: 100px;
    //   bottom: 24px;
    //   display: flex;
    //   gap: 16px;
    //   z-index: 10;
    //   .floating-btn {
    //     width: 48px !important;
    //     height: 48px !important;
    //     font-size: 18px !important;
    //     border-radius: 50% !important;
    //     display: flex;
    //     align-items: center;
    //     justify-content: center;
    //     box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);

    //     // .floating-btn--submit.is-dirty:not(:disabled) {
    //     //   box-shadow: 0 0 0 3px rgba(255, 138, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35);
    //     // }
    //   }
    // }
  }
  :deep(.custom-button .rule-chain-editor__toolbar-icon) {
    margin-right: 8px;
  }
}
</style>
