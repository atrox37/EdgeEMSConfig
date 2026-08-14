import type { Node } from '@vue-flow/core'

type TopologyNodeData = {
  topologyType?: string
  isContainer?: boolean
  productName?: string
  label?: string
}

function isContainerNode(node: Node) {
  const data = node.data as TopologyNodeData
  return node.type === 'group' && (
    data.topologyType === 'container'
    || data.isContainer === true
  )
}

export function topologyMiniMapColor(node: Node) {
  if (isContainerNode(node)) return '#e7f0fb'
  if (node.type === 'group') return '#fff0e9'
  return '#edf4ff'
}

export function topologyMiniMapStrokeColor(node: Node) {
  if (isContainerNode(node)) return '#1d5fbf'
  if (node.type === 'group') return '#f05a00'
  return '#2878ff'
}
