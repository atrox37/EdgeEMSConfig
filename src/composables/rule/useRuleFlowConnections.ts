import type { Connection, Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import { normalizeRuleFlowEdge } from '@/utils/ruleFlowEdges'

interface UseRuleFlowConnectionsOptions {
  toObject: () => { nodes: FlowNode[]; edges: FlowEdge[] }
  updateNode: (id: string, nodeUpdate: Partial<FlowNode>) => void
  addEdges: (edges: FlowEdge | FlowEdge[]) => void
  removeEdges: (ids: string[]) => void
  onHasChanges: () => void
  onSnapshot: () => void
}

export function ensureStartEndNodesUndeletable(nodes: FlowNode[]) {
  return nodes.map((node) => {
    if (node.id === 'start' || node.id === 'end') {
      return {
        ...node,
        deletable: false,
      }
    }
    return node
  })
}

export function useRuleFlowConnections(options: UseRuleFlowConnectionsOptions) {
  function pruneInvalidIncomingEdges(targetNodeId: string) {
    const obj = options.toObject()
    const allEdges = obj.edges || []
    const allNodes = obj.nodes || []
    const incoming = allEdges.filter((edge) => edge.source === targetNodeId)
    const removeIds: string[] = []

    for (const edge of incoming) {
      const sourceNode = allNodes.find((node) => node.id === edge.source)
      if (!sourceNode) continue
      if (sourceNode.data?.type === 'function-switch') {
        const wires = sourceNode.data?.config?.wires
        const keys = wires && typeof wires === 'object' ? Object.keys(wires) : []
        const allowed = new Set<string>([...keys, ...keys.map((key) => `right${key}`)])
        if (!allowed.has(edge.sourceHandle || '')) {
          removeIds.push(String(edge.id))
        }
      }
    }

    if (removeIds.length) {
      options.removeEdges(removeIds)
      options.onHasChanges()
    }
  }

  function handleConnect(connection: Connection) {
    const newEdge = normalizeRuleFlowEdge({
      id: `edge-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle || 'right',
      targetHandle: connection.targetHandle || 'left',
    })

    const allNodes = options.toObject().nodes || []
    const sourceNode = allNodes.find((node) => node.id === newEdge.source)
    const key =
      sourceNode?.data?.type === 'function-switch' ? newEdge.sourceHandle || '' : 'default'
    if (sourceNode) {
      if (!sourceNode.data.config) sourceNode.data.config = {}
      if (!sourceNode.data.config.wires || typeof sourceNode.data.config.wires !== 'object') {
        sourceNode.data.config.wires = {}
      }
      const wires = sourceNode.data.config.wires as Record<string, string[]>
      const wireKey = key || 'default'
      if (!Array.isArray(wires[wireKey])) wires[wireKey] = []
      if (!wires[wireKey].includes(newEdge.target)) {
        wires[wireKey].push(newEdge.target)
      }
      options.updateNode(sourceNode.id, {
        data: {
          ...sourceNode.data,
        },
      })
    }
    options.onHasChanges()
    options.addEdges(newEdge)
    options.onSnapshot()
  }

  return {
    handleConnect,
    pruneInvalidIncomingEdges,
  }
}
