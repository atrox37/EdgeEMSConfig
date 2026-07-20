import Request from '@/utils/request'
import type { Rule, CreateRulePayload, UpdateRulePayload, TriggerConfig } from '@/types/ruleConfiguration'
import type { RuleChainPayload } from '@/types/ruleConfiguration'
import type { RequestConfig } from '@/utils/request'
import type { PaginatedList, RuleHistoryItem } from '@/types/controlRule'

export interface ModRuleListQuery {
  page?: number
  page_size?: number
  /** Fuzzy name filter (case-insensitive) */
  name?: string
}

export const listRules = async (params: ModRuleListQuery = {}) => {
  return await Request.get<{ list: Rule[]; total?: number }>('/ruleApi/api/rules', params)
}

export const getRuleDetail = async (id: string) => {
  return await Request.get<RuleChainPayload>(`/ruleApi/api/rules/${id}`)
}

export const createRule = async (payload: CreateRulePayload) => {
  return await Request.post<Rule>('/ruleApi/api/rules', payload)
}

export const updateRule = async (
  payload: (RuleChainPayload | UpdateRulePayload & { id: string }) & {
    trigger_config?: TriggerConfig
  },
  config?: RequestConfig,
) => {
  return await Request.put<Rule>(`/ruleApi/api/rules/${payload.id}`, payload, config)
}

export const deleteRule = async (id: string) => {
  return await Request.delete(`/ruleApi/api/rules/${id}`)
}

export const enableRule = async (id: string) => {
  return await Request.post(`/ruleApi/api/rules/${id}/enable`)
}

export const disableRule = async (id: string) => {
  return await Request.post(`/ruleApi/api/rules/${id}/disable`)
}

export const submitRuleChain = async (payload: RuleChainPayload) => {
  return await Request.post('/ruleApi/api/rules', payload)
}

export interface ModRuleHistoryQuery {
  page?: number
  page_size?: number
  /** Start time filter: Unix timestamp in ms (inclusive) */
  start_time?: number
  /** End time filter: Unix timestamp in ms (inclusive) */
  end_time?: number
}

export interface RuleHistoryListQuery {
  page?: number
  page_size?: number
  rule_id?: number | string
  /** Case-insensitive substring match on rule name */
  rule_name?: string
  start_time?: number
  end_time?: number
}

/** Per-rule / global trigger history — rule_id goes in query, not path */
export const listRuleHistoryRecords = async (params: RuleHistoryListQuery = {}) => {
  return await Request.get<PaginatedList<RuleHistoryItem>>('/ruleApi/api/rules/history', params)
}

/** @deprecated Prefer listRuleHistoryRecords({ rule_id }) — rule_id is a query param */
export const getModRuleHistory = async (
  id: string | number,
  params: ModRuleHistoryQuery = {},
) => {
  return await listRuleHistoryRecords({
    ...params,
    rule_id: id,
  })
}
