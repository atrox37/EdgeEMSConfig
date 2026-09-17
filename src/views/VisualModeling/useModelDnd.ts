import { useVueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import type { ModelNodeTemplate } from '@/types/visualModeling'

let nodeCounter = 0

function createNodeId() {
  return `vm_node_${Date.now()}_${nodeCounter++}`
}

const draggedTemplate = ref<ModelNodeTemplate | null>(null)
const isDragOver = ref(false)
const isDragging = ref(false)

export default function useModelDnd() {
  const { addNodes, screenToFlowCoordinate, onNodesInitialized, updateNode } = useVueFlow()

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
    if (!draggedTemplate.value) return
    isDragOver.value = true
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDragEnd() {
    draggedTemplate.value = null
    isDragOver.value = false
    isDragging.value = false
    document.removeEventListener('drop', onDragEnd)
  }

  function onDrop(event: DragEvent) {
    const template = draggedTemplate.value
    if (!template?.productName) return

    const id = createNodeId()
    const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
    const { off } = onNodesInitialized(() => {
      updateNode(id, (node) => ({
        position: {
          x: node.position.x - node.dimensions.width / 2,
          y: node.position.y - node.dimensions.height / 2,
        },
      }))
      off()
    })

    addNodes({
      id,
      type: 'product',
      position,
      data: {
        label: template.label,
        description: '',
        productName: template.productName,
        instanceId: null,
        imageUrl: template.imageUrl,
      },
    })
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
