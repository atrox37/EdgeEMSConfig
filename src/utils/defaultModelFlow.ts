import type { ModelFlowData, ModelFlowEdge, ModelFlowNode } from '@/types/visualModeling'

let flowEdgeIdSeq = 0
export function createFlowEdgeId(): string {
  flowEdgeIdSeq += 1
  return `edge-${Date.now() + flowEdgeIdSeq}`
}

export function ensureTimestampEdgeIds(edges: ModelFlowEdge[]): ModelFlowEdge[] {
  return edges.map((edge) => /^edge-\d+$/.test(edge.id) ? edge : { ...edge, id: createFlowEdgeId() })
}

/** A new topology starts empty; products and relations are supplied by the API. */
export function createDefaultModelFlow(): ModelFlowData {
  return { nodes: [], edges: [] }
}

export function isEmptyFlow(flow: ModelFlowData) {
  return !flow.nodes.length && !flow.edges.length
}

/** Retains valid stored edges and normalizes only their identifiers and handles. */
export function synthesizeHierarchyEdges(
  nodes: ModelFlowNode[],
  existingEdges: ModelFlowEdge[] = [],
): ModelFlowEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id))
  return ensureTimestampEdgeIds(existingEdges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  )).map((edge) => ({
    ...edge,
    sourceHandle: edge.sourceHandle ?? 'bottom-source',
    targetHandle: edge.targetHandle ?? 'top-target',
  }))
}

export function stripContainerInternalEdges(flow: ModelFlowData): ModelFlowData {
  if (!flow.nodes?.length || !flow.edges?.length) return flow
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]))
  const edges = flow.edges.filter((edge) => {
    const target = nodeById.get(edge.target)
    return !(target?.parentNode && edge.source === target.parentNode)
  })
  return edges.length === flow.edges.length ? flow : { ...flow, edges }
}

export function repairMissingFlowEdges(flow: ModelFlowData): ModelFlowData {
  if (!flow.nodes?.length) return flow
  return stripContainerInternalEdges({
    ...flow,
    edges: synthesizeHierarchyEdges(flow.nodes, flow.edges ?? []),
  })
}
