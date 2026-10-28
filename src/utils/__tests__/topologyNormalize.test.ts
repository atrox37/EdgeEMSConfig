import { beforeEach, describe, expect, it } from 'vitest'
import type { ProductListItem } from '@/types/deviceConfiguration'
import type { ModelFlowData } from '@/types/visualModeling'
import { canPreviewNodePair, setModelFlowProductRules } from '@/utils/modelFlowRules'
import {
  createPersistedTopologyFlow,
  normalizeTopologyFixedBindings,
  validateTopologyForPersistence,
  validateTopologyImport,
} from '@/utils/topologyNormalize'

const products = [
  {
    product_name: 'Station',
    type: 'Station',
    topology: null,
  },
  {
    product_name: 'Battery',
    type: 'ESS',
    topology: { connections: [{ products: ['Meter'], min: 1, max: 1 }] },
  },
  {
    product_name: 'Meter',
    type: 'Meter',
    topology: { connections: [{ products: ['Battery'], min: 0, max: null }] },
  },
] as ProductListItem[]

const instances = [
  { instance_id: 1, instance_name: 'station-01', product_name: 'Station' },
  { instance_id: 10, instance_name: 'battery-01', product_name: 'Battery' },
  { instance_id: 11, instance_name: 'meter-01', product_name: 'Meter' },
]

