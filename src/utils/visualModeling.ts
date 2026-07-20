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

/** 收集某父节点下所有子节点 id（递归） */
export function collectChildNodeIds(parentId: string, nodes: { id: string; parentNode?: string }[]): string[] {
  const result: string[] = []
  for (const node of nodes) {
    if (node.parentNode === parentId) {
      result.push(node.id, ...collectChildNodeIds(node.id, nodes))
    }
  }
  return result
}

/** 删除节点时需一并移除的 id（含自身与子节点） */
export function collectNodesToDelete(rootId: string, nodes: { id: string; parentNode?: string }[]): string[] {
  return [rootId, ...collectChildNodeIds(rootId, nodes)]
}

/** 收集画布上已绑定的实例 id */
export function collectBoundInstanceIds(
  nodes: { id?: string; data?: ModelNodeData }[],
  excludeNodeId?: string,
): Set<number> {
  const ids = new Set<number>()
  for (const node of nodes) {
    if (excludeNodeId && node.id === excludeNodeId) continue
    for (const id of instanceIds(node.data ?? ({} as ModelNodeData))) {
      ids.add(id)
    }
  }
  return ids
}
