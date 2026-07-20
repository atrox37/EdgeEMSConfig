import type { ModelFlowData, ModelFlowNode, ModelInstanceBinding } from '@/types/visualModeling'
import type { NodeChannelBinding } from '@/types/stationTopology'

function bindingMap(bindings: NodeChannelBinding[]): Map<string, NodeChannelBinding> {
  return new Map(bindings.map((item) => [item.nodeId, item]))
}

function mergeInstanceChannels(
  instances: ModelInstanceBinding[],
  bindingInstances: NodeChannelBinding['instances'],
): ModelInstanceBinding[] {
  if (!instances.length) return instances
  const byId = new Map(bindingInstances.map((item) => [item.instanceId, item]))
  return instances.map((inst) => {
    const live = byId.get(inst.instanceId)
    if (!live?.channelIds?.length) return inst
    return {
      ...inst,
      instanceName: live.instanceName || inst.instanceName,
      channelIds: [...live.channelIds],
    }
  })
}

/** 用 channel-bindings 实时数据 enrich flow_json（保存前调用） */
export function enrichFlowWithLiveChannelBindings(
  flow: ModelFlowData,
  bindings: NodeChannelBinding[],
): ModelFlowData {
  if (!bindings.length || !flow.nodes?.length) return flow
  const map = bindingMap(bindings)
  const nodes = flow.nodes.map((node) => {
    const binding = map.get(node.id)
    if (!binding?.instances?.length) return node
    const instances = mergeInstanceChannels(
      node.data.instances ?? [],
      binding.instances,
    )
    return {
      ...node,
      data: {
        ...node.data,
        instances,
        instanceId: instances[0]?.instanceId,
        instanceName: instances[0]?.instanceName,
      },
    } as ModelFlowNode
  })
  return { ...flow, nodes }
}

export function lookupLiveChannels(
  bindings: NodeChannelBinding[],
  nodeId: string,
  instanceId: number,
): number[] {
  const nodeBinding = bindings.find((item) => item.nodeId === nodeId)
  const inst = nodeBinding?.instances.find((item) => item.instanceId === instanceId)
  return inst?.channelIds ? [...inst.channelIds] : []
}