function canonicalFlow(): ModelFlowData {
  return {
    nodes: [
      {
        id: 'battery',
        type: 'product',
        position: { x: 10, y: 20 },
        data: { label: 'Battery', description: '', productName: 'Battery', instanceId: 10 },
      },
      {
        id: 'meter',
        type: 'product',
        position: { x: 300, y: 20 },
        data: { label: 'Meter', description: '', productName: 'Meter', instanceId: 11 },
      },
    ],
    edges: [
      {
        id: 'edge-battery-meter',
        type: 'deletable-smoothstep',
        source: 'battery',
        target: 'meter',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
    ],
    fixedBindings: { stationInstanceId: 1, environmentInstanceId: null },
  }
}

const validationOptions = {
  instances,
  stationProductName: 'Station',
}

describe('canonical topology persistence', () => {
  beforeEach(() => setModelFlowProductRules(products))

  it('accepts the flat single-instance schema', () => {
    const result = validateTopologyForPersistence(canonicalFlow(), products, validationOptions)
    expect(result.canSave).toBe(true)
  })

  it('rejects multiple Meter devices on save and import even with distinct valid bindings', () => {
    const flow = canonicalFlow()
    flow.nodes.push(
      { ...flow.nodes[0], id: 'battery-2', data: { ...flow.nodes[0].data, instanceId: 12 } },
      { ...flow.nodes[1], id: 'meter-2', data: { ...flow.nodes[1].data, instanceId: 13 } },
    )
    flow.edges.push({ ...flow.edges[0], id: 'edge-2', source: 'battery-2', target: 'meter-2' })
    const options = {
      ...validationOptions,
      instances: [
        ...instances,
        { instance_id: 12, instance_name: 'battery-02', product_name: 'Battery' },
        { instance_id: 13, instance_name: 'meter-02', product_name: 'Meter' },
      ],
    }

    for (const validate of [validateTopologyForPersistence, validateTopologyImport]) {
      const result = validate(flow, products, options)
      expect(result.canSave).toBe(false)
      expect(result.errors.map((issue) => issue.code)).toEqual(['meter_node_limit'])
    }
  })

  it('allows Station and Env bindings to be cleared', () => {
    const flow: ModelFlowData = {
      nodes: [],
      edges: [],
      fixedBindings: { stationInstanceId: null, environmentInstanceId: null },
    }

    const result = validateTopologyForPersistence(flow, products, validationOptions)

    expect(result.canSave).toBe(true)
  })

  it('normalizes flat fixed bindings', () => {
    const flow: ModelFlowData = {
      nodes: [],
      edges: [],
      fixedBindings: { stationInstanceId: 1, environmentInstanceId: 2 },
    }

    expect(normalizeTopologyFixedBindings(flow).fixedBindings).toEqual({
      stationInstanceId: 1,
      environmentInstanceId: 2,
    })
  })

  it('persists only the approved node, edge, and fixed-binding fields', () => {
    const runtimeFlow = canonicalFlow()
    Object.assign(runtimeFlow.nodes[0], {
      selected: true,
      sourcePosition: 'right',
      style: { width: '280px' },
      parentNode: 'ignored',
    })
    Object.assign(runtimeFlow.nodes[0].data, {
      imageUrl: '/battery.png',
      topologyType: 'standalone',
      instanceName: 'ignored',
      channelIds: [1, 2],
    })
    Object.assign(runtimeFlow.edges[0], {
      animated: true,
      style: { stroke: '#fff' },
      data: { edgeVariant: 'dataflow' },
    })

    const persisted = createPersistedTopologyFlow(runtimeFlow)

    expect(persisted.nodes[0]).toEqual({
      id: 'battery',
      type: 'product',
      position: { x: 10, y: 20 },
      data: { label: 'Battery', description: '', productName: 'Battery', instanceId: 10 },
    })
    expect(persisted.edges[0]).toEqual({
      id: 'edge-battery-meter',
      type: 'deletable-smoothstep',
      source: 'battery',
      target: 'meter',
      sourceHandle: 'right',
      targetHandle: 'left',
    })
    expect(persisted.fixedBindings).toEqual({ stationInstanceId: 1, environmentInstanceId: null })
  })

  it('rejects duplicate instance bindings and suffixed runtime handles', () => {
    const flow = canonicalFlow()
    flow.nodes[1].data.instanceId = 10
    flow.edges[0].sourceHandle = 'right-source' as never

    const result = validateTopologyForPersistence(flow, products, validationOptions)

    expect(result.errors.some((issue) => issue.code === 'duplicate_instance_binding')).toBe(true)
    expect(result.errors.some((issue) => issue.code === 'invalid_edge_handle')).toBe(true)
  })

  it('rejects edges with unknown handle ids', () => {
    const flow = canonicalFlow()
    flow.edges[0].sourceHandle = 'north' as never

    const result = validateTopologyForPersistence(flow, products, validationOptions)

    expect(result.errors.some((issue) => issue.code === 'invalid_edge_handle')).toBe(true)
  })

  it('rejects fields outside the canonical import schema', () => {
    const flow = canonicalFlow()
    Object.assign(flow.nodes[0].data, { imageUrl: '/battery.png' })

    const result = validateTopologyImport(flow, products, validationOptions)

    expect(result.canSave).toBe(false)
    expect(result.errors.some((issue) => issue.code === 'unknown_field')).toBe(true)
  })

  it('requires reciprocal product connection declarations', () => {
    const oneSidedProducts = products.map((product) => (
      product.product_name === 'Meter'
        ? { ...product, topology: { connections: [] } }
        : product
    )) as ProductListItem[]
    setModelFlowProductRules(oneSidedProducts)

    const result = validateTopologyForPersistence(canonicalFlow(), oneSidedProducts, validationOptions)

    expect(result.errors.some((issue) => issue.code === 'invalid_connection')).toBe(true)
  })

  it('enforces grouped minimum counts when saving', () => {
    const flow = canonicalFlow()
    flow.edges = []

    const result = validateTopologyForPersistence(flow, products, validationOptions)

    expect(result.errors.some((issue) => issue.code === 'connection_rule_min')).toBe(true)
  })

  it('blocks a new edge when either endpoint group reached max', () => {
    const flow = canonicalFlow()
    flow.nodes.push({
      id: 'meter-2',
      type: 'product',
      position: { x: 300, y: 200 },
      data: { label: 'Meter 2', description: '', productName: 'Meter', instanceId: 12 },
    })

    expect(canPreviewNodePair(
      flow.nodes[0],
      flow.nodes[2],
      flow.nodes,
      flow.edges,
    )).toBe(false)
  })
})
