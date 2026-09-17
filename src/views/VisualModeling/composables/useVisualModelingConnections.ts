import type { Ref } from 'vue'
import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type {
  Connection,
  Edge as FlowEdge,
  EdgeChange,
  Node as FlowNode,
} from '@vue-flow/core'
import {
  getConnectionRuleHint,
  resolveConnectionEndpoints,
} from '@/utils/modelFlowRules'
import { createFlowEdgeId } from '@/utils/defaultModelFlow'

export interface UseVisualModelingConnectionsOptions {
  isViewMode: Ref<boolean>
  getFlowNodes: () => FlowNode[]
  getFlowEdges: () => FlowEdge[]
  toObject: () => { edges?: unknown[] }
  addEdges: (edges: FlowEdge | FlowEdge[]) => void
  setEdges: (edges: FlowEdge[]) => void
  applyEdgeChanges: (changes: EdgeChange[]) => void
  normalizeFlowEdges: (raw: FlowEdge[], flowNodes?: FlowNode[]) => FlowEdge[]
  updateEdges: (edges: FlowEdge[]) => void
  isRestoring: () => boolean
  markDirty: () => void
  onSnapshot: () => void
  selectedNode: Ref<unknown>
  selectedEdgeId: Ref<string | null>
}

export function useVisualModelingConnections(options: UseVisualModelingConnectionsOptions) {
  function purgeInvalidFlowEdges() {
    const current = (options.toObject().edges ?? []) as FlowEdge[]
    const valid = current.filter((e) => e?.id && e.source && e.target)
    if (valid.length === current.length) return
    const normalized = options.normalizeFlowEdges(valid)
    options.setEdges(normalized)
    options.updateEdges(normalized)
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return

    const flowNodes = options.getFlowNodes()
    const flowEdges = options.getFlowEdges()
    const source = flowNodes.find((node) => node.id === connection.source)
    const target = flowNodes.find((node) => node.id === connection.target)
    const ruleHint = getConnectionRuleHint(source, target, flowEdges, flowNodes)

    if (ruleHint) {
      ElMessage.warning(ruleHint)
      void nextTick().then(() => purgeInvalidFlowEdges())
      return
    }

    const resolved = resolveConnectionEndpoints(connection, flowNodes)
    if (!resolved) {
      ElMessage.warning('Invalid connection')
      void nextTick().then(() => purgeInvalidFlowEdges())
      return
    }

    const newEdge = options.normalizeFlowEdges([{
      id: createFlowEdgeId(),
      source: resolved.source.id,
      target: resolved.target.id,
      sourceHandle: resolved.sourceHandle,
      targetHandle: resolved.targetHandle,
    } as FlowEdge], flowNodes)[0]

    options.addEdges(newEdge)
    void nextTick().then(() => {
      options.updateEdges(
        options.normalizeFlowEdges((options.toObject().edges ?? []) as FlowEdge[], options.getFlowNodes()),
      )
      options.markDirty()
      options.onSnapshot()
    })
  }

  function handleConnectGuard(connection: Connection) {
    if (options.isViewMode.value) return
    handleConnect(connection)
  }

  function handleEdgeClick(event: { edge?: FlowEdge } | FlowEdge) {
    options.selectedNode.value = null
    const edge = ('edge' in event ? event.edge : event) ?? event
    options.selectedEdgeId.value = (edge as FlowEdge)?.id ?? null
  }

  function handleEdgeClickGuard(event: unknown) {
    if (options.isViewMode.value) return
    handleEdgeClick(event as { edge?: FlowEdge })
  }

  function onEdgesChangeHandler(changes: EdgeChange[]) {
    const list = changes || []
    const safe = list.filter((change) => {
      if (change.type !== 'add') return true
      const item = (change as { item?: FlowEdge }).item
      return !!(item?.source && item?.target)
    })

    if (safe.length) {
      options.applyEdgeChanges(safe)
    }

    if (safe.length !== list.length) {
      purgeInvalidFlowEdges()
    }

    if (options.isViewMode.value || options.isRestoring()) return
    const meaningful = safe.filter((c) => c.type !== 'select')
    if (!meaningful.some((c) => c.type === 'add' || c.type === 'remove')) return

    void nextTick().then(() => {
      purgeInvalidFlowEdges()
      options.updateEdges(options.normalizeFlowEdges((options.toObject().edges ?? []) as FlowEdge[]))
      options.markDirty()
      options.onSnapshot()
    })
  }

  return {
    handleConnect,
    handleConnectGuard,
    handleEdgeClick,
    handleEdgeClickGuard,
    onEdgesChangeHandler,
    purgeInvalidFlowEdges,
  }
}
