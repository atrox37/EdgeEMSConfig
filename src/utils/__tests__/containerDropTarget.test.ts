import { describe, expect, it } from 'vitest'
import { evaluateContainerDropTarget } from '@/utils/containerDropTarget'
import type { Node as FlowNode } from '@vue-flow/core'

const nodes: FlowNode[] = [
  {
    id: 'ess',
    type: 'group',
    position: { x: 100, y: 100 },
    data: { productName: 'ESS', isContainer: true, width: 280, height: 180 },
    style: { width: '280px', height: '180px' },
  },
  {
    id: 'gen',
    type: 'group',
    position: { x: 500, y: 100 },
    data: { productName: 'Generator', isContainer: true, width: 280, height: 180 },
    style: { width: '280px', height: '180px' },
  },
]

describe('evaluateContainerDropTarget', () => {
  it('returns valid for Battery over ESS', () => {
    const result = evaluateContainerDropTarget('Battery', { x: 200, y: 180 }, nodes)
    expect(result.containerId).toBe('ess')
    expect(result.status).toBe('valid')
  })

  it('returns invalid for Battery over Generator', () => {
    const result = evaluateContainerDropTarget('Battery', { x: 600, y: 180 }, nodes)
    expect(result.containerId).toBe('gen')
    expect(result.status).toBe('invalid')
  })
})
