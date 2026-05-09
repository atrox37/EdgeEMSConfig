<template>
  <div class="voltage-class modeling-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- 顶部工具栏 -->
    <div class="modeling-editor__topbar">
      <el-button size="small" text @click="goBack">
        <AppIcon name="i-tabler-arrow-left" style="margin-right:4px" />
        返回
      </el-button>
      <div class="modeling-editor__topbar-title">
        <AppIcon name="i-tabler-topology-star" style="margin-right:6px;opacity:0.7" />
        {{ modelTitle }}
      </div>

      <div class="modeling-editor__topbar-actions">
        <!-- 撤销/重做 -->
        <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
          <el-button size="small" :disabled="!canUndo" @click="undo">
            <AppIcon name="i-tabler-arrow-back-up" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
          <el-button size="small" :disabled="!canRedo" @click="redo">
            <AppIcon name="i-tabler-arrow-forward-up" />
          </el-button>
        </el-tooltip>

        <div class="modeling-editor__sep" />

        <el-button size="small" @click="handleAutoLayout">
          <AppIcon name="i-tabler-layout-distribute-vertical" style="margin-right:4px" />
          自动布局
        </el-button>

        <!-- 导出下拉 -->
        <el-dropdown trigger="click" @command="handleExportCommand">
          <el-button size="small">
            <AppIcon name="i-tabler-download" style="margin-right:4px" />
            导出
            <AppIcon name="i-tabler-chevron-down" style="margin-left:2px;width:11px;height:11px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="json">
                <AppIcon name="i-tabler-file-type-js" style="margin-right:6px" />
                导出 JSON
              </el-dropdown-item>
              <el-dropdown-item command="png">
                <AppIcon name="i-tabler-photo" style="margin-right:6px" />
                导出 PNG 图片
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button size="small" @click="handleImportClick">
          <AppIcon name="i-tabler-upload" style="margin-right:4px" />
          导入
        </el-button>
        <el-button size="small" @click="toggleFullscreen">
          <AppIcon
            :name="isFullscreen ? 'i-tabler-arrows-minimize' : 'i-tabler-arrows-maximize'"
            style="margin-right:4px"
          />
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!hasUnsavedChanges"
          @click="handleSave"
        >
          <AppIcon name="i-tabler-device-floppy" style="margin-right:4px" />
          保存
        </el-button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="modeling-editor__body">
      <!-- 左侧节点面板 -->
      <LeftPanel />

      <!-- 画布 -->
      <div ref="canvasRef" class="modeling-editor__canvas">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          fit-view-on-init
          :node-types="nodeTypes"
          :default-edge-options="defaultEdgeOptions"
          :connection-mode="ConnectionMode.Loose"
          :connection-line-style="{ stroke: '#ff8a00', strokeWidth: 2.5 }"
          :min-zoom="0.1"
          :max-zoom="4"
          :snap-to-grid="true"
          :snap-grid="[10, 10]"
          :nodes-draggable="true"
          :nodes-connectable="true"
          :elements-selectable="true"
          class="modeling-editor__flow"
          @drop.prevent="handleDrop"
          @dragover.prevent="onDragOver"
          @dragleave="onDragLeave"
          @connect="handleConnect"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @pane-click="handlePaneClick"
          @edge-double-click="handleEdgeDoubleClick"
        >
          <Background variant="lines" :gap="20" color="rgba(180,180,180,0.35)" />
          <MiniMap
            class="rf-minimap-custom"
            :node-stroke-color="'#74b9ff'"
            :node-color="'#dde8f8'"
            :node-border-radius="3"
            position="top-right"
          />
          <Controls position="bottom-right" />
        </VueFlow>

        <!-- 选中边的浮动工具栏 -->
        <Transition name="edge-toolbar">
          <div v-if="selectedEdgeId" class="modeling-editor__edge-toolbar">
            <span class="edge-toolbar__label">连线类型：</span>
            <button
              v-for="t in EDGE_VARIANTS"
              :key="t.value"
              class="edge-toolbar__btn"
              :class="{ active: currentEdgeVariant === t.value }"
              :style="{ '--ec': t.color }"
              :title="t.label"
              @click="setEdgeVariant(t.value)"
            >
              <AppIcon :name="t.icon" />
              <span>{{ t.label }}</span>
            </button>
            <div class="edge-toolbar__sep" />
            <button class="edge-toolbar__btn edge-toolbar__btn--label" :title="'编辑标签'" @click="openEdgeLabelEdit">
              <AppIcon name="i-tabler-tag" />
              <span>标签</span>
            </button>
            <button class="edge-toolbar__btn edge-toolbar__btn--del" title="删除连线" @click="deleteSelectedEdge">
              <AppIcon name="i-tabler-trash" />
              <span>删除</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- 右侧属性面板 -->
      <RightPanel
        :selected-node="selectedNode"
        @update-node="handleUpdateNode"
        @delete-node="handleDeleteNode"
      />
    </div>

    <!-- 边标签编辑对话框 -->
    <el-dialog
      v-model="edgeLabelDialogVisible"
      title="编辑连线标签"
      width="340px"
      destroy-on-close
    >
      <el-input v-model="editingEdgeLabel" placeholder="连线标签（如：分类、包含、关联）" clearable />
      <template #footer>
        <el-button @click="edgeLabelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdgeLabel">确定</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  VueFlow,
  ConnectionMode,
  useVueFlow,
  type Connection,
  type Node as FlowNode,
  type Edge as FlowEdge,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/node-resizer/dist/style.css'
