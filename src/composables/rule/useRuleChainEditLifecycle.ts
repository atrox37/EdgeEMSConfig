import { nextTick, ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRuleDetail, updateRule } from '@/api/rulesManagement'
import { useFlowHistory } from '@/composables/flow/useFlowHistory'
import { ensureStartEndNodesUndeletable } from '@/composables/rule/useRuleFlowConnections'
import { RULE_CARD_CATEGORIES } from '@/constants/ruleCardPalette'
import type { useRuleChainStore } from '@/stores/ruleChain.ts'
import type {
  Edge as AppEdge,
  Node as AppNode,
  RuleChain,
  RuleChainPayload,
} from '@/types/ruleConfiguration'
import { layoutRuleChain } from '@/utils/ruleChainLayout'
import { normalizeRuleFlowEdges } from '@/utils/ruleFlowEdges'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'
import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'

type RuleChainStore = ReturnType<typeof useRuleChainStore>

interface MonitorRuntimeBridge {
  stopMonitorSubscription: () => void
  clearSimulation: () => void
  resetRuntimeVisuals: () => void
  visibleVarsNodes: Ref<Set<string>>
  clearMonitorOverlay: () => void
  startMonitorSubscription: () => void
  startSimulation: () => void
}

interface UseRuleChainEditLifecycleOptions {
  isMonitorMode: Ref<boolean>
  activeCategories: Ref<string[]>
  currentChainId: Ref<string>
  importFileInput: Ref<HTMLInputElement | null>
  cardEditDialogVisible: Ref<boolean>
  ruleChainStore: RuleChainStore
  toObject: () => { nodes: FlowNode[]; edges: FlowEdge[] }
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  updateNode: (id: string, nodeUpdate: Partial<FlowNode>) => void
  fitFlowToViewport: () => void
  pruneInvalidIncomingEdges: (targetNodeId: string) => void
  monitorRuntime: MonitorRuntimeBridge
  nodes: Ref<FlowNode[] | AppNode[]>
  edges: Ref<FlowEdge[] | AppEdge[]>
}

