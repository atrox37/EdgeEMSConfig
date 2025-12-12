import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RuleChain, Node, Edge } from '../types'

export const useRuleChainStore = defineStore('ruleChain', () => {
  // 状态
  const ruleChains = ref<RuleChain[]>([])
  const nodes = ref<Node[]>([
    {
      id: 'start',
      type: 'start',
      position: { x: 100, y: 100 },
      data: {
        id: 'start',
        name: 'START',
        type: 'start',
        label: 'START',
        description: 'START',
        config: { wires: { default: [] } },
      },
      deletable: false,
    },
    {
      id: 'end',
      type: 'end',
      position: { x: 500, y: 100 },
      data: {
        id: 'end',
        name: 'END',
        type: 'end',
        label: 'END',
        description: 'END',
        config: { wires: { default: [] } },
      },
      deletable: false,
    },
  ])
  const edges = ref<Edge[]>([])
  const currentRuleChain = ref<RuleChain | null>(null)
  const isFullscreen = ref(false)
  const isLeftPanelCollapsed = ref(false)
  const hasUnsavedChanges = ref(false)

  // 计算属性
  const rootRuleChain = computed(() => ruleChains.value.find((chain) => chain.isRoot))

  // 规则链管理方法
  const addRuleChain = (ruleChainData: Omit<RuleChain, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRuleChain: RuleChain = {
      id: `chain-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...ruleChainData,
    }
    ruleChains.value.push(newRuleChain)
    return newRuleChain
  }

  const updateRuleChain = (id: string, updates: Partial<Omit<RuleChain, 'id' | 'createdAt'>>) => {
    const index = ruleChains.value.findIndex((chain) => chain.id === id)
    if (index !== -1) {
      ruleChains.value[index] = {
        ...ruleChains.value[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      hasUnsavedChanges.value = true
    }
  }
  watch(hasUnsavedChanges, (newVal) => {
    console.log('hasUnsavedChanges', newVal)
  })
  const deleteRuleChain = (id: string) => {
    const index = ruleChains.value.findIndex((chain) => chain.id === id)
    if (index !== -1) {
      ruleChains.value.splice(index, 1)
      // 如果删除的是当前规则链，清空当前规则链
      if (currentRuleChain.value?.id === id) {
        currentRuleChain.value = null
      }
    }
  }

  const getRuleChain = (id: string) => {
    return ruleChains.value.find((chain) => chain.id === id)
  }

  const setCurrentRuleChain = (ruleChain: RuleChain) => {
    currentRuleChain.value = ruleChain
  }

  // 节点管理方法
  const addNodes = (node: Node[]) => {
    nodes.value.push(...node)
  }

  // 边管理方法
  const addEdges = (edge: Edge[]) => {
    edges.value.push(...edge)
  }

  // UI状态管理方法
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
  }

  const toggleLeftPanel = () => {
    isLeftPanelCollapsed.value = !isLeftPanelCollapsed.value
  }

  const saveChanges = (newNodes: Node[], newEdges: Edge[]) => {
    hasUnsavedChanges.value = false
    // 这里可以添加保存到后端的逻辑
    console.log('Saving changes...')
    nodes.value = newNodes
    edges.value = newEdges
  }

  const discardChanges = () => {
    hasUnsavedChanges.value = false
    // 这里可以添加恢复原始状态的逻辑
    console.log('Discarding changes...')
  }

  // 导出规则链为JSON
  const exportRuleChain = () => {
    const ruleChainData = {
      id: currentRuleChain.value?.id || `chain-${Date.now()}`,
      name: currentRuleChain.value?.name || 'Untitled Rule Chain',
      description: currentRuleChain.value?.description || '',
      nodes: nodes.value.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.value.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        type: edge.type,
      })),
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    }
    return ruleChainData
  }

  // 清空所有数据
  const clearAll = () => {
    ruleChains.value = []
    nodes.value = []
    edges.value = []
    currentRuleChain.value = null
    hasUnsavedChanges.value = false
  }

  return {
    // 状态
    ruleChains,
    nodes,
    edges,
    currentRuleChain,
    isFullscreen,
    isLeftPanelCollapsed,
    hasUnsavedChanges,

    // 计算属性
    rootRuleChain,

    // 规则链方法
    addRuleChain,
    updateRuleChain,
    deleteRuleChain,
    getRuleChain,
    setCurrentRuleChain,

    // 节点方法
    addNodes,

    // 边方法
    addEdges,

    // UI方法
    toggleFullscreen,
    toggleLeftPanel,
    saveChanges,
    discardChanges,
    exportRuleChain,
    clearAll,
  }
})
