import type { ModelNodeData, ModelInstanceBinding } from '@/types/visualModeling'

/** 将旧版单实例字段迁移为 instances 数组 */
function toInstanceId(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function normalizeNodeInstances(data: ModelNodeData): ModelInstanceBinding[] {
  if (Array.isArray(data.instances) && data.instances.length) {
    return data.instances
      .map((item) => ({
        instanceId: toInstanceId(item.instanceId),
        instanceName: item.instanceName ?? '',
        productName: item.productName ?? data.productName,
      }))
      .filter((item) => item.instanceId > 0)
  }
  if (data.instanceId) {
    const instanceId = toInstanceId(data.instanceId)
    if (!instanceId) return []
    return [{
      instanceId,
      instanceName: data.instanceName ?? '',
      productName: data.productName,
    }]
  }
  return []
}

export function normalizeNodeData(data: ModelNodeData): ModelNodeData {
  const instances = normalizeNodeInstances(data)
  return {
    ...data,
    instances,
    instanceId: instances[0]?.instanceId,
    instanceName: instances[0]?.instanceName,
  }
}

export function instanceIds(data: ModelNodeData): number[] {
  return normalizeNodeInstances(data).map((i) => i.instanceId)
}
