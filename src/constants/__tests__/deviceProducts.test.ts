import { describe, expect, it } from 'vitest'
import type { ProductListItem } from '@/types/deviceConfiguration'
import { getTopologyPanelGroups, productsToModelOptions } from '@/constants/deviceProducts'

const products: ProductListItem[] = [
  {
    product_name: 'Station',
    type: 'Station',
    description: 'Station profile',
    defaultDisplayMeasureIds: [1, 2],
    topology: null,
  },
  {
    product_name: 'Battery',
    type: 'ESS',
    description: 'Battery system',
    defaultDisplayMeasureIds: [7, 1, 5, 6, 11],
    topology: {
      image: 'Battery.png',
      description: 'Battery topology description',
      connections: [{ products: ['Meter'], min: 1, max: 1 }],
    },
  },
  {
    product_name: 'PCS',
    type: 'ESS',
    description: 'Power conversion system',
    defaultDisplayMeasureIds: [1, 2, 6, 14, 16],
    topology: { image: null, connections: [] },
  },
]

describe('product catalog mapping', () => {
  it('allows every product in the instance selector', () => {
    expect(productsToModelOptions(products).map((item) => item.value)).toEqual([
      'Station',
      'Battery',
      'PCS',
    ])
  })

  it('shows only products with topology and groups them by product type', () => {
    const groups = getTopologyPanelGroups(products)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.title).toBe('ESS')
    expect(groups[0]?.templates.map((item) => item.productName)).toEqual(['Battery', 'PCS'])
    expect(groups[0]?.templates[0]?.description).toBe('Battery topology description')
    expect(groups[0]?.templates[0]?.connections).toEqual([{ products: ['Meter'], min: 1, max: 1 }])
  })
})