import { toPng } from 'html-to-image'

import AppIcon from '@/components/AppIcon.vue'
import LeftPanel from './components/LeftPanel.vue'
import RightPanel from './components/RightPanel.vue'
import StationNode from './components/customNodes/StationNode.vue'
import ProductNode from './components/customNodes/ProductNode.vue'
import GroupNode from './components/customNodes/GroupNode.vue'

import { useVisualModelingStore } from '@/stores/visualModeling'
import useModelDnd from './useModelDnd'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import type { ModelFlowNode } from '@/types/visualModeling'

const route = useRoute()
const router = useRouter()
const store = useVisualModelingStore()

const { onDragOver, onDragLeave, onDrop: dndOnDrop } = useModelDnd()
const {
  addEdges,
  setNodes,
  setEdges,
  toObject,
  removeNodes,
  removeEdges,
  fitView,
  getNodes,
} = useVueFlow()

// ---- 节点类型注册 ----
const nodeTypes: any = {
  station: StationNode,
  product: ProductNode,
  group: GroupNode,
}

// ---- 连线类型定义 ----
type EdgeVariantKey = 'hierarchy' | 'association' | 'dataflow' | 'classification'

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
    label: '层级',
    icon: 'i-tabler-git-branch',
    color: '#6F3381',
    animated: false,
    bidirectional: false,
  },
  {
    value: 'association',
    label: '关联',
    icon: 'i-tabler-arrows-exchange',
    color: '#4a90d9',
    strokeDasharray: '6 4',
    animated: false,
    bidirectional: true,
  },
  {
    value: 'dataflow',
    label: '数据流',
    icon: 'i-tabler-wave-sine',
    color: '#43a047',
    strokeDasharray: '8 4',
    animated: true,
    bidirectional: false,
  },
  {
    value: 'classification',
    label: '分类',
    icon: 'i-tabler-sitemap',
    color: '#ef6c00',
    strokeDasharray: '4 4',
    animated: false,
    bidirectional: false,
  },
]

function buildEdgeStyle(variant: EdgeVariantKey): Partial<FlowEdge> {
  const def = EDGE_VARIANTS.find((v) => v.value === variant) ?? EDGE_VARIANTS[0]
  return {
    type: 'smoothstep',
    animated: def.animated,
    style: {
      stroke: def.color,
      strokeWidth: 2.5,
      ...(def.strokeDasharray ? { strokeDasharray: def.strokeDasharray } : {}),
    },
    markerEnd: { type: 'arrowclosed', color: def.color },
    ...(def.bidirectional ? { markerStart: { type: 'arrowclosed', color: def.color } } : {}),
    data: { edgeVariant: variant },
  }
}

// ---- 基础状态 ----
const nodes = ref<FlowNode[]>([])
const edges = ref<FlowEdge[]>([])
const isFullscreen = ref(false)
const hasUnsavedChanges = ref(false)
const selectedNode = ref<ModelFlowNode | null>(null)
const selectedEdgeId = ref<string | null>(null)
const edgeLabelDialogVisible = ref(false)
const editingEdgeLabel = ref('')
const canvasRef = ref<HTMLElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)

const modelId = computed(() => route.params.id as string)
const modelTitle = computed(() => store.getModelById(modelId.value)?.name ?? '可视化建模')

const currentEdgeVariant = computed<EdgeVariantKey>(() => {
  if (!selectedEdgeId.value) return 'hierarchy'
  const edge = edges.value.find((e) => e.id === selectedEdgeId.value)
  return (edge?.data?.edgeVariant as EdgeVariantKey) ?? 'hierarchy'
})

