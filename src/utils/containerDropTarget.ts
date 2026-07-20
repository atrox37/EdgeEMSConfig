import type { Node as FlowNode } from '@vue-flow/core'
import { canPlaceInContainer } from '@/utils/modelFlowRules'

export type ContainerDropStatus = 'valid' | 'invalid'

function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  return parseFloat(val) || fallback
}

/** 落点处的容器（不校验产品是否匹配） */
export function findContainerAtPosition(
  position: { x: number; y: number },
  nodes: FlowNode[],
): { parentNodeId: string; containerProduct: string } | null {
  const margin = 8
  const headerH = 44
  for (const node of nodes) {
    if (node.type !== 'group') continue
    const containerProduct = (node.data as { productName?: string })?.productName
    if (!containerProduct) continue
    const style = node.style as Record<string, string | number> | undefined
    const gw = parsePx(style?.width, (node.data as { width?: number })?.width || 280)
    const gh = parsePx(style?.height, (node.data as { height?: number })?.height || 180)
    const nx = node.position.x
    const ny = node.position.y
    if (
      position.x > nx + margin
      && position.x < nx + gw - margin
      && position.y > ny + headerH
      && position.y < ny + gh - margin
    ) {
      return { parentNodeId: node.id, containerProduct }
    }
  }
  return null
}

export function evaluateContainerDropTarget(
  productName: string,
  position: { x: number; y: number },
  nodes: FlowNode[],
): { containerId: string | null; status: ContainerDropStatus | null } {
  if (!productName) {
    return { containerId: null, status: null }
  }
  const hit = findContainerAtPosition(position, nodes)
  if (!hit) {
    return { containerId: null, status: null }
  }
  return {
    containerId: hit.parentNodeId,
    status: canPlaceInContainer(productName, hit.containerProduct) ? 'valid' : 'invalid',
  }
}
