import { describe, expect, it } from 'vitest'
import {
  buildConnectionRequirementViews,
  formatConnectionRequirementDetail,
} from '@/utils/topologyConnectionDisplay'

describe('topologyConnectionDisplay', () => {
  it('formats required and optional connection limits', () => {
    expect(formatConnectionRequirementDetail({ products: ['Meter'], min: 1, max: 1 })).toBe(
      'Required 1 · Maximum 1',
    )
    expect(formatConnectionRequirementDetail({ products: ['PV Group'], min: 0, max: null })).toBe(
      'Optional · Unlimited',
    )
    expect(formatConnectionRequirementDetail({ products: ['Battery'], min: 0, max: 1 })).toBe(
      'Optional · Maximum 1',
    )
  })

  it('builds tooltip rows from product topology rules', () => {
    expect(
      buildConnectionRequirementViews([
        { products: ['Meter'], min: 1, max: 1 },
        { products: ['PV Group', 'Battery'], min: 0, max: null },
      ]),
    ).toEqual([
      { title: 'Meter', detail: 'Required 1 · Maximum 1' },
      { title: 'PV Group, Battery', detail: 'Optional · Unlimited' },
    ])
  })
})
