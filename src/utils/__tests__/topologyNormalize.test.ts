import { describe, expect, it } from 'vitest'
import { normalizeTopology, validateTopology } from '@/utils/topologyNormalize'
import type { ModelFlowData } from '@/types/visualModeling'

function baseFlow(): ModelFlowData {
  return {
    nodes: [
      {
        id: 'station-1',
        type: 'station',
        position: { x: 0, y: 0 },
        data: { label: 'Station', productName: 'Station', instances: [{ instanceId: 1, instanceName: 'station_01' }] },
      },
      {
        id: 'ess-1',
        type: 'group',
        position: { x: 0, y: 100 },
        data: { label: 'ESS', productName: 'ESS', isContainer: true, instances: [] },
      },
      {
        id: 'battery-1',
        type: 'product',
        position: { x: 10, y: 10 },
        parentNode: 'ess-1',
        data: { label: 'Battery', productName: 'Battery', instances: [{ instanceId: 2, instanceName: 'battery_01' }] },
      },
    ],
    edges: [
      { id: 'e1', source: 'station-1', target: 'ess-1' },
    ],
  }
}

describe('validateTopology', () => {
  it('reports error when Station node is missing', () => {
    const flow = baseFlow()
    flow.nodes = flow.nodes.filter((n) => n.type !== 'station')
    const result = validateTopology(flow)
    expect(result.canSave).toBe(false)
    expect(result.errors.some((e) => e.code === 'missing_station')).toBe(true)
  })

  it('reports error for duplicate instance bindings', () => {
    const flow = baseFlow()
    flow.nodes.push({
      id: 'battery-2',
      type: 'product',
      position: { x: 20, y: 20 },
      data: { label: 'Battery 2', productName: 'Battery', instances: [{ instanceId: 2, instanceName: 'battery_01' }] },
    })
    const result = validateTopology(flow)
    expect(result.errors.some((e) => e.code === 'duplicate_instance_binding')).toBe(true)
  })

  it('reports error when device is in wrong container', () => {
    const flow = baseFlow()
    flow.nodes.push({
      id: 'gen-1',
      type: 'group',
      position: { x: 200, y: 100 },
      data: { label: 'Generator', productName: 'Generator', isContainer: true, instances: [] },
    })
    const battery = flow.nodes.find((n) => n.id === 'battery-1')!
    battery.parentNode = 'gen-1'
    const result = validateTopology(flow)
    expect(result.errors.some((e) => e.code === 'container_product_mismatch')).toBe(true)
  })
})

describe('normalizeTopology', () => {
  it('removes dangling edges and dedupes instance bindings', () => {
    const flow = baseFlow()
    flow.edges.push({ id: 'bad', source: 'missing', target: 'ess-1' })
    flow.nodes.push({
      id: 'battery-2',
      type: 'product',
      position: { x: 30, y: 30 },
      data: { label: 'Battery 2', productName: 'Battery', instances: [{ instanceId: 2, instanceName: 'battery_01' }] },
    })
    const result = normalizeTopology(flow)
    expect(result.flow.edges).toHaveLength(1)
    expect(result.appliedFixes.length).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.code === 'duplicate_instance_binding')).toBe(false)
  })
})
