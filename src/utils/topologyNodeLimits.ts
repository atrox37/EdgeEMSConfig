import type { ModelFlowNode } from '@/types/visualModeling'

export const MAX_METER_NODES = 1
export const METER_NODE_LIMIT_MESSAGE = 'Only one Meter device is allowed on the canvas.'

export function countMeterNodes(nodes: Pick<ModelFlowNode, 'data'>[]): number {
  return nodes.filter((node) => node.data.productName?.trim() === 'Meter').length
}
