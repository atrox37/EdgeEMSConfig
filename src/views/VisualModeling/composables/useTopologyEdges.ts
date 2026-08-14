import type { Edge, Node } from '@vue-flow/core'
import {
  canConnectNodes,
  correctEdgeDirection,
  toSourceHandle,
  toTargetHandle,
} from '@/utils/modelFlowRules'

export type EdgeVariantKey = 'hierarchy' | 'association' | 'dataflow'

interface EdgeVariantDef {
  value: EdgeVariantKey
  animated: boolean
}

const EDGE_VARIANTS: EdgeVariantDef[] = [
  { value: 'hierarchy', animated: false },
  { value: 'association', animated: false },
  { value: 'dataflow', animated: true },
]

export function buildTopologyEdgeStyle(
  variant: EdgeVariantKey,
  options?: { dataFlowActive?: boolean },
): Partial<Edge> {
  const def = EDGE_VARIANTS.find((item) => item.value === variant) ?? EDGE_VARIANTS[0]
  const animated = variant === 'dataflow' ? (options?.dataFlowActive ?? true) : def.animated
  return {
    type: 'deletable-smoothstep',
    animated,
    zIndex: 1001,
    style: { stroke: '#B3CEFA', strokeWidth: 3 },
    data: { edgeVariant: variant, dataFlowActive: variant === 'dataflow' ? animated : undefined },
  }
}

export function normalizeTopologyEdges(raw: Edge[], nodes: Node[]): Edge[] {
  return raw
    .filter((edge) => Boolean(edge?.id && edge?.source && edge?.target))
    .filter((edge) => {
      if (!nodes.length) return true
      const source = nodes.find((node) => node.id === edge.source)
      const target = nodes.find((node) => node.id === edge.target)
      return canConnectNodes(source, target) || canConnectNodes(target, source)
    })
    .map((edge) => {
      const corrected = nodes.length ? correctEdgeDirection({ ...edge }, nodes) : edge
      let variant = corrected.data?.edgeVariant as EdgeVariantKey | 'classification' | undefined
      if (variant === 'classification' || !variant) variant = 'hierarchy'
      const isDataflow = variant === 'dataflow'
      const flowActive = isDataflow ? corrected.animated !== false : undefined
      const styled = buildTopologyEdgeStyle(variant, isDataflow ? { dataFlowActive: flowActive } : undefined)
      return {
        id: corrected.id,
        source: corrected.source,
        target: corrected.target,
        sourceHandle: toSourceHandle(corrected.sourceHandle),
        targetHandle: toTargetHandle(corrected.targetHandle),
        type: 'deletable-smoothstep',
        animated: isDataflow ? flowActive : (corrected.animated ?? styled.animated),
        zIndex: corrected.zIndex ?? styled.zIndex,
        style: { ...(corrected.style ?? {}), stroke: '#B3CEFA', strokeWidth: 3 },
        markerEnd: undefined,
        markerStart: undefined,
        data: { ...styled.data, ...corrected.data, edgeVariant: variant },
      } as Edge
    })
}
