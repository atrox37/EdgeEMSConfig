import { ElMessage } from 'element-plus'
import type { EdgeChange, NodeChange, Node as FlowNode } from '@vue-flow/core'
import { ensureStartEndNodesUndeletable } from '@/composables/rule/useRuleFlowConnections'
import { isProtectedRuleNodeId, stripNodeIdFromAllWires } from '@/utils/ruleFlowNodeCleanup'

interface UseRuleFlowChangeHandlersOptions {
  isMonitorMode: { value: boolean }
  toObject: () => { nodes: FlowNode[]; edges: unknown[] }
  setNodes: (nodes: FlowNode[]) => void
  updateNode: (id: string, nodeUpdate: Partial<FlowNode>) => void
  syncStoreFromFlow?: () => void
  applyWireCleanup?: (removedNodeId: string) => void
  applyEdgeChanges: ((changes: EdgeChange[]) => void) | undefined
  onHasChanges: () => void
  saveEditSnapshot: () => void
  visibleVarsNodes: { value: Set<string> }
  updateAllBubblePositions: () => void
  onNodesChange: (handler: (changes: NodeChange[]) => void) => void
  onConnect: (handler: () => void) => void
  onEdgeUpdate: (handler: () => void) => void
  onNodeDragStop: (handler: () => void) => void
  onEdgesChange: (handler: (changes: EdgeChange[]) => void) => void
}

export function useRuleFlowChangeHandlers(options: UseRuleFlowChangeHandlersOptions) {
  let isInitNodes = true

  options.onNodesChange((changes: NodeChange[]) => {
    if (isInitNodes) {
      isInitNodes = false
      return
    }

    const removeChanges = changes.filter((change) => change.type === 'remove')
    if (removeChanges.length > 0 && !options.isMonitorMode.value) {
      const protectedNodeIds = new Set(['start', 'end'])
      const attemptedDeletes = removeChanges
        .map((change) => (change as { id?: string }).id)
        .filter((id): id is string => !!id && protectedNodeIds.has(id))

      if (attemptedDeletes.length > 0) {
        ElMessage.warning('Start and End nodes cannot be deleted')
        const filteredChanges = changes.filter((change) => {
          if (change.type === 'remove') {
            const nodeId = (change as { id?: string }).id
            return !nodeId || !protectedNodeIds.has(nodeId)
          }
          return true
        })
        if (filteredChanges.length !== changes.length) {
          const currentNodes = options.toObject().nodes as FlowNode[]
          options.setNodes(ensureStartEndNodesUndeletable(currentNodes))
          return
        }
      }

      for (const change of removeChanges) {
        const removedId = (change as { id?: string }).id
        if (!removedId || isProtectedRuleNodeId(removedId)) continue
        if (options.applyWireCleanup) {
          options.applyWireCleanup(removedId)
        } else {
          const currentNodes = options.toObject().nodes as FlowNode[]
          for (const node of stripNodeIdFromAllWires(currentNodes, removedId)) {
            if (node.id === removedId) continue
            const original = currentNodes.find((item) => item.id === node.id)
            if (!original || original.data === node.data) continue
            options.updateNode(node.id, { data: node.data })
          }
        }
      }
      options.syncStoreFromFlow?.()
    }

    const meaningfulChanges = changes.filter((change) => {
      if (change.type === 'select' || change.type === 'dimensions') return false
      return change.type === 'add' || change.type === 'remove' || change.type === 'position'
    })

    if (meaningfulChanges.length > 0) {
      if (options.isMonitorMode.value) {
        const positionChanges = meaningfulChanges.filter((change) => change.type === 'position')
        if (positionChanges.length > 0 && options.visibleVarsNodes.value.size > 0) {
          requestAnimationFrame(() => {
            options.updateAllBubblePositions()
          })
        }
      } else {
        options.onHasChanges()
        options.saveEditSnapshot()
      }
    }
  })

  options.onConnect(() => {
    options.onHasChanges()
    options.saveEditSnapshot()
  })

  options.onEdgeUpdate(() => {
    options.onHasChanges()
    options.saveEditSnapshot()
  })

  options.onNodeDragStop(() => {
    if (options.isMonitorMode.value) {
      if (options.visibleVarsNodes.value.size > 0) {
        requestAnimationFrame(() => {
          options.updateAllBubblePositions()
        })
      }
    } else {
      options.onHasChanges()
    }
  })

  options.onEdgesChange((changes: EdgeChange[]) => {
    const meaningfulChanges = (changes || []).filter((change) => change.type !== 'select')

    if (meaningfulChanges.length === 0) {
      options.applyEdgeChanges?.(changes)
      return
    }

    for (const change of meaningfulChanges) {
      if (change.type === 'remove') {
        const sourceId = change.source
        const allNodes =
          (options.toObject().nodes as Array<{
            id: string
            data?: { type?: string; config?: { wires?: Record<string, string[]> } }
          }>) || []
        const sourceNode = allNodes.find((node) => node.id === sourceId)
        const key =
          sourceNode?.data?.type === 'function-switch' ? change.sourceHandle || '' : 'default'
        if (sourceNode?.data?.config?.wires) {
          const wires = sourceNode.data.config.wires
          const arr = wires[key]
          if (Array.isArray(arr) && change.target) {
            const idx = arr.indexOf(change.target)
            if (idx > -1) arr.splice(idx, 1)
          }
        }
        if (sourceNode) {
          options.updateNode(sourceNode.id, {
            data: {
              ...sourceNode.data,
            },
          })
        }
      }
    }
    options.onHasChanges()
    options.applyEdgeChanges?.(changes)
  })
}
