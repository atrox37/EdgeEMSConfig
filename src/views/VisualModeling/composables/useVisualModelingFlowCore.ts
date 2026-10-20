import type { Ref } from 'vue'
import { nextTick, ref } from 'vue'
import type {
  Edge as FlowEdge,
  Node as FlowNode,
  NodeChange,
} from '@vue-flow/core'
import { normalizeTopologyEdges } from './useTopologyEdges'
import { collectNodesToDelete } from '@/utils/visualModeling'
import { isFlowSnapshotEqual, type FlowSnapshot } from '@/utils/flowSnapshot'

export interface UseVisualModelingFlowCoreOptions {
  nodes: Ref<unknown[]>
  edges: Ref<unknown[]>
  isViewMode: Ref<boolean>
  hasUnsavedChanges: Ref<boolean>
  selectedNode: Ref<unknown>
  selectedEdgeId: Ref<string | null>
  storeHasUnsavedChanges: { hasUnsavedChanges: boolean }
  getNodes: { value: unknown[] }
  toObject: () => { nodes?: unknown[]; edges?: unknown[] }
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  onSnapshot: () => void
}

export function useVisualModelingFlowCore(options: UseVisualModelingFlowCoreOptions) {
  let isRestoringHistory = false
  const savedSnapshot = ref<FlowSnapshot | null>(null)

  function isRestoring() {
    return isRestoringHistory
  }

  function setRestoring(value: boolean) {
    isRestoringHistory = value
  }

  function normalizeFlowEdges(raw: FlowEdge[], flowNodes?: FlowNode[]): FlowEdge[] {
    return normalizeTopologyEdges(raw, flowNodes ?? getFlowNodes()) as FlowEdge[]
  }

  function getFlowNodes(): FlowNode[] {
    const fromRef = options.nodes.value as unknown as FlowNode[]
    const fromFlow = options.getNodes.value as unknown as FlowNode[]
    const pick = fromRef.length >= fromFlow.length ? fromRef : fromFlow
    return JSON.parse(JSON.stringify(pick)) as FlowNode[]
  }

  function getFlowEdges(): FlowEdge[] {
    const fromRef = options.edges.value as unknown as FlowEdge[]
    const fromFlow = options.toObject().edges as unknown as FlowEdge[]
    const pick = fromRef.length >= fromFlow.length ? fromRef : fromFlow
    return JSON.parse(JSON.stringify(pick)) as FlowEdge[]
  }

  function isSameAsSavedSnapshot(): boolean {
    if (!savedSnapshot.value) return false
    const current: FlowSnapshot = { nodes: getFlowNodes(), edges: getFlowEdges() }
    const saved: FlowSnapshot = {
      nodes: savedSnapshot.value.nodes as FlowSnapshot['nodes'],
      edges: savedSnapshot.value.edges as FlowSnapshot['edges'],
    }
    return isFlowSnapshotEqual(current, saved)
  }

  function markDirty() {
    if (options.isViewMode.value) return
    const dirty = !isSameAsSavedSnapshot()
    options.hasUnsavedChanges.value = dirty
    options.storeHasUnsavedChanges.hasUnsavedChanges = dirty
  }

  async function captureSavedSnapshot(): Promise<boolean> {
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    const flowNodes = getFlowNodes()
    const flowEdges = getFlowEdges()
    savedSnapshot.value = {
      nodes: JSON.parse(JSON.stringify(flowNodes)) as FlowSnapshot['nodes'],
      edges: JSON.parse(JSON.stringify(flowEdges)) as FlowSnapshot['edges'],
    }
    return true
  }

  async function applyFlowState(
    nextNodes: FlowNode[],
    nextEdges: FlowEdge[],
    applyOptions?: { resetDirty?: boolean },
  ) {
    const clonedNodes = (JSON.parse(JSON.stringify(nextNodes)) as FlowNode[]).map((node) => ({
      ...node,
      selected: false,
    }))
    const clonedEdges = normalizeFlowEdges(
      JSON.parse(JSON.stringify(nextEdges)) as FlowEdge[],
      clonedNodes,
    )
    const nodeIds = new Set(clonedNodes.map((n) => n.id))
    const safeEdges = clonedEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

    isRestoringHistory = true
    options.setNodes(clonedNodes)
    options.edges.value = safeEdges
    options.setEdges(safeEdges)
    await nextTick()
    options.nodes.value = (options.toObject().nodes ?? clonedNodes) as FlowNode[]
    const graphEdges = (options.toObject().edges ?? []) as FlowEdge[]
    const resolvedEdges = graphEdges.length >= safeEdges.length ? graphEdges : safeEdges
    options.edges.value = normalizeFlowEdges(resolvedEdges, clonedNodes)
    isRestoringHistory = false
    if (applyOptions?.resetDirty) {
      options.hasUnsavedChanges.value = false
    }
  }

  function removeNodesByIds(idsToRemove: string[]) {
    const idSet = new Set(idsToRemove)
    const currentNodes = getFlowNodes()
    const nextNodes = currentNodes.filter((n) => !idSet.has(n.id))
    const nextEdges = getFlowEdges().filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
    isRestoringHistory = true
    options.setNodes(nextNodes)
    options.setEdges(nextEdges)
    void nextTick().then(() => {
      options.nodes.value = (options.toObject().nodes ?? nextNodes) as FlowNode[]
      options.edges.value = normalizeFlowEdges((options.toObject().edges ?? nextEdges) as FlowEdge[])
      if (options.selectedNode.value && idSet.has((options.selectedNode.value as { id: string }).id)) {
        options.selectedNode.value = null
      }
      isRestoringHistory = false
      markDirty()
      options.onSnapshot()
    })
  }

  function removeSelectedElements() {
    const currentNodes = options.getNodes.value as FlowNode[]
    const currentEdges = getFlowEdges()
    const selectedNodeIds = currentNodes
      .filter((node) => (node as FlowNode & { selected?: boolean }).selected)
      .map((node) => node.id)

    const nodeIds = new Set<string>()
    for (const id of selectedNodeIds) {
      collectNodesToDelete(id).forEach((nodeId) => nodeIds.add(nodeId))
    }
    const edgeIds = new Set(
      currentEdges.filter((edge) => (edge as FlowEdge & { selected?: boolean }).selected).map((edge) => edge.id),
    )

    if (!nodeIds.size && !edgeIds.size) return

    const nextNodes = currentNodes.filter((node) => !nodeIds.has(node.id))
    const nextEdges = currentEdges.filter(
      (edge) => !edgeIds.has(edge.id) && !nodeIds.has(edge.source) && !nodeIds.has(edge.target),
    )

    isRestoringHistory = true
    options.setNodes(nextNodes)
    options.setEdges(nextEdges)
    options.selectedNode.value = null
    options.selectedEdgeId.value = null
    void nextTick().then(() => {
      options.nodes.value = (options.toObject().nodes ?? nextNodes) as FlowNode[]
      options.edges.value = normalizeFlowEdges((options.toObject().edges ?? nextEdges) as FlowEdge[])
      isRestoringHistory = false
      markDirty()
      options.onSnapshot()
    })
  }

  function onNodesChangeHandler(changes: NodeChange[]) {
    if (options.isViewMode.value || isRestoringHistory) return

    const meaningful = changes.some(
      (c) =>
        c.type === 'position'
        || c.type === 'add'
        || c.type === 'remove'
        || c.type === 'dimensions',
    )
    if (!meaningful) return
    void nextTick().then(() => {
      options.nodes.value = (options.toObject().nodes ?? options.nodes.value) as FlowNode[]
    })
    markDirty()
    options.onSnapshot()
  }

  return {
    savedSnapshot,
    isRestoring,
    setRestoring,
    normalizeFlowEdges,
    getFlowNodes,
    getFlowEdges,
    isSameAsSavedSnapshot,
    markDirty,
    captureSavedSnapshot,
    applyFlowState,
    removeNodesByIds,
    removeSelectedElements,
    onNodesChangeHandler,
  }
}
