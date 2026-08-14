import { describe, expect, it } from 'vitest'
import { normalizeTopology, validateTopology, validateTopologyForPersistence, validateTopologyImport } from '@/utils/topologyNormalize'
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

const persistenceProducts = [
  { product_name: 'Station', parent_name: null },
  { product_name: 'ESS', parent_name: null },
  { product_name: 'Battery', parent_name: 'ESS', can_create_instance: true },
]
const persistenceInstances = [
  { instance_id: 1, instance_name: 'station_01', product_name: 'Station' },
  { instance_id: 2, instance_name: 'battery_01', product_name: 'Battery' },
]
const persistenceOptions = {
  instances: persistenceInstances,
  fixedBindings: { station: { instanceId: 1, instanceName: 'station_01', productName: 'Station' } },
  stationProductName: 'Station',
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


describe('strict topology persistence validation', () => {
  it('blocks an isolated node before saving', () => {
    const flow = baseFlow()
    flow.nodes.push({
      id: 'orphan-1',
      type: 'product',
      position: { x: 300, y: 0 },
      data: { label: 'Orphan', productName: 'Orphan' },
    })
    flow.fixedBindings = { station: { instanceId: 1, instanceName: 'station_01' } }

    const result = validateTopologyForPersistence(flow)

    expect(result.errors.some((issue) => issue.code === 'isolated_node')).toBe(true)
  })

  it('rejects unknown fields before import normalization', () => {
    const result = validateTopologyImport({ ...baseFlow(), unexpected: true })

    expect(result.canSave).toBe(false)
    expect(result.errors.some((issue) => issue.code === 'unknown_field')).toBe(true)
  })


  it('rejects a node whose product no longer exists', () => {
    const flow = baseFlow()
    flow.nodes.find((node) => node.id === 'battery-1')!.data.productName = 'Removed Battery'

    const result = validateTopologyForPersistence(flow, persistenceProducts, persistenceOptions)

    expect(result.errors.some((issue) => issue.code === 'unknown_product')).toBe(true)
  })

  it('rejects an instance ID that no longer exists', () => {
    const flow = baseFlow()
    flow.nodes.find((node) => node.id === 'battery-1')!.data.instances = [{ instanceId: 999, instanceName: 'deleted' }]

    const result = validateTopologyForPersistence(flow, persistenceProducts, persistenceOptions)

    expect(result.errors.some((issue) => issue.code === 'unknown_instance')).toBe(true)
  })

  it('rejects an instance belonging to a different product', () => {
    const flow = baseFlow()
    flow.nodes.find((node) => node.id === 'battery-1')!.data.instances = [{ instanceId: 1, instanceName: 'station_01' }]

    const result = validateTopologyForPersistence(flow, persistenceProducts, persistenceOptions)

    expect(result.errors.some((issue) => issue.code === 'instance_product_mismatch')).toBe(true)
  })
})
})
