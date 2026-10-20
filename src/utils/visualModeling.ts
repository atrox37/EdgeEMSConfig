import type { ModelNodeData } from '@/types/visualModeling'

export function getNodeInstanceId(data: ModelNodeData): number | null {
  if (data.instanceId === null || data.instanceId === undefined) return null
  const n = Number(data.instanceId)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function instanceIds(data: ModelNodeData): number[] {
  const instanceId = getNodeInstanceId(data)
  return instanceId === null ? [] : [instanceId]
}

/** 扁平拓扑：删除节点时仅移除自身及相关连线。 */
export function collectNodesToDelete(rootId: string): string[] {
  return [rootId]
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
