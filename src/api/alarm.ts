import { Request } from '@/utils/request'
import type { RuleResponse, RuleFormModel } from '@/types/ruleManagement'
import type { ApiResponse } from '@/types/user'
export const getRuleDetail = (id: string): Promise<ApiResponse<RuleResponse>> => {
  return Request.get(`/alarmApi/rules/${id}`)
}

export const createRule = (data: RuleFormModel) => {
  return Request.post('/alarmApi/rules', data)
}

export const updateRule = (id: string, data: any) => {
  return Request.put(`/alarmApi/rules/${id}`, data)
}

export const deleteRule = (id: string) => {
  return Request.delete(`/alarmApi/rules/${id}`)
}
export const enableRule = (id: string | number) => {
  return Request.patch(`/alarmApi/rules/${id}/enable`)
}
export const disableRule = (id: string | number) => {
  return Request.patch(`/alarmApi/rules/${id}/disable`)
}
