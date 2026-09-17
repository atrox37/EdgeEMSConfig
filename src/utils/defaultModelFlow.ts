import type { ModelFlowData, ModelFlowEdge, ModelFlowNode } from '@/types/visualModeling'
import { toSourceHandle, toTargetHandle } from '@/utils/modelFlowRules'

let flowEdgeIdSeq = 0

export function createFlowEdgeId(): string {
  flowEdgeIdSeq += 1
  return `edge-${Date.now() + flowEdgeIdSeq}`
}

/** A new topology starts empty; products and relations are supplied by the API. */
export function createDefaultModelFlow(): ModelFlowData {
  return {
    nodes: [],
    edges: [],
    fixedBindings: {
      stationInstanceId: null,
      environmentInstanceId: null,
    },
  }
}

export function isEmptyFlow(flow: ModelFlowData) {
  return !flow.nodes.length && !flow.edges.length
}

/** Retains stored edges whose endpoints still exist and normalizes handles. */
export function synthesizeHierarchyEdges(
  nodes: ModelFlowNode[],
  existingEdges: ModelFlowEdge[] = [],
): ModelFlowEdge[] {
  const nodeIds = new Set(nodes.map((node) => node.id))
  return existingEdges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      type: 'deletable-smoothstep',
      sourceHandle: toSourceHandle(edge.sourceHandle),
      targetHandle: toTargetHandle(edge.targetHandle),
    }))
}

export function repairMissingFlowEdges(flow: ModelFlowData): ModelFlowData {
  if (!flow.nodes?.length) return flow
  return {
    ...flow,
    edges: synthesizeHierarchyEdges(flow.nodes, flow.edges ?? []),
  }
}
