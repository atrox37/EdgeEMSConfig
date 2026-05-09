import { useVueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import type { ModelNodeTemplate } from '@/types/visualModeling'

let nodeCounter = 0
function genId() {
  return `vm_node_${Date.now()}_${nodeCounter++}`
}

// 解析 style.width / style.height（可能是 '280px' 或 280）
function parsePx(val: string | number | undefined, fallback: number): number {
  if (val === undefined || val === null) return fallback
  if (typeof val === 'number') return val
  return parseFloat(val) || fallback
}

const state = {
  draggedTemplate: ref<ModelNodeTemplate | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false),
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
    if (draggedTemplate.value) {
      isDragOver.value = true
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    }
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDragEnd() {
    isDragging.value = false
    isDragOver.value = false
    draggedTemplate.value = null
    document.removeEventListener('drop', onDragEnd)
  }

  function onDrop(event: DragEvent) {
    const template = draggedTemplate.value
    if (!template) return

    // 将屏幕坐标转为画布坐标
    const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const isGroup = template.type === 'group'

    // 如果拖入的不是 group，检测是否落在某个已有 group 节点内
    let parentNodeId: string | undefined
    let relativePosition = { ...position }

    if (!isGroup) {
      for (const node of getNodes.value) {
        if (node.type !== 'group') continue

        // 取 group 的实际显示宽高
        const gw = parsePx(node.style?.width as any, node.data?.width as number || 280)
        const gh = parsePx(node.style?.height as any, node.data?.height as number || 180)
        const nx = node.position.x
        const ny = node.position.y

        // 留出 header 高度（约 32px）和 8px 边距
        const headerH = 34
        const margin = 8
        if (
          position.x > nx + margin &&
          position.x < nx + gw - margin &&
          position.y > ny + headerH &&
          position.y < ny + gh - margin
        ) {
          parentNodeId = node.id
          // 子节点位置相对于父节点
          relativePosition = {
            x: position.x - nx,
            y: position.y - ny,
          }
          break
        }
      }
    }

    const id = genId()
    const defaultW = 380
    const defaultH = 260

    const newNode: any = {
      id,
      type: template.type,
      position: relativePosition,
      data: {
        label: template.label,
        description: template.description || '',
        productName: template.productName || '',
        instanceId: template.instanceId,
        instanceName: template.instanceName || '',
        color: template.color || 'default',
        icon: template.icon || 'i-tabler-device-desktop-analytics',
        ...(isGroup ? { width: defaultW, height: defaultH } : {}),
      },
      // group 节点需要设置 style.width/height，VueFlow 才能正确计算子节点布局
      // zIndex 不设为 -1（会导致无法点击），由 VueFlow 自动处理父子层叠
      ...(isGroup
        ? {
            style: { width: `${defaultW}px`, height: `${defaultH}px` },
            zIndex: 0,
          }
        : {}),
      // 子节点绑定到 group
      ...(parentNodeId
        ? { parentNode: parentNodeId, extent: 'parent' as const }
        : {}),
    }

    // 节点渲染完成后，将其居中对齐到鼠标位置（group 节点不做此处理）
    if (!isGroup) {
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
    onDragStart,
    onDragLeave,
    onDragOver,
    onDrop,
  }
}
