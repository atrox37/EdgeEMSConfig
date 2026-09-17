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