// ---- 默认边样式 ----
const defaultEdgeOptions = computed(() => buildEdgeStyle('hierarchy'))

// ---- 撤销/重做 ----
type Snapshot = { nodes: any[]; edges: any[] }
const MAX_HISTORY = 50
const snapshots = ref<Snapshot[]>([])
const snapIdx = ref(-1)
let isRestoringHistory = false

const canUndo = computed(() => snapIdx.value > 0)
const canRedo = computed(() => snapIdx.value < snapshots.value.length - 1)

function saveSnapshot() {
  if (isRestoringHistory) return
  const s: Snapshot = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value)),
  }
  snapshots.value = snapshots.value.slice(0, snapIdx.value + 1)
  snapshots.value.push(s)
  if (snapshots.value.length > MAX_HISTORY) snapshots.value.shift()
  else snapIdx.value++
}

function undo() {
  if (!canUndo.value) return
  snapIdx.value--
  const s = snapshots.value[snapIdx.value]
  isRestoringHistory = true
  setNodes(JSON.parse(JSON.stringify(s.nodes)))
  setEdges(JSON.parse(JSON.stringify(s.edges)))
  selectedNode.value = null
  selectedEdgeId.value = null
  hasUnsavedChanges.value = true
  nextTick(() => { isRestoringHistory = false })
}

function redo() {
  if (!canRedo.value) return
  snapIdx.value++
  const s = snapshots.value[snapIdx.value]
  isRestoringHistory = true
  setNodes(JSON.parse(JSON.stringify(s.nodes)))
  setEdges(JSON.parse(JSON.stringify(s.edges)))
  selectedNode.value = null
  selectedEdgeId.value = null
  hasUnsavedChanges.value = true
  nextTick(() => { isRestoringHistory = false })
}

// ---- 键盘快捷键 ----
function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
  if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
  if (e.key === 's') { e.preventDefault(); handleSave() }
}

// ---- 拖放 ----
function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dndOnDrop(e)
  hasUnsavedChanges.value = true
  nextTick(() => saveSnapshot())
}

// ---- 连线 ----
function handleConnect(connection: Connection) {
  const base = buildEdgeStyle('hierarchy')
  const newEdge: FlowEdge = {
    id: `edge-${Date.now()}`,
    source: connection.source!,
    target: connection.target!,
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined,
    ...base,
    labelStyle: { fontSize: '11px', fontWeight: 600, fill: '#4a5568' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
    labelBgPadding: [4, 6],
    labelBgBorderRadius: 4,
  } as FlowEdge
  addEdges(newEdge)
  hasUnsavedChanges.value = true
  nextTick(() => saveSnapshot())
}

// ---- 节点点击 ----
function handleNodeClick(event: any) {
  selectedEdgeId.value = null
  const node = event.node ?? event
  if (node?.data) {
    selectedNode.value = {
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      parentNode: node.parentNode,
      extent: node.extent,
      style: node.style,
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
  const edge = edges.value.find((e) => e.id === selectedEdgeId.value)
  if (edge) edge.label = editingEdgeLabel.value || undefined
  edgeLabelDialogVisible.value = false
  hasUnsavedChanges.value = true
  saveSnapshot()
}

// ---- 设置边类型 ----
function setEdgeVariant(variant: EdgeVariantKey) {
  if (!selectedEdgeId.value) return
  const idx = edges.value.findIndex((e) => e.id === selectedEdgeId.value)
  if (idx === -1) return
  const base = buildEdgeStyle(variant)
  edges.value[idx] = {
    ...edges.value[idx],
    ...base,
    id: edges.value[idx].id,
    source: edges.value[idx].source,
    target: edges.value[idx].target,
    label: edges.value[idx].label,
  } as FlowEdge
  hasUnsavedChanges.value = true
  saveSnapshot()
}

// ---- 删除选中边 ----
function deleteSelectedEdge() {
  if (!selectedEdgeId.value) return
  removeEdges([selectedEdgeId.value])
  selectedEdgeId.value = null
  hasUnsavedChanges.value = true
  nextTick(() => saveSnapshot())
}

// ---- 右侧面板：更新节点 ----
function handleUpdateNode(updated: ModelFlowNode) {
  const idx = nodes.value.findIndex((n) => n.id === updated.id)
  if (idx === -1) return
  nodes.value[idx] = {
    ...nodes.value[idx],
    data: updated.data,
    style: updated.style ?? nodes.value[idx].style,
  }
  selectedNode.value = updated
  hasUnsavedChanges.value = true
  saveSnapshot()
}

// ---- 右侧面板：删除节点 ----
function handleDeleteNode(id: string) {
  ElMessageBox.confirm('确认删除该节点？相关连线也会被删除。', '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      removeNodes([id])
      selectedNode.value = null
      hasUnsavedChanges.value = true
      nextTick(() => saveSnapshot())
    })
    .catch(() => {})
}

// ---- 自动布局 ----
async function handleAutoLayout() {
  try {
    const dagre = await import('@dagrejs/dagre')
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 60, marginx: 40, marginy: 40 })

    const currentNodes = toObject().nodes as FlowNode[]
    const currentEdges = toObject().edges as FlowEdge[]
    const topNodes = currentNodes.filter((n) => !n.parentNode)

    topNodes.forEach((n) => {
      g.setNode(n.id, {
        width:  (n.style?.width  as number) || n.dimensions?.width  || 160,
        height: (n.style?.height as number) || n.dimensions?.height || 70,
      })
    })
    currentEdges.forEach((e) => {
      if (topNodes.find((n) => n.id === e.source) && topNodes.find((n) => n.id === e.target)) {
        g.setEdge(e.source, e.target)
      }
    })

    dagre.layout(g)

    const newNodes = currentNodes.map((n) => {
      if (n.parentNode) return n
      const pos = g.node(n.id)
      if (!pos) return n
      const w = (n.style?.width  as number) || n.dimensions?.width  || 160
      const h = (n.style?.height as number) || n.dimensions?.height || 70
      return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } }
    })

    setNodes(newNodes)
    setEdges(currentEdges)
    hasUnsavedChanges.value = true
    saveSnapshot()
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100)
    ElMessage.success('自动布局完成')
  } catch (err) {
    console.error(err)
    ElMessage.error('自动布局失败')
  }
}

