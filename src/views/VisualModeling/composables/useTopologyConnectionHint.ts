import { computed, type InjectionKey, type Ref } from 'vue'
import {
  ConnectionLineType,
  type ConnectionStatus,
  type Edge as FlowEdge,
  type Node as FlowNode,
  useVueFlow,
} from '@vue-flow/core'
import { canPreviewNodePair, getConnectionRuleHint } from '@/utils/modelFlowRules'

export interface UseTopologyConnectionHintOptions {
  getFlowNodes: () => FlowNode[]
  getFlowEdges: () => FlowEdge[]
  isViewMode: Ref<boolean>
}

export function useTopologyConnectionHint(options: UseTopologyConnectionHintOptions) {
  const {
    connectionStartHandle,
    connectionEndHandle,
    connectionPosition,
    viewport,
  } = useVueFlow()

  /** Drag feedback only — do not wire to Vue Flow `is-valid-connection` (it filters persisted edges on load). */
  const connectionStatus = computed<ConnectionStatus | null>(() => {
    if (options.isViewMode.value || !connectionStartHandle.value || !connectionEndHandle.value) {
      return null
    }

    const nodes = options.getFlowNodes()
    const edges = options.getFlowEdges()
    const fromNode = nodes.find((node) => node.id === connectionStartHandle.value?.nodeId)
    const toNode = nodes.find((node) => node.id === connectionEndHandle.value?.nodeId)
    if (!fromNode || !toNode || fromNode.id === toNode.id) return 'invalid'

    return canPreviewNodePair(fromNode, toNode, nodes, edges) ? 'valid' : 'invalid'
  })

  const connectionLineOptions = computed(() => ({
    type: ConnectionLineType.SmoothStep,
    style: {
      stroke: connectionStatus.value === 'invalid'
        ? '#F04438'
        : connectionStatus.value === 'valid'
          ? '#12B76A'
          : '#035DEF',
      strokeWidth: 1.5,
    },
  }))

  const hintMessage = computed(() => {
    if (options.isViewMode.value || !connectionStartHandle.value) return ''

    const nodes = options.getFlowNodes()
    const edges = options.getFlowEdges()
    const fromNode = nodes.find((node) => node.id === connectionStartHandle.value?.nodeId)
    if (!fromNode) return ''

    const toNodeId = connectionEndHandle.value?.nodeId
    if (!toNodeId) return 'Drag to a compatible device handle.'

    const toNode = nodes.find((node) => node.id === toNodeId)
    if (!toNode) return ''

    if (fromNode.id === toNode.id) return 'Cannot connect to the same node.'

    const ruleHint = getConnectionRuleHint(fromNode, toNode, edges, nodes)
    if (ruleHint) return ruleHint
    if (connectionStatus.value === 'valid') return 'Release to connect.'
    return ''
  })

  const hintTone = computed<'valid' | 'invalid' | 'neutral'>(() => {
    if (connectionStatus.value === 'valid') return 'valid'
    if (connectionStatus.value === 'invalid') return 'invalid'
    return 'neutral'
  })

  const hintVisible = computed(
    () => !options.isViewMode.value && !!connectionStartHandle.value && !!hintMessage.value,
  )

  const hintStyle = computed(() => {
    const position = connectionPosition.value
    const { x: vx, y: vy, zoom } = viewport.value
    return {
      left: `${position.x * zoom + vx}px`,
      top: `${position.y * zoom + vy - 12}px`,
      transform: 'translate(-50%, -100%)',
    }
  })

  return {
    connectionStatus,
    connectionLineOptions,
    hintMessage,
    hintTone,
    hintVisible,
    hintStyle,
  }
}

export type TopologyConnectionHintContext = ReturnType<typeof useTopologyConnectionHint>

export const TOPOLOGY_CONNECTION_HINT_KEY: InjectionKey<TopologyConnectionHintContext> = Symbol(
  'topologyConnectionHint',
)
