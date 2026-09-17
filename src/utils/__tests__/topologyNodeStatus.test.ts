import { describe, expect, it } from 'vitest'
import type { Node as FlowNode } from '@vue-flow/core'
import { setModelFlowProductRules } from '@/utils/modelFlowRules'
import { getNodeTopologyStatus } from '@/utils/topologyNodeStatus'

const products = [
  {
    product_name: 'PCS',
    topology: {
      connections: [{ products: ['Meter'], min: 1, max: 1 }],
    },
  },
  {
    product_name: 'Meter',
    topology: {
      connections: [{ products: ['PCS'], min: 0, max: null }],
    },
  },
]

function productNode(id: string, productName: string, instanceId?: number): FlowNode {
  return {
    id,
    type: 'product',
    position: { x: 0, y: 0 },
    data: {
      label: productName,
      productName,
      instanceId: instanceId ?? null,
    },
  }
}

describe('getNodeTopologyStatus', () => {
  it('returns warning when required connections are missing', () => {
    setModelFlowProductRules(products)
    const nodes = [productNode('pcs-1', 'PCS', 1), productNode('meter-1', 'Meter', 2)]
    const status = getNodeTopologyStatus(nodes[0], nodes, [])

    expect(status?.level).toBe('warning')
    expect(status?.messages).toContain('Not connected to the topology.')
    expect(status?.messages.some((message) => message.includes('Meter'))).toBe(true)
  })

  it('returns ok when connection rules are satisfied', () => {
    setModelFlowProductRules(products)
    const nodes = [productNode('pcs-1', 'PCS', 1), productNode('meter-1', 'Meter', 2)]
    const edges = [{ source: 'pcs-1', target: 'meter-1' }]
    const status = getNodeTopologyStatus(nodes[0], nodes, edges)

    expect(status?.level).toBe('ok')
    expect(status?.title).toBe('Connections satisfied')
  })

  it('returns error when instance binding is missing', () => {
    setModelFlowProductRules(products)
    const nodes = [productNode('pcs-1', 'PCS')]
    const status = getNodeTopologyStatus(nodes[0], nodes, [])

    expect(status?.level).toBe('error')
    expect(status?.messages).toContain('Instance binding is required.')
  })
})
