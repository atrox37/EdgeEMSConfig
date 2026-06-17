import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'

const NODE_W = 220
const NODE_H = 80
const GAP_X = 140
const GAP_Y = 110
const ORIGIN_X = 80
const ORIGIN_Y = 80

/** 按 start → 下游 BFS 分层排列规则链节点 */
export function layoutRuleChain(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (!nodes.length) return nodes

  const outMap = new Map<string, string[]>()
  edges.forEach((e) => {
    const list = outMap.get(e.source) ?? []
    list.push(e.target)
    outMap.set(e.source, list)
  })

  const startNode = nodes.find((n) => n.id === 'start' || n.type === 'start')
  const startId = startNode?.id ?? nodes[0].id

  const layers: string[][] = []
  const visited = new Set<string>()
  let queue = [startId]

  while (queue.length) {
    const layer: string[] = []
    const nextQueue: string[] = []
    for (const id of queue) {
      if (visited.has(id)) continue
      visited.add(id)
      layer.push(id)
      for (const target of outMap.get(id) ?? []) {
        if (!visited.has(target)) nextQueue.push(target)
      }
    }
    if (layer.length) layers.push(layer)
    queue = nextQueue
  }

  nodes.forEach((n) => {
    if (!visited.has(n.id)) layers.push([n.id])
  })

  const positionMap = new Map<string, { x: number; y: number }>()
  layers.forEach((layer, layerIndex) => {
    layer.forEach((id, rowIndex) => {
      positionMap.set(id, {
        x: ORIGIN_X + layerIndex * (NODE_W + GAP_X),
        y: ORIGIN_Y + rowIndex * (NODE_H + GAP_Y),
      })
    })
  })

  return nodes.map((node) => ({
    ...node,
    position: positionMap.get(node.id) ?? node.position,
  }))
}