// ---- 全屏 ----
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 100)
}

// ---- 捕获画布截图 ----
async function captureCanvas(width = 640, height = 400): Promise<string | undefined> {
  const flowEl = canvasRef.value?.querySelector('.vue-flow') as HTMLElement | null
  if (!flowEl) return undefined
  try {
    return await toPng(flowEl, {
      width,
      height,
      style: { borderRadius: '0' },
      filter: (el) => {
        // 排除控制器和小地图，截图更干净
        if (el instanceof Element) {
          const cls = el.className || ''
          if (typeof cls === 'string' && (cls.includes('vue-flow__controls') || cls.includes('vue-flow__minimap'))) {
            return false
          }
        }
        return true
      },
    })
  } catch {
    return undefined
  }
}

// ---- 保存（含缩略图） ----
async function handleSave() {
  const flowObj = toObject()
  const thumbnail = await captureCanvas(480, 300)
  store.saveFlowJson(
    modelId.value,
    { nodes: flowObj.nodes as any, edges: flowObj.edges as any },
    thumbnail,
  )
  hasUnsavedChanges.value = false
  ElMessage.success('保存成功')
}

// ---- 导出命令 ----
async function handleExportCommand(cmd: string) {
  if (cmd === 'json') await handleExportJson()
  if (cmd === 'png')  await handleExportPng()
}

async function handleExportJson() {
  const model = store.getModelById(modelId.value)
  if (!model) return
  const flowObj = toObject()
  const exportData = { ...model, flowJson: { nodes: flowObj.nodes, edges: flowObj.edges } }
  const bytes = new TextEncoder().encode(JSON.stringify(exportData, null, 2))
  await saveBytesWithPreferredPath(bytes, `${model.name}.json`, 'application/json')
  ElMessage.success('JSON 导出成功')
}

async function handleExportPng() {
  const model = store.getModelById(modelId.value)
  if (!model) return
  ElMessage.info('正在生成图片...')
  const dataUrl = await captureCanvas(1920, 1080)
  if (!dataUrl) {
    ElMessage.error('图片生成失败')
    return
  }
  // dataUrl → Uint8Array
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  await saveBytesWithPreferredPath(bytes, `${model.name}.png`, 'image/png')
  ElMessage.success('PNG 导出成功')
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
      const nextNodes = Array.isArray(flow.nodes) ? flow.nodes : []
      const nextEdges = Array.isArray(flow.edges) ? flow.edges : []
      if (!nextNodes.length && !nextEdges.length) {
        ElMessage.error('导入失败：未找到节点数据')
        return
      }
      setNodes(nextNodes)
      setEdges(nextEdges)
      hasUnsavedChanges.value = true
      nextTick(() => saveSnapshot())
      ElMessage.success('导入成功')
    } catch {
      ElMessage.error('导入失败：JSON 格式错误')
    } finally {
      ;(e.target as HTMLInputElement).value = ''
    }
  }
  reader.readAsText(file)
}

