import type { ProductTopologyConnectionRule } from '@/types/deviceConfiguration'

export interface TopologyConnectionRequirementView {
  title: string
  detail: string
}

export function formatConnectionRequirementDetail(rule: ProductTopologyConnectionRule): string {
  const min = Math.max(0, Number(rule.min) || 0)
  const minPart = min >= 1 ? `Required ${min}` : 'Optional'
  const maxPart = rule.max == null ? 'Unlimited' : `Maximum ${Math.max(0, Number(rule.max) || 0)}`
  return `${minPart} · ${maxPart}`
}

export function buildConnectionRequirementViews(
  rules?: ProductTopologyConnectionRule[] | null,
): TopologyConnectionRequirementView[] {
  return (rules ?? []).map((rule) => ({
    title: rule.products.join(', '),
    detail: formatConnectionRequirementDetail(rule),
  }))
}
