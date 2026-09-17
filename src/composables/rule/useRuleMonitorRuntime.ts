import { ref, nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getCurrentFontSize } from '@/utils/responsive'
import wsManager from '@/utils/websocket'
import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'

interface RuleChainStoreMonitorApi {
  isFullscreen: boolean
  updateMonitorNodes: (nodes: FlowNode[]) => void
  updateMonitorEdges: (edges: FlowEdge[]) => void
}

interface UseRuleMonitorRuntimeOptions {
  currentChainId: Ref<string>
  isMonitorMode: Ref<boolean>
  centerPanelRef: Ref<HTMLElement | null>
  edges: Ref<FlowEdge[]>
  ruleChainStore: RuleChainStoreMonitorApi
  findNode: (id: string) => FlowNode | undefined
  viewport: Ref<{ zoom?: number; x?: number; y?: number } | undefined>
  setNodes: (payload: FlowNode[] | ((nodes: FlowNode[]) => FlowNode[])) => void
  setEdges: (payload: FlowEdge[] | ((edges: FlowEdge[]) => FlowEdge[])) => void
  toObject: () => { nodes: FlowNode[]; edges: FlowEdge[] }
}

function isCompositeVariable(varDef: { type?: string }) {
  const type = String(varDef?.type || '')
    .trim()
    .toLowerCase()
  return type === 'combined' || type === 'composite' || type === 'object' || type === 'array'
}

function normalizeRuleRuntimePayload(rawData: unknown): {
  ruleId: number | null
  executionNodeIds: string[]
  nodeVariables: Map<string, Record<string, number>>
} | null {
  if (!rawData || typeof rawData !== 'object') return null

  const runtime = (rawData as { last_execution?: unknown }).last_execution
  if (!runtime || typeof runtime !== 'object') return null
  const ruleIdRaw = (rawData as { rule_id?: unknown }).rule_id
  const ruleId = typeof ruleIdRaw === 'number' ? ruleIdRaw : Number(ruleIdRaw) || null

  const executionPath = Array.isArray((runtime as { execution_path?: unknown }).execution_path)
    ? (runtime as { execution_path: unknown[] }).execution_path
    : []
  const executionNodeIds: string[] = []
  const nodeVariables = new Map<string, Record<string, number>>()

  executionPath.forEach((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const nodeId = String(item)
      if (nodeId && nodeId !== 'undefined' && nodeId !== 'null') {
        executionNodeIds.push(nodeId)
      }
    }
  })

  const nodeDetails = (runtime as { node_details?: Record<string, unknown> }).node_details
  if (nodeDetails && typeof nodeDetails === 'object') {
    Object.entries(nodeDetails).forEach(([nodeId, detail]) => {
      if (!nodeId || nodeId === 'start' || nodeId === 'end') return
      const inputValues = (detail as { input_values?: Record<string, number> })?.input_values
      if (inputValues && typeof inputValues === 'object' && Object.keys(inputValues).length > 0) {
        nodeVariables.set(nodeId, inputValues)
      }
    })
  }

  return {
    ruleId,
    executionNodeIds,
    nodeVariables,
  }
}

