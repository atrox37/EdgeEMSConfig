import { describe, it, expect, vi } from 'vitest'
import {
  getRuleDetail,
  createRule,
  updateRule,
  deleteRule,
  enableRule,
  disableRule,
} from '../alarm'
import type { RuleFormModel } from '@/types/ruleManagement'

vi.mock('@/utils/request', () => ({
  Request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

describe('Alarm API', () => {
  it('should get rule detail', async () => {
    // 修复：mock数据应符合ApiResponse类型结构
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockData)

    const result = await getRuleDetail('1')
    expect(result).toEqual(mockData)
    expect(Request.get).toHaveBeenCalledWith('/alarmApi/rules/1')
  })

  it('should create rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.post).mockResolvedValue(mockData)

    // 修复：入参需符合 RuleFormModel 类型结构
    const ruleData: RuleFormModel = {
      rule_name: 'new rule',
      service_type: 'modbus',
      channel_id: 1,
      point_id: 1,
      data_type: 'T',
      warning_level: 1,
      operator: '>',
      value: 100,
      enabled: true,
    }
    const result = await createRule(ruleData)
    expect(result).toEqual(mockData)
    expect(Request.post).toHaveBeenCalledWith('/alarmApi/rules', ruleData)
  })

  it('should update rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.put).mockResolvedValue(mockData)

    const ruleData = { name: 'updated rule' }
    const result = await updateRule('1', ruleData)
    expect(result).toEqual(mockData)
    expect(Request.put).toHaveBeenCalledWith('/alarmApi/rules/1', ruleData)
  })

  it('should delete rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.delete).mockResolvedValue(mockData)

    const result = await deleteRule('1')
    expect(result).toEqual(mockData)
    expect(Request.delete).toHaveBeenCalledWith('/alarmApi/rules/1')
  })

  it('should enable rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.patch).mockResolvedValue(mockData)

    const result = await enableRule('1')
    expect(result).toEqual(mockData)
    expect(Request.patch).toHaveBeenCalledWith('/alarmApi/rules/1/enable')
  })

  it('should disable rule', async () => {
    const mockData = {
      code: 200,
      message: 'success',
      data: { id: '1', name: 'test rule' },
      success: true,
    }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.patch).mockResolvedValue(mockData)

    const result = await disableRule('1')
    expect(result).toEqual(mockData)
    expect(Request.patch).toHaveBeenCalledWith('/alarmApi/rules/1/disable')
  })
})
