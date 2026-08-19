import type { Edge, Node } from '@vue-flow/core'
import type { ModelFlowData, ModelInstanceBinding } from '@/types/visualModeling'
import { createPersistedTopologyFlow } from '@/utils/topologyNormalize'

type PersistenceOptions = {
  toObject: () => { nodes?: Node[]; edges?: Edge[] }
  getNodes: () => Node[]
  getEdges: () => Edge[]
  normalizeEdges: (edges: Edge[], nodes?: Node[]) => Edge[]
  setEdges: (edges: Edge[]) => void
  updateEdges: (edges: Edge[]) => void
  fixedBindings: () => { station: ModelInstanceBinding | null; environment: ModelInstanceBinding | null }
  saveFlow: (flow: ModelFlowData) => Promise<boolean>
}

export function useTopologyPersistence(options: PersistenceOptions) {
  async function syncEdgesFromFlow() {
    const latest = options.toObject().edges ?? []
    const normalized = options.normalizeEdges(
      JSON.parse(JSON.stringify(latest)) as Edge[],
      options.getNodes(),
    )
    options.updateEdges(normalized)
    options.setEdges(normalized)
  }

  function exportCurrentFlow(): ModelFlowData {
    const flowObject = options.toObject()
    const flowNodes = JSON.parse(JSON.stringify(options.getNodes())) as Node[]
    let flowEdges = options.getEdges()
    const objectEdges = flowObject.edges ?? []
    if (objectEdges.length > flowEdges.length) {
      flowEdges = JSON.parse(JSON.stringify(objectEdges)) as Edge[]
    }
    return createPersistedTopologyFlow({
      nodes: flowNodes as ModelFlowData['nodes'],
      edges: flowEdges as ModelFlowData['edges'],
      fixedBindings: options.fixedBindings(),
    })
  }

  async function persistFlow() {
    await syncEdgesFromFlow()
    return options.saveFlow(exportCurrentFlow())
  }

  return { syncEdgesFromFlow, exportCurrentFlow, persistFlow }
}
