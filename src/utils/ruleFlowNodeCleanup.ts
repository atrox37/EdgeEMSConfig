import type { Node as FlowNode } from '@vue-flow/core'

type WireMap = Record<string, string[]>

function getWires(node: FlowNode): WireMap | null {
  const wires = (node.data as { config?: { wires?: WireMap } } | undefined)?.config?.wires
  return wires && typeof wires === 'object' ? wires : null
}

/** Remove a deleted node id from every remaining node's wires map. */
export function stripNodeIdFromAllWires(nodes: FlowNode[], removedNodeId: string): FlowNode[] {
  return nodes.map((node) => {
    if (node.id === removedNodeId) return node
    const wires = getWires(node)
    if (!wires) return node

    let changed = false
    const nextWires: WireMap = {}
    for (const [key, targets] of Object.entries(wires)) {
      if (!Array.isArray(targets)) {
        nextWires[key] = targets
        continue
      }
      const filtered = targets.filter((targetId) => targetId !== removedNodeId)
      if (filtered.length !== targets.length) changed = true
      nextWires[key] = filtered
    }
    if (!changed) return node

    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...(node.data as { config?: Record<string, unknown> }).config,
          wires: nextWires,
        },
      },
    }
  })
}

export function isProtectedRuleNodeId(nodeId: string) {
  return nodeId === 'start' || nodeId === 'end'
}
