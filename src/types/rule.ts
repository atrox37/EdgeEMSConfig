export interface Rule {
  id: string
  name: string
  description: string
  priority: number
  enabled: boolean
}

export type CreateRulePayload = Omit<Rule, 'id'> & { id: string }
export type UpdateRulePayload = Partial<Omit<Rule, 'id'>>
