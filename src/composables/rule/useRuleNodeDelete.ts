import { nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import {
  isProtectedRuleNodeId,
  stripNodeIdFromAllWires,
} from '@/utils/ruleFlowNodeCleanup'

interface UseRuleNodeDeleteOptions {
  isMonitorMode: { value: boolean }
  toObject: () => { nodes: FlowNode[]; edges: FlowEdge[] }
  updateNode: (id: string, nodeUpdate: Partial<FlowNode>) => void
  removeNodes: (ids: string[]) => void
  removeEdges: (ids: string[]) => void
  syncStoreFromFlow: () => void
}

export function useRuleNodeDelete(options: UseRuleNodeDeleteOptions) {
  function applyWireCleanup(removedNodeId: string) {
    const currentNodes = options.toObject().nodes as FlowNode[]
    for (const node of stripNodeIdFromAllWires(currentNodes, removedNodeId)) {
      if (node.id === removedNodeId) continue
      const original = currentNodes.find((item) => item.id === node.id)
      if (!original || original.data === node.data) continue
      options.updateNode(node.id, { data: node.data })
    }
  }

  async function deleteRuleNode(nodeId: string) {
    if (options.isMonitorMode.value || isProtectedRuleNodeId(nodeId)) return

    try {
      await ElMessageBox.confirm(
        'Delete this node and its related connections?',
        'Delete Node',
        {
          confirmButtonText: 'Delete',
          cancelButtonText: 'Cancel',
          type: 'warning',
          center: true,
          customClass: 'delete-confirm-box',
          showClose: false,
        },
      )
    } catch {
      return
    }

    applyWireCleanup(nodeId)

    const connectedEdgeIds = options.toObject().edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => String(edge.id))

    if (connectedEdgeIds.length) {
      options.removeEdges(connectedEdgeIds)
    }
    options.removeNodes([nodeId])

    await nextTick()
    options.syncStoreFromFlow()
    ElMessage.success('Node deleted')
  }

  return {
    applyWireCleanup,
    deleteRuleNode,
  }
}
