<template>
  <div class="voltage-class rule-chain-editor" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="rule-chain-editor__header">
      <el-button :type="isFullscreen ? 'warning' : 'primary'" @click="toggleFullscreen">
        <el-icon>
          <FullScreen />
        </el-icon>
        {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
      </el-button>
      <el-button type="success" :disabled="!hasUnsavedChanges" @click="handleSave">
        <el-icon>
          <Check />
        </el-icon>
        Submit
      </el-button>
      <el-button type="warning" :disabled="!hasUnsavedChanges" @click="handleCancel">
        <el-icon>
          <Close />
        </el-icon>
        Cancel
      </el-button>
      <el-button type="success" @click="handleExport">
        <el-icon>
          <Download />
        </el-icon>
        Export
      </el-button>
    </div>

    <div class="rule-chain-editor__content">
      <!-- 左侧规则卡片选择区域 -->
      <div class="rule-chain-editor__left-panel" :class="{ 'is-collapsed': isLeftPanelCollapsed }">
        <!-- 规则链选择器 -->
        <div class="rule-chain-editor__chain-selector">
          <el-select
            v-model="currentChainId"
            placeholder="Select Rule Chain"
            style="width: 100%"
            @change="handleChainChange"
          >
            <el-option
              v-for="chain in ruleChains"
              :key="chain.id"
              :label="chain.name"
              :value="chain.id"
            />
          </el-select>
        </div>
        <!-- 规则卡片分类 -->
        <div class="rule-chain-editor__card-categories">
          <el-collapse v-model="activeCategories">
            <el-collapse-item
              v-for="category in cardCategories"
              :key="category.type"
              :name="category.type"
              :title="category.title"
              style="margin-bottom: 20px"
            >
              <template #title>
                <div class="rule-chain-editor__category-title">
                  <span>{{ category.title }}</span>
                  <!-- <el-tooltip :content="category.tooltip" placement="right">
                    <el-icon class="rule-chain-editor__tooltip-icon">
                      <QuestionFilled />
                    </el-icon>
                  </el-tooltip> -->
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
                    <el-icon v-if="card.type === 'function-switch'">
                      <Switch />
                    </el-icon>
                    <el-icon v-else-if="card.type === 'action-changeValue'">
                      <Pointer />
                    </el-icon>
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

      <!-- 中间VueFlow连接图区域 -->
      <div class="rule-chain-editor__center-panel" @drop="onDrop">
        <!-- 收放按钮 -->
        <div class="rule-chain-editor__collapse-btn" @click="toggleLeftPanel">
          <el-icon>
            <ArrowRight v-if="isLeftPanelCollapsed" />
            <ArrowLeft v-else />
          </el-icon>
        </div>
        <!-- :edge-types="edgeTypes" :default-edge-options="defaultEdgeOptions" -->
        <VueFlow
          fit-view-on-init
          :connection-mode="ConnectionMode.Strict"
          :only-render-visible-elements="true"
          :nodes="nodes"
          :edges="edges"
          class="rule-chain-editor__flow"
          :default-viewport="{ zoom: 1, x: 0, y: 0 }"
          :min-zoom="0.1"
          :max-zoom="4"
          :snap-to-grid="true"
          :snap-grid="[1, 1]"
          :node-types="nodeTypes"
          :connection-line-style="{ stroke: '#6F3381', strokeWidth: 2.5 }"
          @connect="handleConnect"
          @node-double-click="handleNodeClick"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <!-- 自定义节点模板 -->

          <template #node-custom="nodeProps">
            <CustomNode v-bind="nodeProps" />
          </template>
          <template #node-start="nodeProps">
            <StartNode v-bind="nodeProps" />
          </template>
          <template #node-end="nodeProps">
            <EndNode v-bind="nodeProps" />
          </template>
          <!-- <template #edge-customLine="edgeProps">
            <CustomLine v-bind="edgeProps" @edge-click="handleEdgeClick" />
          </template>
          <template #connection-line="{ sourceX, sourceY, targetX, targetY }">
            <CustomLine :source-x="sourceX" :source-y="sourceY" :target-x="targetX" :target-y="targetY" />
          </template> -->
          <!-- 背景网格 -->
          <Background variant="lines" :gap="20" color="rgba(255, 255, 255, 0.1)" />

          <!-- 小地图 -->
          <MiniMap
            :node-stroke-color="'#74b9ff'"
            :node-color="'#ddd'"
            :node-border-radius="2"
            position="top-right"
          />

          <!-- 控制按钮 -->
          <Controls position="bottom-right" />
        </VueFlow>
      </div>
    </div>

    <!-- 保留原有的对话框组件以备将来使用 -->
    <CardEditDialog
      v-model:visible="cardEditDialogVisible"
      :card="editingCard"
      @save="handleCardEditConfirm"
    />

    <EdgeEditDialog
      v-model:visible="edgeEditDialogVisible"
      :edge="editingEdge"
      :rule-label-options="ruleLabelOptionsEdge"
      @save="handleEdgeEditConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// import CustomLine from '../components/CustomLine.vue'
// import CardEditDialog from '../components/CardEditDialog.vue'
// import EdgeEditDialog from '../components/EdgeEditDialog.vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
// import '@vue-flow/controls/dist/style.css'
import {
  FullScreen,
  Check,
  Close,
  QuestionFilled,
  Download,
  ArrowRight,
  ArrowLeft,
  Switch,
  Pointer,
} from '@element-plus/icons-vue'
import {
  VueFlow,
  ConnectionMode,
  useVueFlow,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type Connection,
  type NodeChange,
} from '@vue-flow/core'
import CustomNode from './components/CustomNode.vue'
import StartNode from './components/StartNode.vue'
import EndNode from './components/EndNode.vue'
// import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
// import { Controls } from '@vue-flow/controls'
import { useRuleChainStore } from '@/stores/ruleChain.ts'
import type { RuleCard, RuleChain, Node as AppNode, Edge as AppEdge } from '@/types/index.ts'
import useDragAndDrop from '@/utils/useDnd'
import CardEditDialog from './components/CardEditDialog.vue'
import EdgeEditDialog from './components/EdgeEditDialog.vue'
// VueFlow
const {
  updateNode,
  updateEdge,
  toObject,
  addEdges,
  onNodesChange,
  findEdge,
  onEdgesChange,
  onConnect,
  onEdgeUpdate,
  onNodeDragStop,
  setNodes,
  setEdges,
  applyNodeChanges,
  applyEdgeChanges,
  removeEdges,
} = useVueFlow()
const { onDragStart, onDragOver, onDragLeave, onDrop } = useDragAndDrop()
// 路由
const route = useRoute()

// Store
const ruleChainStore = useRuleChainStore()

// 响应式数据
// const edgeTypes = { customLine: markRaw(CustomLine) }
// const defaultEdgeOptions = {
//   type: 'customLine',
//   data: {
//     color: '#6F3381',
//     strokeWidth: 2.5,
//     dash: '6 6',
//     animated: true,
//     curved: true
//   }
// }
const currentChainId = ref('')
const isLeftPanelCollapsed = ref(false)
const activeCategories = ref(['function', 'action'])
const cardEditDialogVisible = ref(false)
const edgeEditDialogVisible = ref(false)
const editingCard = ref<RuleCard | null>(null)
const editingEdge = ref<FlowEdge | null>(null)
const ruleLabelOptionsEdge = ref<string[]>([])

// 节点类型定义
const nodeTypes: any = {
  custom: CustomNode,
  start: StartNode,
  end: EndNode,
}
// 计算属性
const ruleChains = computed(() => ruleChainStore.ruleChains)
const nodes = computed(() => ruleChainStore.nodes)
const edges = computed(() => ruleChainStore.edges)
const isFullscreen = computed(() => ruleChainStore.isFullscreen)
const hasUnsavedChanges = computed(() => ruleChainStore.hasUnsavedChanges)

// 规则卡片分类
const cardCategories = ref([
  {
    type: 'function',
    title: 'Funtcion',
    icon: 'Filter',
    cards: [
      // {
      //   id: 'function-1',
      //   name: 'Data Filter',
      //   type: 'filter' as const,
      //   description: 'Filter data based on conditions',
      //   icon: 'Filter',
      //   config: { condition: '', operator: 'equals' },
      // },
      {
        id: 'function-2',
        name: 'Switch Function',
        type: 'function-switch',
        description: 'Switch function',
        icon: Switch,
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
        description: 'change value of a point',
        icon: Pointer,
        config: { rule: [], wires: {} },
      },
    ],
  },
  // {
  //   type: 'external',
  //   title: 'External',
  //   icon: 'Connection',
  //   tooltip: 'External cards are used to connect with external services',
  //   cards: [
  //     {
  //       id: 'external-1',
  //       name: 'API Call',
  //       type: 'external' as const,
  //       description: 'Make API call to external service',
  //       icon: 'Connection',
  //       config: { url: '', method: 'GET', headers: '' },
  //     },
  //   ],
  // },
  // {
  //   type: 'flow',
  //   title: 'Flow',
  //   icon: 'DataLine',
  //   tooltip: 'Flow cards are used to control data flow',
  //   cards: [
  //     {
  //       id: 'flow-1',
  //       name: 'Conditional Flow',
  //       type: 'flow' as const,
  //       description: 'Control flow based on conditions',
  //       icon: 'DataLine',
  //       config: { condition: '', truePath: '', falsePath: '' },
  //     },
  //   ],
  // },
])
//第一次加载时，不触发保存
let isInitNodes = true
// 方法
onNodesChange((changes: NodeChange[]) => {
  if (isInitNodes) {
    isInitNodes = false
  } else {
    ruleChainStore.hasUnsavedChanges = true
  }
})

onConnect(() => {
  ruleChainStore.hasUnsavedChanges = true
})
onEdgeUpdate(() => {
  ruleChainStore.hasUnsavedChanges = true
})
onNodeDragStop(() => {
  ruleChainStore.hasUnsavedChanges = true
})
onEdgesChange((changes: any[]) => {
  // 在应用变更前处理删除，便于拿到完整的 edge 信息
  const currentEdges = (toObject().edges as any[]) || []
  for (const change of changes || []) {
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
const toggleLeftPanel = () => {
  ruleChainStore.toggleLeftPanel()
  isLeftPanelCollapsed.value = ruleChainStore.isLeftPanelCollapsed
}

const clearSelection = () => {
  editingCard.value = null
  editingEdge.value = null
}

const toggleFullscreen = () => {
  ruleChainStore.toggleFullscreen()
}

const handleChainChange = (chainId: string) => {
  const chain = ruleChains.value.find((c: RuleChain) => c.id === chainId)
  if (chain) {
    if (hasUnsavedChanges.value) {
      showUnsavedDialog()
    } else {
      ruleChainStore.setCurrentRuleChain(chain)
    }
  }
}

const showUnsavedDialog = async () => {
  try {
    await ElMessageBox.confirm(
      'You have unsaved changes. Do you want to save them?',
      'Unsaved Changes',
      {
        confirmButtonText: 'Submit',
        cancelButtonText: 'Discard',
        type: 'warning',
      },
    )
    const obj = toObject()
    ruleChainStore.saveChanges(obj.nodes as unknown as AppNode[], obj.edges as unknown as AppEdge[])
  } catch (error) {
    ruleChainStore.discardChanges()
  }
}

const handleNodeClick = (event: any) => {
  const node = event.node || event
  if (node.id === 'start' || node.id === 'end') return
  if (node && node.data) {
    editingCard.value = { ...node.data }
    editingEdge.value = null
    cardEditDialogVisible.value = true
  } else {
    console.log('No card data found in node')
  }
}

const handleCardEditConfirm = (newCard: any) => {
  if (!newCard?.id) return

  // 使用传回的新数据更新节点
  updateNode(newCard.id, {
    data: {
      ...newCard,
    },
  })
  // 更新后清理指向该节点的无效连线：
  // 若某条入边其 source 的 wires 不包含该边的 sourceHandle，则移除该边
  pruneInvalidIncomingEdges(newCard.id)
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
    // label: '',
    // type: 'default',
    // data: {
    //   color: '#6F3381',
    //   strokeWidth: 2.5,
    //   dash: '6 6',
    //   animated: true,
    //   curved: true
    // }
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
  // 更新起点节点的 wires 映射
}

const handleEdgeClick = (event: any) => {
  console.log('Edge click event triggered!', { event })

  if (!event.edge) {
    console.log('No edge data found in event')
    return
  }

  const sourceId = event.edge.source
  const allNodes = toObject().nodes as any[]
  const sourceNode = allNodes.find((n) => n.id === sourceId)
  console.log('Source node of clicked edge:', sourceNode)

  // 设置 EdgeEditDialog 的规则选项（仅起点为 function-switch 时有值）
  if (sourceNode && sourceNode.data && sourceNode.data.type === 'function-switch') {
    const rules = sourceNode.data?.config?.rule
    ruleLabelOptionsEdge.value = Array.isArray(rules)
      ? rules.map((r: any) => r?.name).filter(Boolean)
      : []
  } else {
    ruleLabelOptionsEdge.value = []
  }

  // 打开 EdgeEditDialog
  editingEdge.value = { ...event.edge }
  editingCard.value = null
  edgeEditDialogVisible.value = true
}

const handleEdgeEditConfirm = (newedge: FlowEdge) => {
  if (!editingEdge.value) return

  console.log(editingEdge.value, '///////////')
  const edge = findEdge(editingEdge.value.id)
  // // 使用正确的参数格式调用 updateEdge
  // updateEdge(editingEdge.value.id, {
  //   label: editingEdge.value.label,
  // })
  if (edge) {
    edge.label = newedge.label
  }
  console.log(toObject().edges, '///////////')
  ElMessage.success('Connection updated successfully')
  edgeEditDialogVisible.value = false
}

const handleSave = () => {
  const newNodes = toObject().nodes as unknown as AppNode[]
  const newEdges = toObject().edges as unknown as AppEdge[]

  ruleChainStore.saveChanges(newNodes, newEdges)
  ElMessage.success('Changes saved successfully')
}

const handleCancel = () => {
  ruleChainStore.discardChanges()
  setNodes(nodes.value as unknown as FlowNode[])
  setEdges(edges.value as unknown as FlowEdge[])
  ElMessage.success('Changes discarded')
}

const handleExport = () => {
  const ruleChainData = ruleChainStore.exportRuleChain()
  const dataStr = JSON.stringify(ruleChainData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${ruleChainData.name}.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('Rule chain exported successfully')
}

// 生命周期
onMounted(() => {
  // 初始化默认的START和END节点
  // const startNode: Node = {
  //   id: 'start',
  //   type: 'start',
  //   position: { x: 100, y: 100 },
  //   data: { label: 'START' }
  // }
  // const endNode: Node = {
  //   id: 'end',
  //   type: 'end',
  //   position: { x: 500, y: 100 },
  //   data: { label: 'END' }
  // }
  // ruleChainStore.addNodes([startNode, endNode])

  // 设置当前规则链
  const chainId = route.params.id as string
  if (chainId) {
    const chain = ruleChains.value.find((c: RuleChain) => c.id === chainId)
    if (chain) {
      ruleChainStore.setCurrentRuleChain(chain)
      currentChainId.value = chainId
    }
  }
})
onUnmounted(() => {
  ruleChainStore.hasUnsavedChanges = false
})
// 监听store状态变化
watch(
  () => ruleChainStore.isLeftPanelCollapsed,
  (newVal: boolean) => {
    isLeftPanelCollapsed.value = newVal
  },
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

    &.is-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      height: 100vh;
      width: 100vw;
      background-color: white;
    }

    .rule-chain-editor__header {
      height: 60px;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      // background: linear-gradient(135deg, #f0f8ff 0%, #e8f4fd 100%);
      background-color: #132c54;
      border-bottom: 1px solid #435678;
      // box-shadow: var(--shadow-light);
    }

    .rule-chain-editor__content {
      display: flex;
      height: calc(100% - 60px);

      .rule-chain-editor__left-panel {
        width: 300px;
        // background: linear-gradient(180deg, #f8fcff 0%, #f0f8ff 100%);
        background-color: rgba(19, 44, 84, 0.2);
        border-right: 1px solid #435678;
        display: flex;
        flex-direction: column;
        transition: width 0.3s ease;
        box-shadow: var(--shadow-light);

        &.is-collapsed {
          width: 0;
          overflow: hidden;
        }

        .rule-chain-editor__chain-selector {
          padding: 16px;
          // border-bottom: 1px solid var(--border-light);
          position: relative;
          // background: rgba(255, 255, 255, 0.5);
          // background-color: #132c54;
        }

        .rule-chain-editor__card-categories {
          flex: 1;
          overflow-y: auto;
          padding: 16px;

          :deep(.el-collapse) {
            border: none;
          }

          :deep(.el-collapse-item__header) {
            background-color: transparent;
            border: none;
            padding: 12px 0;
            font-weight: 600;
          }

          :deep(.el-collapse-item__content) {
            padding: 0;
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
          gap: 8px;

          .rule-chain-editor__card {
            display: flex;
            align-items: center;
            padding: 12px;
            // background: linear-gradient(135deg, #ffffff 0%, #f8fcff 100%);
            border-radius: 8px;
            cursor: grab;
            transition: all 0.2s ease;
            min-width: 200px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

            &:hover {
              // border-color: var(--primary-color);
              // box-shadow: var(--shadow-base);
              // background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%);
            }

            &:active {
              cursor: grabbing;
            }

            // 根据卡片类型添加左边框颜色

            // 与自定义节点风格一致：背景色与图标相同
            &[data-type='function-switch'] {
              background-color: #2f6bb0;
            }
            &[data-type='action-changeValue'] {
              background-color: #197f7e;
            }
            &[data-type='function-switch'] .rule-chain-editor__card-name,
            &[data-type='function-switch'] .rule-chain-editor__card-description,
            &[data-type='action-changeValue'] .rule-chain-editor__card-name,
            &[data-type='action-changeValue'] .rule-chain-editor__card-description {
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
              // color: var(--primary-color);
              font-size: 20px;
              .el-icon {
                font-size: 20px;
              }
              &.icon--function-switch {
                background: #3b78c2;
                .el-icon {
                  color: #ffffff;
                }
              }
              &.icon--action-changeValue {
                background: #209f9d;
                .el-icon {
                  color: #ffffff;
                }
              }
            }

            .rule-chain-editor__card-content {
              flex: 1;
            }

            .rule-chain-editor__card-name {
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 4px;
              font-size: 14px;
            }

            .rule-chain-editor__card-description {
              font-size: 12px;
              color: #909399;
              line-height: 1.4;
            }
          }
        }
      }

      .rule-chain-editor__center-panel {
        flex: 1;
        height: 100%;
        position: relative;
        z-index: 1;

        .rule-chain-editor__collapse-btn {
          position: absolute;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          z-index: 2;
          background-color: #132c54;
          font-size: 24px;
          cursor: pointer;
        }

        .rule-chain-editor__flow {
          width: 100%;
          height: 100%;
        }
      }

      .rule-chain-editor__right-panel {
        width: 350px;
        // background: linear-gradient(180deg, #f8fcff 0%, #f0f8ff 100%);
        background-color: #132c54;
        border-left: 1px solid var(--border-base);
        display: flex;
        flex-direction: column;
        transition: width 0.3s ease;
        position: relative;
        // box-shadow: var(--shadow-light);

        &.is-collapsed {
          width: 0;
          overflow: hidden;
        }

        .rule-chain-editor__right-collapse-btn {
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          z-index: 2;
        }

        .rule-chain-editor__edit-content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          border-left: 1px solid #435678;
          .rule-chain-editor__edit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 16px;
            // background: rgba(255, 255, 255, 0.7);
            background-color: #132c54;
            border-radius: 8px;
            border-left: 1px solid #67c23a;
            box-shadow: var(--shadow-light);

            h3 {
              margin: 0;
              color: var(--text-primary);
              font-size: 18px;
              font-weight: 600;
            }
          }

          .rule-chain-editor__edit-form {
            // background: rgba(255, 255, 255, 0.5);
            background-color: #132c54;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-light);

            .el-form-item {
              margin-bottom: 20px;

              .el-form-item__label {
                font-weight: 600;
                color: var(--text-primary);
              }
            }
          }

          .rule-chain-editor__edit-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
            padding: 16px;
            // background: rgba(255, 255, 255, 0.5);
            background-color: #132c54;
            border-radius: 8px;
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-light);
          }

          .rule-chain-editor__empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--text-secondary);
            text-align: center;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-light);

            .rule-chain-editor__empty-icon {
              font-size: 48px;
              margin-bottom: 16px;
              opacity: 0.6;
            }

            p {
              margin: 0;
              font-size: 14px;
            }
          }
        }
      }
    }

    .rule-chain-editor__card-edit {
      .el-form-item {
        margin-bottom: 16px;
      }
    }
  }
}
</style>