export function useRuleChainEditLifecycle(options: UseRuleChainEditLifecycleOptions) {
  const cardCategories = ref(RULE_CARD_CATEGORIES)
  let isRestoringEditHistory = false

  const editHistory = useFlowHistory({
    enabled: () => !options.isMonitorMode.value && !isRestoringEditHistory,
    capture: () => {
      const flowObj = options.toObject()
      return {
        nodes: flowObj.nodes as FlowNode[],
        edges: flowObj.edges as FlowEdge[],
      }
    },
    restore: async (snapshot) => {
      isRestoringEditHistory = true
      options.setNodes(ensureStartEndNodesUndeletable(snapshot.nodes))
      options.setEdges(normalizeRuleFlowEdges(snapshot.edges))
      options.ruleChainStore.hasUnsavedChanges = true
      await nextTick()
      isRestoringEditHistory = false
    },
  })

  const saveEditSnapshot = () => {
    editHistory.saveSnapshot()
  }

  function exitMonitorMode() {
    options.isMonitorMode.value = true
    nextTick(() => options.fitFlowToViewport())
  }

  async function handleAutoLayout() {
    if (options.isMonitorMode.value) return
    const flowObj = options.toObject()
    const laidOut = layoutRuleChain(flowObj.nodes as FlowNode[], flowObj.edges as FlowEdge[])
    options.setNodes(ensureStartEndNodesUndeletable(laidOut))
    options.ruleChainStore.hasUnsavedChanges = true
    saveEditSnapshot()
    await nextTick()
    options.fitFlowToViewport()
    ElMessage.success('Auto layout completed')
  }

  async function handleRestoreToSaved() {
    if (!options.ruleChainStore.hasUnsavedChanges) {
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

  async function handleExitEdit() {
    if (!options.ruleChainStore.hasUnsavedChanges) {
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

  function handleCardEditConfirm(newCard: { id?: string }) {
    if (!newCard?.id) return
    options.updateNode(newCard.id, {
      data: {
        ...newCard,
      },
    })
    options.pruneInvalidIncomingEdges(newCard.id)
    options.ruleChainStore.hasUnsavedChanges = true
    options.cardEditDialogVisible.value = false
  }

  async function handleSave() {
    const flowObj = options.toObject()
    const newNodes = flowObj.nodes as unknown as AppNode[]
    const newEdges = flowObj.edges as unknown as AppEdge[]
    const payload = options.ruleChainStore.exportRuleChain(
      flowObj.nodes as FlowNode[],
      flowObj.edges as FlowEdge[],
    ) as RuleChainPayload

    try {
      await updateRule(payload)
      options.ruleChainStore.saveChanges(newNodes, newEdges)
      options.ruleChainStore.hasUnsavedChanges = false
      editHistory.clear()
      nextTick(() => saveEditSnapshot())
      ElMessage.success('Submitted successfully')
      nextTick(() => options.fitFlowToViewport())
    } catch {
      options.ruleChainStore.hasUnsavedChanges = true
      ElMessage.error('Submit failed')
    }
  }

  function handleCancel() {
    options.ruleChainStore.discardChanges()
    options.setNodes(options.nodes.value as unknown as FlowNode[])
    options.setEdges(normalizeRuleFlowEdges(options.edges.value as unknown as FlowEdge[]))
    ElMessage.success('Changes discarded')
  }

  async function handleExport() {
    const flowObj = options.toObject()
    const ruleChainData = options.ruleChainStore.exportRuleChain(
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

  function enterEditMode() {
    options.isMonitorMode.value = false
    options.activeCategories.value = cardCategories.value.map((category) => category.type)
    options.monitorRuntime.stopMonitorSubscription()
    options.monitorRuntime.clearSimulation()
    options.monitorRuntime.resetRuntimeVisuals()
    options.monitorRuntime.visibleVarsNodes.value.clear()
    editHistory.clear()
    nextTick(() => saveEditSnapshot())
  }

  function handleImportClick() {
    options.importFileInput.value?.click()
  }

  function handleImportChange(event: Event) {
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
        const protectedNodes = ensureStartEndNodesUndeletable(nextNodes as FlowNode[])
        options.setNodes(protectedNodes)
        options.setEdges(normalizeRuleFlowEdges(nextEdges as FlowEdge[]))
        options.ruleChainStore.hasUnsavedChanges = true
        saveEditSnapshot()
        ElMessage.success('Imported successfully')
      } catch {
        ElMessage.error('Import failed: invalid JSON structure')
      } finally {
        target.value = ''
      }
    }
    reader.readAsText(file)
  }

  async function loadRuleDetail(chainId: string) {
    const res = await getRuleDetail(chainId)
    if (!res.success || !res.data) return

    const payload = res.data
    const flow = payload.flow_json
    const nextNodes = Array.isArray(flow?.nodes) ? flow.nodes : []
    const nextEdges = Array.isArray(flow?.edges) ? flow.edges : []
    const chainMeta = {
      id: chainId,
      name: payload.name || '',
      description: payload.description || '',
      priority: payload.priority || 10,
      enabled: payload.enabled || true,
      cooldown_ms: payload.cooldown_ms || 5000,
    }

    if (nextNodes.length || nextEdges.length) {
      const protectedNodes = ensureStartEndNodesUndeletable(nextNodes as FlowNode[])
      const normalizedEdges = normalizeRuleFlowEdges(nextEdges as FlowEdge[])
      options.ruleChainStore.saveChanges(
        protectedNodes as unknown as AppNode[],
        normalizedEdges as unknown as AppEdge[],
      )
      options.ruleChainStore.setCurrentRuleChain(chainMeta as unknown as RuleChain)
      options.setNodes(protectedNodes)
      options.setEdges(normalizedEdges)
      return
    }

    options.ruleChainStore.initDefaultGraph()
    options.setNodes(options.ruleChainStore.nodes as unknown as FlowNode[])
    options.setEdges([] as unknown as FlowEdge[])
    options.ruleChainStore.setCurrentRuleChain(chainMeta)
  }

  watch(
    () => options.isMonitorMode.value,
    (monitorMode) => {
      if (monitorMode) {
        options.ruleChainStore.createMonitorSnapshot()
        nextTick(() => {
          const monitorNodes = ensureStartEndNodesUndeletable(
            options.ruleChainStore.monitorNodes as unknown as FlowNode[],
          )
          options.setNodes(monitorNodes)
          options.setEdges(normalizeRuleFlowEdges(
            options.ruleChainStore.monitorEdges as unknown as FlowEdge[],
          ))
          options.monitorRuntime.resetRuntimeVisuals()
          options.monitorRuntime.startSimulation()
          options.monitorRuntime.startMonitorSubscription()
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              options.fitFlowToViewport()
            })
          })
        })
        return
      }

      options.monitorRuntime.clearSimulation()
      const currentNodes = options.toObject().nodes
      const currentEdges = options.toObject().edges
      options.ruleChainStore.updateMonitorNodes(currentNodes as unknown as FlowNode[])
      options.ruleChainStore.updateMonitorEdges(currentEdges as unknown as FlowEdge[])
      nextTick(() => {
        const editNodes = ensureStartEndNodesUndeletable(
          options.ruleChainStore.nodes as unknown as FlowNode[],
        )
        options.setNodes(editNodes)
        options.setEdges(normalizeRuleFlowEdges(
          options.ruleChainStore.edges as unknown as FlowEdge[],
        ))
        options.monitorRuntime.resetRuntimeVisuals()
        options.monitorRuntime.clearMonitorOverlay()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            options.fitFlowToViewport()
          })
        })
      })
    },
  )

  return {
    cardCategories,
    editHistory,
    saveEditSnapshot,
    exitMonitorMode,
    handleAutoLayout,
    handleRestoreToSaved,
    handleExitEdit,
    handleCardEditConfirm,
    handleSave,
    handleCancel,
    handleExport,
    enterEditMode,
    handleImportClick,
    handleImportChange,
    loadRuleDetail,
  }
}
