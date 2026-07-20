import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import { instanceIds, normalizeNodeInstances } from '@/utils/visualModeling'
import type { ModelNodeData } from '@/types/visualModeling'

export interface FlowSnapshot {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

function roundNum(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

function normalizeNodeForCompare(node: FlowNode) {
  const data = node.data as ModelNodeData
  const instances = normalizeNodeInstances(data).map((item) => ({
    instanceId: item.instanceId,
    instanceName: item.instanceName ?? '',
    productName: item.productName ?? '',
    channelIds: [...(item.channelIds ?? [])].sort((a, b) => a - b),
  }))

  const style = node.style as Record<string, string | number> | undefined
  const styleWidth = style?.width != null ? String(style.width) : undefined
  const styleHeight = style?.height != null ? String(style.height) : undefined

  return {
    id: node.id,
    type: node.type,
    parentNode: node.parentNode ?? null,
    position: {
      x: roundNum(node.position?.x),
      y: roundNum(node.position?.y),
    },
    data: {
      label: data.label ?? '',
      description: data.description ?? '',
      productName: data.productName ?? '',
      parentName: data.parentName ?? '',
      color: data.color ?? '',
      isContainer: !!(data as { isContainer?: boolean }).isContainer,
      width: data.width ?? null,
      height: data.height ?? null,
      instances,
    },
    style: {
      width: styleWidth ?? null,
      height: styleHeight ?? null,
    },
    zIndex: node.zIndex ?? null,
  }
}

function normalizeEdgeForCompare(edge: FlowEdge) {
  const data = (edge.data ?? {}) as Record<string, unknown>
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    label: edge.label != null ? String(edge.label) : null,
    type: edge.type ?? null,
    animated: edge.animated ?? null,
    edgeVariant: data.edgeVariant ?? null,
  }
}

function canonicalizeSnapshot(snapshot: FlowSnapshot) {
  const nodes = [...snapshot.nodes]
    .map(normalizeNodeForCompare)
    .sort((a, b) => a.id.localeCompare(b.id))
  const edges = [...snapshot.edges]
    .map(normalizeEdgeForCompare)
    .sort((a, b) => a.id.localeCompare(b.id))
  return { nodes, edges }
}

export function isFlowSnapshotEqual(a: FlowSnapshot, b: FlowSnapshot): boolean {
  const left = canonicalizeSnapshot(a)
  const right = canonicalizeSnapshot(b)
  return JSON.stringify(left) === JSON.stringify(right)
}

/** 仅比较拓扑语义（忽略坐标），用于可选场景 */
export function isFlowTopologyEqual(a: FlowSnapshot, b: FlowSnapshot): boolean {
  const stripPos = (snapshot: FlowSnapshot) => {
    const canon = canonicalizeSnapshot(snapshot)
    return {
      nodes: canon.nodes.map((node) => {
        const { position: _p, ...rest } = node
        return rest
      }),
      edges: canon.edges,
    }
  }
  return JSON.stringify(stripPos(a)) === JSON.stringify(stripPos(b))
}

export function nodeHasBoundInstance(node: FlowNode): boolean {
  return instanceIds(node.data as ModelNodeData).length > 0
}
