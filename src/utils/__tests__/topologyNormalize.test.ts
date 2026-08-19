import { describe, expect, it } from 'vitest'
import {
  createPersistedTopologyFlow,
  normalizeTopology,
  stripKnownTopologyRuntimeFields,
  validateTopology,
  validateTopologyForPersistence,
  validateTopologyImport,
} from '@/utils/topologyNormalize'
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

  it('does not require a Station flow node when fixed bindings are used', () => {
    const flow = baseFlow()
    flow.nodes = flow.nodes.filter((node) => node.type !== 'station')
    flow.edges = []
    flow.fixedBindings = {
      station: { instanceId: 1, instanceName: 'station_01', productName: 'Station' },
    }

    const result = normalizeTopology(flow, persistenceProducts, {
      ...persistenceOptions,
      requireStationNode: false,
    })

    expect(result.errors.some((issue) => issue.code === 'missing_station')).toBe(false)
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

  it('strips known Vue Flow runtime fields from legacy imports only', () => {
    const flow = baseFlow() as ModelFlowData & Record<string, unknown>
    Object.assign(flow.nodes[0], {
      computedPosition: { x: 0, y: 0, z: 0 },
      handleBounds: {},
      initialized: true,
      events: {},
    })
    Object.assign(flow.edges[0], {
      sourceNode: flow.nodes[0],
      targetNode: flow.nodes[1],
      sourceX: 10,
      targetX: 20,
      events: {},
    })
    flow.unexpected = true

    const cleaned = stripKnownTopologyRuntimeFields(flow) as ModelFlowData & Record<string, unknown>
    expect(cleaned.nodes[0]).not.toHaveProperty('computedPosition')
    expect(cleaned.edges[0]).not.toHaveProperty('sourceNode')
    expect(cleaned.nodes[0].position).toEqual({ x: 0, y: 0 })
    expect(cleaned).toHaveProperty('unexpected', true)
    expect(validateTopologyImport(cleaned).errors.some((issue) => issue.code === 'unknown_field')).toBe(true)
  })

  it('exports a stable DTO without runtime geometry while preserving positions', () => {
    const flow = baseFlow()
    Object.assign(flow.nodes[2], {
      computedPosition: { x: 10, y: 110, z: 0 },
      handleBounds: {},
      selected: true,
      events: {},
    })
    Object.assign(flow.edges[0], {
      sourceNode: flow.nodes[0],
      targetNode: flow.nodes[1],
      sourceX: 10,
      targetX: 20,
      selected: true,
    })

    const persisted = createPersistedTopologyFlow(flow)
    expect(persisted.nodes[2].position).toEqual({ x: 10, y: 10 })
    expect(persisted.nodes[2].parentNode).toBe('ess-1')
    expect(persisted.nodes[2]).not.toHaveProperty('computedPosition')
    expect(persisted.nodes[2]).not.toHaveProperty('selected')
    expect(persisted.edges[0]).not.toHaveProperty('sourceNode')
    expect(persisted.edges[0]).not.toHaveProperty('selected')
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

  it('requires standalone bindings independently of a stale catalog capability flag', () => {
    const flow = baseFlow()
    flow.nodes.find((node) => node.id === 'battery-1')!.data.instances = []
    const productsWithStaleCapability = persistenceProducts.map((product) => (
      product.product_name === 'Battery'
        ? { ...product, can_create_instance: false }
        : product
    ))

    const result = validateTopologyForPersistence(
      flow,
      productsWithStaleCapability,
      persistenceOptions,
    )

    expect(result.errors.some((issue) => issue.code === 'missing_instance_binding')).toBe(true)
  })

  it('does not mistake a top-level product for a composite component', () => {
    const flow = baseFlow()
    const device = flow.nodes.find((node) => node.id === 'battery-1')!
    delete device.parentNode
    device.data = { label: 'PCS', productName: 'PCS', instances: [] }
    const products = [
      ...persistenceProducts,
      {
        product_name: 'PCS',
        parent_name: 'ESS',
        can_create_instance: true,
        topology: { enabled: true, type: 'standalone' as const },
      },
      {
        product_name: 'Hybrid_Inverter',
        parent_name: 'Generator',
        can_create_instance: true,
        topology: {
          enabled: true,
          type: 'composite' as const,
          components: [{ productName: 'PCS' }],
        },
      },
    ]

    const result = validateTopologyForPersistence(flow, products, persistenceOptions)

    expect(result.errors.some((issue) => issue.code === 'missing_instance_binding')).toBe(true)
  })

  it.each(['composite', 'container'] as const)(
    'requires instance bindings for component nodes inside a %s',
    (topologyType) => {
      const flow = baseFlow()
      const parent = flow.nodes.find((node) => node.id === 'ess-1')!
      parent.data = {
        label: 'Parent',
        productName: 'Parent',
        topologyType,
        isContainer: topologyType === 'container',
        instances: topologyType === 'composite'
          ? [{ instanceId: 3, instanceName: 'parent_01', productName: 'Parent' }]
          : [],
      }
      const component = flow.nodes.find((node) => node.id === 'battery-1')!
      component.data = { label: 'Child', productName: 'Child', instances: [] }
      const products = [
        ...persistenceProducts,
        {
          product_name: 'Parent',
          parent_name: null,
          can_create_instance: topologyType === 'composite',
          topology: {
            enabled: true,
            type: topologyType,
            components: [{ name: 'Child', selectableProductTypes: ['Battery'] }],
          },
        },
      ]
      const instances = [
        ...persistenceInstances,
        { instance_id: 3, instance_name: 'parent_01', product_name: 'Parent' },
      ]

      const result = validateTopologyForPersistence(flow, products, {
        ...persistenceOptions,
        instances,
      })

      expect(result.errors.some(
        (issue) => issue.code === 'missing_instance_binding' && issue.nodeId === 'battery-1',
      )).toBe(true)
    },
  )

  it.each(['composite', 'container'] as const)(
    'treats a disconnected %s as isolated even when it has a component',
    (topologyType) => {
      const flow = baseFlow()
      flow.nodes = flow.nodes.filter((node) => node.type !== 'station')
      flow.edges = []
      flow.fixedBindings = {
        station: { instanceId: 1, instanceName: 'station_01', productName: 'Station' },
      }
      const parent = flow.nodes.find((node) => node.id === 'ess-1')!
      parent.data = {
        label: 'Parent',
        productName: 'Parent',
        topologyType,
        isContainer: topologyType === 'container',
        instances: topologyType === 'composite'
          ? [{ instanceId: 3, instanceName: 'parent_01', productName: 'Parent' }]
          : [],
      }
      const component = flow.nodes.find((node) => node.id === 'battery-1')!
      component.data = {
        label: 'Child',
        productName: 'Child',
        instances: [{ instanceId: 2, instanceName: 'battery_01', productName: 'Battery' }],
      }
      const products = [
        ...persistenceProducts,
        {
          product_name: 'Parent',
          parent_name: null,
          can_create_instance: topologyType === 'composite',
          topology: {
            enabled: true,
            type: topologyType,
            components: [{ name: 'Child', selectableProductTypes: ['Battery'] }],
          },
        },
      ]
      const instances = [
        ...persistenceInstances,
        { instance_id: 3, instance_name: 'parent_01', product_name: 'Parent' },
      ]

      const result = validateTopologyForPersistence(flow, products, {
        ...persistenceOptions,
        instances,
      })

      expect(result.errors.some(
        (issue) => issue.code === 'isolated_node' && issue.nodeId === 'ess-1',
      )).toBe(true)
      expect(result.errors.some(
        (issue) => issue.code === 'isolated_node' && issue.nodeId === 'battery-1',
      )).toBe(false)
    },
  )

  it('rejects an instance belonging to a different product', () => {
    const flow = baseFlow()
    flow.nodes.find((node) => node.id === 'battery-1')!.data.instances = [{ instanceId: 1, instanceName: 'station_01' }]

    const result = validateTopologyForPersistence(flow, persistenceProducts, persistenceOptions)

    expect(result.errors.some((issue) => issue.code === 'instance_product_mismatch')).toBe(true)
  })
})
})
