import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { ModelFlowNode, ModelNodeTemplate } from '@/types/visualModeling'
import useModelDnd from '../useModelDnd'

const canvas = vi.hoisted(() => ({ nodes: [] as ModelFlowNode[], warning: vi.fn() }))

vi.mock('element-plus', () => ({ ElMessage: { warning: canvas.warning } }))
vi.mock('@vue-flow/core', () => ({
  useVueFlow: () => ({
    getNodes: { get value() { return canvas.nodes } },
    addNodes: (node: ModelFlowNode) => canvas.nodes.push(node),
    screenToFlowCoordinate: () => ({ x: 0, y: 0 }),
    onNodesInitialized: () => ({ off: vi.fn() }),
    updateNode: vi.fn(),
  }),
}))

let wrapper: VueWrapper
let dnd: ReturnType<typeof useModelDnd>

function drop(productName: string) {
  dnd.onDragStart({} as DragEvent, {
    id: productName, type: 'product', label: productName, productName, description: '',
  } satisfies ModelNodeTemplate)
  dnd.onDrop({ clientX: 0, clientY: 0 } as DragEvent)
}

beforeEach(() => {
  canvas.nodes = []
  canvas.warning.mockClear()
  wrapper = mount(defineComponent({
    setup() {
      dnd = useModelDnd()
      return () => null
    },
  }))
})

afterEach(() => wrapper.unmount())

describe('Meter canvas limit', () => {
  it('allows the first Meter and blocks another before either is bound', () => {
    drop('Meter')
    drop('Meter')

    expect(canvas.nodes).toHaveLength(1)
    expect(canvas.nodes[0].data.instanceId).toBeNull()
    expect(canvas.warning).toHaveBeenCalledWith('Only one Meter device is allowed on the canvas.')
    expect(dnd.isDragging.value).toBe(false)
    expect(dnd.isDragOver.value).toBe(false)
  })

  it('allows a replacement Meter after deleting the existing one', () => {
    drop('Meter')
    canvas.nodes = []
    drop('Meter')

    expect(canvas.nodes).toHaveLength(1)
    expect(canvas.warning).not.toHaveBeenCalled()
  })

  it('does not limit other product nodes when a Meter exists', () => {
    drop('Meter')
    drop('PCS')
    drop('PCS')

    expect(canvas.nodes.map((node) => node.data.productName)).toEqual(['Meter', 'PCS', 'PCS'])
    expect(canvas.warning).not.toHaveBeenCalled()
  })
})
