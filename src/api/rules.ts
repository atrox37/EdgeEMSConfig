import Request from '@/utils/request'
import type { Rule, CreateRulePayload, UpdateRulePayload } from '@/types/rule'

export const listRules = async () => {
  return await Request.get<Rule[]>('/ruleApi/api/rules')
}

export const createRule = async (payload: CreateRulePayload) => {
  return await Request.post<Rule>('/ruleApi/api/rules', payload)
}

export const updateRule = async (id: string, payload: UpdateRulePayload) => {
  return await Request.put<Rule>(`/ruleApi/api/rules/${encodeURIComponent(id)}`, payload)
}

export const deleteRule = async (id: string) => {
  return await Request.delete(`/ruleApi/api/rules/${encodeURIComponent(id)}`)
}

export const enableRule = async (id: string) => {
  return await Request.post(`/ruleApi/api/rules/${encodeURIComponent(id)}/enable`)
}

export const disableRule = async (id: string) => {
  return await Request.post(`/ruleApi/api/rules/${encodeURIComponent(id)}/disable`)
}
