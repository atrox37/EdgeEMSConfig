import { describe, expect, it } from 'vitest'
import {
  buildAttachPatch,
  buildDetachPatch,
  getNodeAbsolutePosition,
} from '@/utils/topologySync'
import type { Edge as FlowEdge, Node as FlowNode } from '@vue-flow/core'

function sampleNodes(): FlowNode[] {
  return [
    {
      id: 'station',
      type: 'station',
      position: { x: 0, y: 0 },
      data: { label: 'Station', productName: 'Station' },
    },
    {
      id: 'ess',
      type: 'group',
      position: { x: 0, y: 100 },
      data: { label: 'ESS', productName: 'ESS', isContainer: true },
    },
    {
      id: 'battery',
      type: 'product',
      position: { x: 20, y: 40 },
      parentNode: 'ess',
      data: { label: 'Battery', productName: 'Battery' },
    },
  ] as FlowNode[]
}

describe('topologySync', () => {
  it('computes absolute position for nested nodes', () => {
    const nodes = sampleNodes()
    const battery = nodes.find((n) => n.id === 'battery')!
    expect(getNodeAbsolutePosition(battery, nodes)).toEqual({ x: 20, y: 140 })
  })

  it('detach removes container edge and adds station edge', () => {
    const nodes = sampleNodes()
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'ess', target: 'battery' },
    ]
    const patch = buildDetachPatch('battery', nodes, edges)!
    expect(patch.edgesToRemove).toContain('e1')
    expect(patch.edgesToAdd.some((e) => e.source === 'station' && e.target === 'battery')).toBe(true)
    expect(patch.nodeUpdates[0].patch.position).toEqual({ x: 20, y: 140 })
  })

  it('attach adds container edge and removes station edge', () => {
    const nodes = sampleNodes().map((n) =>
      n.id === 'battery' ? { ...n, parentNode: undefined, position: { x: 50, y: 150 } } : n,
    )
    const edges: FlowEdge[] = [
      { id: 'e-station', source: 'station', target: 'battery' },
    ]
    const patch = buildAttachPatch('battery', 'ess', { x: 30, y: 50 }, nodes, edges)
    expect(patch.edgesToRemove).toContain('e-station')
    expect(patch.edgesToAdd.some((e) => e.source === 'ess' && e.target === 'battery')).toBe(true)
    expect(patch.nodeUpdates[0].patch.parentNode).toBe('ess')
  })
})