// ---- 返回列表 ----
async function goBack() {
  if (hasUnsavedChanges.value) {
    try {
      await ElMessageBox.confirm('有未保存的更改，是否放弃并返回？', '提示', {
        confirmButtonText: '放弃更改',
        cancelButtonText: '继续编辑',
        type: 'warning',
      })
    } catch {
      return
    }
  }
  router.push({ name: 'visualModeling' })
}

// ---- 窗口 resize ----
let resizeTimer: number | null = null
function onWindowResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => fitView({ padding: 0.1, duration: 200 }), 150)
}

onMounted(() => {
  const model = store.getModelById(modelId.value)
  if (model) {
    const { nodes: savedNodes, edges: savedEdges } = model.flowJson
    if (savedNodes.length || savedEdges.length) {
      setNodes(savedNodes as unknown as FlowNode[])
      setEdges(savedEdges as unknown as FlowEdge[])
    }
    store.setCurrentModel(modelId.value)
  }
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
  setTimeout(() => {
    fitView({ padding: 0.15, duration: 300 })
    saveSnapshot()
  }, 200)
  hasUnsavedChanges.value = false
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  store.setCurrentModel(null)
})
</script>

<style lang="scss" scoped>
.voltage-class {
  .modeling-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
    box-sizing: border-box;

    &.is-fullscreen {
      position: fixed;
      top: 32px;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      background: #ffffff;
    }

    // ---- 顶部工具栏 ----
    &__topbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-bottom: 1px solid rgba(15, 31, 61, 0.08);
      background: rgba(255, 255, 255, 0.96);
      flex-shrink: 0;

      &-title {
        flex: 1;
        display: flex;
        align-items: center;
        font-size: 14px;
        font-weight: 700;
        color: #0f1f3d;
        :deep(svg) { width: 16px; height: 16px; color: #4a90d9 !important; }
      }

      &-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }
    }

    &__sep {
      width: 1px;
      height: 18px;
      background: rgba(15, 31, 61, 0.12);
      margin: 0 2px;
    }

    // ---- 主体 ----
    &__body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    // ---- 画布 ----
    &__canvas {
      flex: 1;
      height: 100%;
      position: relative;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    &__flow { width: 100%; height: 100%; }

    // ---- 边工具栏 ----
    &__edge-toolbar {
      position: absolute;
      bottom: 52px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 20, 40, 0.92);
      backdrop-filter: blur(8px);
      border-radius: 10px;
      padding: 6px 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 50;
      pointer-events: all;
    }

    // VueFlow 样式覆盖
    :deep(.vue-flow__edge) {
      backface-visibility: hidden;
      transform: translateZ(0);
    }

    :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
      stroke-width: 4.5 !important;
      stroke: #ff5722 !important;
      filter: drop-shadow(0 0 8px rgba(255, 87, 34, 0.9));
    }

    :deep(.vue-flow__node.selected) {
      box-shadow:
        0 0 16px rgba(255, 87, 34, 0.7),
        0 0 24px rgba(255, 87, 34, 0.5),
        2px 2px 8px rgba(0, 0, 0, 0.15) !important;
    }

    :deep(.vue-flow__edge-label) { font-size: 11px !important; }

    :deep(.rf-minimap-custom) {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(15,31,61,0.1);
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  }
}

// ---- 边工具栏按钮 ----
.edge-toolbar {
  &__label {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-right: 2px;
    white-space: nowrap;
  }

  &__sep {
    width: 1px;
    height: 20px;
    background: rgba(255,255,255,0.15);
    margin: 0 4px;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 4px 8px;
    color: rgba(255,255,255,0.7);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    :deep(svg) { width: 13px; height: 13px; color: inherit !important; }

    &:hover {
      background: rgba(255,255,255,0.12);
      color: #ffffff;
    }

    &.active {
      background: var(--ec, #6F3381);
      border-color: var(--ec, #6F3381);
      color: #ffffff;
    }

    &--del {
      &:hover { background: rgba(229,57,53,0.25); color: #ef9a9a; border-color: rgba(229,57,53,0.4); }
    }

    &--label {
      &:hover { background: rgba(255,255,255,0.12); }
    }
  }
}

// 边工具栏出现动画
.edge-toolbar-enter-active, .edge-toolbar-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.edge-toolbar-enter-from, .edge-toolbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
</style>
