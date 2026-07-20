import { describe, expect, it } from 'vitest'
import { isFlowSnapshotEqual } from '@/utils/flowSnapshot'
import type { FlowSnapshot } from '@/utils/flowSnapshot'

const base: FlowSnapshot = {
  nodes: [
    {
      id: 'n1',
      type: 'product',
      position: { x: 10.001, y: 20.002 },
      data: { label: 'A', productName: 'Battery', instances: [{ instanceId: 1, instanceName: 'b1' }] },
    },
  ],
  edges: [{ id: 'e1', source: 's1', target: 'n1' }],
}

describe('isFlowSnapshotEqual', () => {
  it('treats tiny position drift as equal after rounding', () => {
    const moved: FlowSnapshot = {
      nodes: [{ ...base.nodes[0], position: { x: 10.004, y: 20.001 } }],
      edges: base.edges,
    }
    expect(isFlowSnapshotEqual(base, moved)).toBe(true)
  })

  it('detects instance binding changes', () => {
    const changed: FlowSnapshot = {
      nodes: [{
        ...base.nodes[0],
        data: {
          ...base.nodes[0].data,
          instances: [{ instanceId: 2, instanceName: 'b2' }],
        },
      }],
      edges: base.edges,
    }
    expect(isFlowSnapshotEqual(base, changed)).toBe(false)
  })

  it('ignores vue-flow runtime fields', () => {
    const withRuntime: FlowSnapshot = {
      nodes: [{ ...base.nodes[0], selected: true, dragging: true } as typeof base.nodes[0]],
      edges: base.edges,
    }
    expect(isFlowSnapshotEqual(base, withRuntime)).toBe(true)
  })
})
