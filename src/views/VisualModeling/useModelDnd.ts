import { useVueFlow, type Node as FlowNode } from '@vue-flow/core'
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ModelNodeTemplate } from '@/types/visualModeling'
import { isContainerProduct } from '@/constants/deviceProducts'
import { canPlaceInContainer } from '@/utils/modelFlowRules'
import { getProductInstanceImageUrl } from '@/utils/productInstanceImages'
import {
  evaluateContainerDropTarget,
  findContainerAtPosition,
  type ContainerDropStatus,
} from '@/utils/containerDropTarget'

let nodeCounter = 0
function genId() {
  return `vm_node_${Date.now()}_${nodeCounter++}`
}

function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  return parseFloat(val) || fallback
}

const state = {
  draggedTemplate: ref<ModelNodeTemplate | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false),
  dropTargetContainerId: ref<string | null>(null),
  dropTargetStatus: ref<ContainerDropStatus | null>(null),
}

export function clearDropTargetHighlight() {
  state.dropTargetContainerId.value = null
  state.dropTargetStatus.value = null
}

export function updateDropTargetForProduct(
  productName: string,
  flowPosition: { x: number; y: number },
  nodes: FlowNode[],
) {
  const result = evaluateContainerDropTarget(productName, flowPosition, nodes)
  state.dropTargetContainerId.value = result.containerId
  state.dropTargetStatus.value = result.status
}

/**
 * 在已有节点中查找落点在其内部的合法容器（供 onDrop 和 nodeDragStop 复用）。
 * position 必须是 flow 绝对坐标。
 */
export function findContainerForNode(
  productName: string,
  position: { x: number; y: number },
  nodes: FlowNode[],
): { parentNodeId: string; relativePosition: { x: number; y: number } } | null {
  const hit = findContainerAtPosition(position, nodes)
  if (!hit || !canPlaceInContainer(productName, hit.containerProduct)) return null
  const parent = nodes.find((n) => n.id === hit.parentNodeId)
  if (!parent) return null
  return {
    parentNodeId: hit.parentNodeId,
    relativePosition: { x: position.x - parent.position.x, y: position.y - parent.position.y },
  }
}

export default function useModelDnd() {
  const { draggedTemplate, isDragOver, isDragging } = state
  const { addNodes, screenToFlowCoordinate, onNodesInitialized, updateNode, getNodes } =
    useVueFlow()

  watch(isDragging, (dragging) => {
    document.body.style.userSelect = dragging ? 'none' : ''
  })

  function onDragStart(event: DragEvent, template: ModelNodeTemplate) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/model-node', JSON.stringify(template))
      event.dataTransfer.effectAllowed = 'move'
    }
    draggedTemplate.value = template
    isDragging.value = true
    document.addEventListener('drop', onDragEnd)
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    const template = draggedTemplate.value
    if (template) {
      isDragOver.value = true
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      const productName = template.productName || ''
      if (productName && template.type !== 'group' && productName !== 'Station') {
        const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
        updateDropTargetForProduct(productName, position, getNodes.value)
      } else {
        clearDropTargetHighlight()
      }
    }
  }

  function onDragLeave() {
    isDragOver.value = false
    clearDropTargetHighlight()
  }

  function onDragEnd() {
    isDragging.value = false
    isDragOver.value = false
    draggedTemplate.value = null
    clearDropTargetHighlight()
    document.removeEventListener('drop', onDragEnd)
  }

  function findValidContainerParent(productName: string, position: { x: number; y: number }) {
    return findContainerForNode(productName, position, getNodes.value)
  }

  function onDrop(event: DragEvent) {
    const template = draggedTemplate.value
    if (!template) return

    const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const productName = template.productName || ''

    let templateType = template.type
    if (productName === 'Station') templateType = 'station'
    else if (template.type === 'group' || isContainerProduct(productName)) templateType = 'group'

    const isGroup = templateType === 'group'
    const isStation = templateType === 'station'

    if (isStation || isGroup) {
      const insideGroup = getNodes.value.some((node) => {
        if (node.type !== 'group') return false
        const style = node.style as Record<string, string | number> | undefined
        const gw = parsePx(style?.width, (node.data as { width?: number })?.width || 280)
        const gh = parsePx(style?.height, (node.data as { height?: number })?.height || 180)
        const nx = node.position.x
        const ny = node.position.y
        return (
          position.x > nx &&
          position.x < nx + gw &&
          position.y > ny &&
          position.y < ny + gh
        )
      })
      if (insideGroup) {
        ElMessage.warning('Station and container nodes must be placed on the top level')
        onDragEnd()
        return
      }
    }

    let parentNodeId: string | undefined
    let relativePosition = { ...position }

    // 任何设备节点均可自由放置到画布上（容器为可选，非强制）
    // 若拖放位置恰好落在合适容器内，则自动归入该容器
    if (!isGroup && !isStation) {
      const containerHit = findValidContainerParent(productName, position)
      if (containerHit) {
        parentNodeId = containerHit.parentNodeId
        relativePosition = containerHit.relativePosition
      }
    }

    const id = genId()
    const defaultW = 380
    const defaultH = 260
    const imageUrl =
      template.imageUrl || getProductInstanceImageUrl(productName) || undefined

    const newNode: any = {
      id,
      type: templateType,
      position: relativePosition,
      data: {
        label: template.label,
        description: template.description || '',
        productName,
        parentName: template.parentName || '',
        imageUrl,
        isContainer: isGroup,
        topologyType: template.topologyType ?? (isGroup ? 'container' : 'standalone'),
        instances: template.instances?.length
          ? template.instances.map((item) => ({ ...item }))
          : template.instanceId
            ? [{
                instanceId: template.instanceId,
                instanceName: template.instanceName || '',
                productName,
              }]
            : [],
        ...(isGroup ? { width: defaultW, height: defaultH } : {}),
      },
      ...(isGroup
        ? {
            style: { width: `${defaultW}px`, height: `${defaultH}px` },
            zIndex: 0,
          }
        : {}),
      ...(parentNodeId
        ? { parentNode: parentNodeId }
        : {}),
    }

    if (!isGroup && !isStation) {
      const { off } = onNodesInitialized(() => {
        updateNode(id, (node) => ({
          position: {
            x: node.position.x - node.dimensions.width / 2,
            y: node.position.y - node.dimensions.height / 2,
          },
        }))
        off()
      })
    }

    addNodes(newNode)
    onDragEnd()
  }

  return {
    isDragOver,
    isDragging,
    dropTargetContainerId: state.dropTargetContainerId,
    dropTargetStatus: state.dropTargetStatus,
    onDragStart,
    onDragLeave,
    onDragOver,
    onDrop,
    findValidContainerParent,
    clearDropTargetHighlight,
    updateDropTargetForProduct,
  }
}
