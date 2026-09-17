import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'
import type { ModelNodeData } from '@/types/visualModeling'
import { getNodeConnectionRuleStates, type ProductConnectionRuleState } from '@/utils/modelFlowRules'
import { getNodeInstanceId } from '@/utils/visualModeling'

export type TopologyNodeStatusLevel = 'ok' | 'warning' | 'error'

export interface TopologyNodeStatus {
  level: TopologyNodeStatusLevel
  title: string
  messages: string[]
}

function bumpLevel(current: TopologyNodeStatusLevel, next: TopologyNodeStatusLevel): TopologyNodeStatusLevel {
  if (next === 'error') return 'error'
  if (next === 'warning' && current !== 'error') return 'warning'
  return current
}

function resolveRuleLevel(state: ProductConnectionRuleState): TopologyNodeStatusLevel {
  if (state.max != null && state.count > state.max) return 'error'
  if (state.count < state.min) return state.min >= 1 ? 'warning' : 'ok'
  return 'ok'
}

export function getNodeTopologyStatus(
  node: FlowNode,
  nodes: FlowNode[],
  edges: Array<Pick<FlowEdge, 'source' | 'target'>>,
): TopologyNodeStatus | null {
  if (node.type !== 'product') return null

  const data = node.data as ModelNodeData
  const messages: string[] = []
  let level: TopologyNodeStatusLevel = 'ok'

  if (!getNodeInstanceId(data)) {
    messages.push('Instance binding is required.')
    level = bumpLevel(level, 'error')
  }

  const productNodes = nodes.filter((item) => item.type === 'product')
  if (productNodes.length > 1) {
    const connected = edges.some((edge) => edge.source === node.id || edge.target === node.id)
    if (!connected) {
      messages.push('Not connected to the topology.')
      level = bumpLevel(level, 'warning')
    }
  }

  for (const state of getNodeConnectionRuleStates(node, nodes, edges)) {
    const group = state.products.join(', ')
    const ruleLevel = resolveRuleLevel(state)

    if (ruleLevel === 'error') {
      messages.push(`${group}: exceeds maximum of ${state.max} (connected ${state.count}).`)
    } else if (ruleLevel === 'warning') {
      messages.push(`${group}: requires at least ${state.min} connection(s) (connected ${state.count}).`)
    }

    level = bumpLevel(level, ruleLevel)
  }

  const title = level === 'ok'
    ? 'Connections satisfied'
    : level === 'warning'
      ? 'Connection incomplete'
      : 'Connection error'

  return { level, title, messages }
}
