import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Edge, Node } from '@vue-flow/core'
import {
  useVisualModelingEditLifecycle,
  type UseVisualModelingEditLifecycleOptions,
} from '../composables/useVisualModelingEditLifecycle'

vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }))
vi.mock('@/stores/visualModeling', () => ({ STATION_EDITOR_ID: 'station' }))

function createKeyboardHandler(isViewMode = false, selected: 'node' | 'edge' = 'node') {
  const nodes = ref<Node[]>([
    { id: 'node', position: { x: 0, y: 0 }, data: {}, selected: selected === 'node' },
  ])
  const edges = ref<Edge[]>([
    { id: 'edge', source: 'node', target: 'other', selected: selected === 'edge' },
  ])
  const removeSelectedElements = vi.fn(() => {
    nodes.value = []
    edges.value = []
  })
  const options = {
    isViewMode: ref(isViewMode),
    getNodes: nodes,
    getFlowEdges: () => edges.value,
    removeSelectedElements,
  } as unknown as UseVisualModelingEditLifecycleOptions
  const { onKeydown } = useVisualModelingEditLifecycle(options)
  const press = (key: string, target: HTMLElement = document.createElement('div')) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    target.addEventListener('keydown', onKeydown, { once: true })
    target.dispatchEvent(event)
    return event
  }
  return { nodes, edges, removeSelectedElements, press }
}

describe('Topology keyboard deletion', () => {
  it.each(['node', 'edge'] as const)('keeps the selected %s when pressing Backspace', (selected) => {
    const state = createKeyboardHandler(false, selected)
    const event = state.press('Backspace')

    expect(state.removeSelectedElements).not.toHaveBeenCalled()
    expect(state.nodes.value).toHaveLength(1)
    expect(state.edges.value).toHaveLength(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it.each([false, true])('allows Backspace in text fields when view mode is %s', (isViewMode) => {
    const state = createKeyboardHandler(isViewMode)
    for (const tag of ['input', 'textarea']) {
      expect(state.press('Backspace', document.createElement(tag)).defaultPrevented).toBe(false)
    }
    expect(state.removeSelectedElements).not.toHaveBeenCalled()
  })

  it('preserves Delete in edit mode', () => {
    const state = createKeyboardHandler()
    state.press('Delete')
    expect(state.removeSelectedElements).toHaveBeenCalledOnce()
  })

  it('prevents keyboard deletion in view mode', () => {
    const state = createKeyboardHandler(true)
    expect(state.press('Backspace').defaultPrevented).toBe(true)
    expect(state.press('Delete').defaultPrevented).toBe(true)
    expect(state.removeSelectedElements).not.toHaveBeenCalled()
  })
})
