import type { Edge, Node } from '@vue-flow/core'
import {
  correctEdgeDirection,
  toSourceHandle,
  toTargetHandle,
} from '@/utils/modelFlowRules'

export function normalizeTopologyEdges(raw: Edge[], nodes: Node[]): Edge[] {
  return raw
    .filter((edge) => Boolean(edge?.id && edge?.source && edge?.target))
    .map((edge) => {
      const corrected = nodes.length ? correctEdgeDirection({ ...edge }, nodes) : edge
      return {
        id: corrected.id,
        source: corrected.source,
        target: corrected.target,
        sourceHandle: toSourceHandle(corrected.sourceHandle),
        targetHandle: toTargetHandle(corrected.targetHandle),
        type: 'deletable-smoothstep',
        animated: corrected.animated ?? false,
        zIndex: corrected.zIndex ?? 1001,
        style: { ...(corrected.style ?? {}), stroke: '#B3CEFA', strokeWidth: 3 },
        markerEnd: undefined,
        markerStart: undefined,
      } as Edge
    })
}