export function useRuleMonitorRuntime(options: UseRuleMonitorRuntimeOptions) {
  const subscriptionId = ref('')
  const visibleVarsNodes = ref<Set<string>>(new Set())
  const lastActiveNodeIds = ref<Set<string>>(new Set())
  const nodeVarsPositions = ref<Map<string, { top: number; left: number }>>(new Map())
  const nodeVariablesData = ref<Map<string, Record<string, number>>>(new Map())

  let simTimer: ReturnType<typeof setInterval> | null = null

  function formatNodeVarValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return '-'
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value.toFixed(3)).toString()
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return '-'
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        const asNum = Number(trimmed)
        if (Number.isFinite(asNum)) {
          return Number(asNum.toFixed(3)).toString()
        }
      }
      return value
    }
    return String(value)
  }

  function getNodeVarsData(nodeId: string) {
    const node = options.findNode(nodeId)
    if (!node || node.type === 'start' || node.type === 'end') return null

    const varDefinitions = Array.isArray(node.data?.config?.variables)
      ? node.data.config.variables.filter(
          (varDef: { type?: string }) => !isCompositeVariable(varDef),
        )
      : []

    const realtimeVars = nodeVariablesData.value.get(nodeId)
    if (realtimeVars) {
      return varDefinitions.map((varDef: { name?: string; point?: string }) => {
        const varName = varDef.name || varDef.point || ''
        const value = realtimeVars[varName] !== undefined ? realtimeVars[varName] : undefined
        return {
          ...varDef,
          value,
        }
      })
    }

    return varDefinitions
  }

  function updateBubblePosition(nodeId: string) {
    const node = options.findNode(nodeId)
    if (!node || !options.centerPanelRef.value) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return
    }

    try {
      let nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement | null
      if (!nodeElement) {
        nodeElement = document.querySelector(
          `.vue-flow__node[data-id="${nodeId}"]`,
        ) as HTMLElement | null
      }

      if (!nodeElement) {
        visibleVarsNodes.value.delete(nodeId)
        nodeVarsPositions.value.delete(nodeId)
        return
      }

      const nodeRect = nodeElement.getBoundingClientRect()
      if (nodeRect.width === 0 || nodeRect.height === 0) {
        visibleVarsNodes.value.delete(nodeId)
        nodeVarsPositions.value.delete(nodeId)
        return
      }

      const containerRect = options.centerPanelRef.value.getBoundingClientRect()
      const isFullscreen = options.ruleChainStore.isFullscreen
      const headerHeight = isFullscreen ? 0.6 * getCurrentFontSize() : 0

      const maxLeft = isFullscreen ? window.innerWidth : containerRect.right
      const maxTop = isFullscreen ? window.innerHeight - headerHeight : containerRect.bottom
      const minLeft = isFullscreen ? 0 : containerRect.left
      const minTop = isFullscreen ? containerRect.top : containerRect.top

      if (
        nodeRect.right < minLeft ||
        nodeRect.left > maxLeft ||
        nodeRect.bottom < minTop ||
        nodeRect.top > maxTop
      ) {
        visibleVarsNodes.value.delete(nodeId)
        nodeVarsPositions.value.delete(nodeId)
        return
      }

      nodeVarsPositions.value.set(nodeId, {
        top: nodeRect.bottom,
        left: nodeRect.left,
      })
    } catch {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
    }
  }

  function getBubbleStyle(nodeId: string): Record<string, string> {
    const position = nodeVarsPositions.value.get(nodeId)
    if (!position || !options.centerPanelRef.value) return { display: 'none' }

    const node = options.findNode(nodeId)
    if (!node) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return { display: 'none' }
    }

    const currentZoom = options.viewport.value?.zoom || 1
    const scale = currentZoom
    const bubbleWidth = 2.5 * getCurrentFontSize() * scale
    const bubbleHeight = 3 * getCurrentFontSize() * scale

    let left = position.left
    let top = position.top

    const containerRect = options.centerPanelRef.value.getBoundingClientRect()
    const isFullscreen = options.ruleChainStore.isFullscreen
    const headerHeight = isFullscreen ? 0.6 * getCurrentFontSize() : 0
    const maxLeft = isFullscreen ? window.innerWidth : containerRect.right
    const maxTop = isFullscreen ? window.innerHeight - headerHeight : containerRect.bottom
    const minLeft = isFullscreen ? 0 : containerRect.left
    const minTop = isFullscreen ? containerRect.top : containerRect.top

    if (left + bubbleWidth > maxLeft) {
      left = Math.max(minLeft, left)
    }
    if (left + bubbleWidth < minLeft) {
      left = minLeft + bubbleWidth
    }

    if (top > maxTop + bubbleHeight) {
      top = maxTop - bubbleHeight
    }
    if (top < minTop) {
      top = minTop
    }

    if (left < minLeft || left + bubbleWidth > maxLeft || top < minTop || top > maxTop) {
      visibleVarsNodes.value.delete(nodeId)
      nodeVarsPositions.value.delete(nodeId)
      return { display: 'none' }
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: '99999',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }
  }

  function updateAllBubblePositions() {
    visibleVarsNodes.value.forEach((nodeId) => {
      updateBubblePosition(nodeId)
    })
  }

  function clearSimulation() {
    if (simTimer) {
      clearInterval(simTimer)
      simTimer = null
    }
  }

  function resetRuntimeVisuals() {
    options.setEdges((prev) =>
      prev.map((edge) => ({
        ...edge,
        class: '',
        data: { ...(edge.data || {}), isAnimating: false },
      })),
    )
    options.setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        class: '',
        data: { ...(node.data || {}), status: '' },
      })),
    )
  }

  function applyActiveRuntime(activeNodeIds: string[]) {
    const activeNodes = new Set(activeNodeIds)
    const currentEdges = options.edges.value
    const activeEdges = currentEdges
      .filter((edge) => activeNodes.has(String(edge.source)) && activeNodes.has(String(edge.target)))
      .map((edge) => String(edge.id))
    const activeEdgeSet = new Set(activeEdges)

    options.setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        class: activeNodes.has(String(node.id)) ? 'active-node' : '',
      })),
    )
    options.setEdges((prev) =>
      prev.map((edge) => ({
        ...edge,
        class: activeEdgeSet.has(String(edge.id)) ? 'active-edge' : '',
        data: { ...(edge.data || {}), isAnimating: activeEdgeSet.has(String(edge.id)) },
      })),
    )

    if (options.isMonitorMode.value) {
      const flowObj = options.toObject()
      options.ruleChainStore.updateMonitorNodes(flowObj.nodes)
      options.ruleChainStore.updateMonitorEdges(flowObj.edges)
    }
  }

  function applyRuntimeUpdate(data: unknown) {
    const normalized = normalizeRuleRuntimePayload(data)
    if (!normalized) return

    const currentRuleId = Number(options.currentChainId.value)
    if (normalized.ruleId != null && currentRuleId && normalized.ruleId !== currentRuleId) return
    if (!normalized.executionNodeIds.length) return

    visibleVarsNodes.value = new Set(normalized.nodeVariables.keys())
    nodeVariablesData.value = normalized.nodeVariables

    const currentActiveSet = new Set<string>(normalized.executionNodeIds)
    const lastActiveSet = lastActiveNodeIds.value
    const hasChanged =
      currentActiveSet.size !== lastActiveSet.size ||
      !Array.from(currentActiveSet).every((id) => lastActiveSet.has(id))

    if (hasChanged) {
      lastActiveNodeIds.value = currentActiveSet
      applyActiveRuntime(normalized.executionNodeIds)
    }

    if (visibleVarsNodes.value.size > 0) {
      nextTick(() => {
        updateAllBubblePositions()
      })
    }
  }

  function startMonitorSubscription() {
    if (!options.isMonitorMode.value) return
    try {
      subscriptionId.value = wsManager.subscribe(
        {
          source: 'rule',
          channels: [Number(options.currentChainId.value)],
          interval: 1000,
        },
        {
          onBatchDataUpdate: (payload: unknown) => {
            try {
              applyRuntimeUpdate(payload)
            } catch (error) {
              console.error('[RuleChainEditor] 处理规则执行数据失败:', error)
              ElMessage.error('Failed to process rule execution update')
            }
          },
        } as Parameters<typeof wsManager.subscribe>[1],
      )
    } catch (error) {
      console.error('[RuleChainEditor] 订阅规则失败:', error)
      ElMessage.error('Failed to subscribe to rule updates')
    }
  }

  function stopMonitorSubscription() {
    try {
      wsManager.unsubscribe(subscriptionId.value)
    } catch {
      // ignore unsubscribe errors
    }
  }

  function startSimulation() {
    if (!options.isMonitorMode.value) return
    clearSimulation()
    resetRuntimeVisuals()
  }

  function clearMonitorOverlay() {
    visibleVarsNodes.value.clear()
    nodeVarsPositions.value.clear()
    nodeVariablesData.value.clear()
    lastActiveNodeIds.value.clear()
  }

  return {
    visibleVarsNodes,
    nodeVarsPositions,
    formatNodeVarValue,
    getNodeVarsData,
    getBubbleStyle,
    updateAllBubblePositions,
    startMonitorSubscription,
    stopMonitorSubscription,
    startSimulation,
    clearSimulation,
    resetRuntimeVisuals,
    clearMonitorOverlay,
  }
}
