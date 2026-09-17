import type { Edge as FlowEdge } from '@vue-flow/core'

export function normalizeRuleFlowEdge(edge: FlowEdge): FlowEdge {
  const isActiveMonitorEdge = edge.class === 'active-edge' || edge.data?.isAnimating
  return {
    ...edge,
    type: 'deletable-smoothstep',
    style: isActiveMonitorEdge
      ? edge.style
      : {
          ...(edge.style ?? {}),
          stroke: '#B3CEFA',
          strokeWidth: 3,
        },
    markerEnd: undefined,
    markerStart: undefined,
  }
}

export function normalizeRuleFlowEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.map(normalizeRuleFlowEdge)
}
