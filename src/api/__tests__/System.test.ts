import { describe, it, expect, vi } from 'vitest'
import {
  getMqttConfig,
  updateMqttConfig,
  disconnectMqtt,
  reconnectMqtt,
  getMqttStatus,
} from '../System'

vi.mock('@/utils/request', () => ({
  Request: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('System API', () => {
  it('should get MQTT config', async () => {
    const mockData = { code: 200, message: 'success', data: { mqtt_connection: { broker: {} } }, success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockData)

    const result = await getMqttConfig()
    expect(result).toEqual(mockData)
    expect(Request.get).toHaveBeenCalledWith('/netApi/mqtt/config')
  })

  it('should update MQTT config', async () => {
    const mockData = { code: 200, message: 'success', data: null, success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.post).mockResolvedValue(mockData)

    const config = { mqtt_connection: { broker: {} } }
    const result = await updateMqttConfig(config)
    expect(result).toEqual(mockData)
    expect(Request.post).toHaveBeenCalledWith('/netApi/mqtt/config', config)
  })

  it('should disconnect MQTT', async () => {
    const mockData = { code: 200, message: 'success', data: { status: 'disconnected' }, success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.post).mockResolvedValue(mockData)

    const result = await disconnectMqtt()
    expect(result).toEqual(mockData)
    expect(Request.post).toHaveBeenCalledWith('/netApi/mqtt/disconnect')
  })

  it('should reconnect MQTT', async () => {
    const mockData = { code: 200, message: 'success', data: { status: 'connected' }, success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.post).mockResolvedValue(mockData)

    const result = await reconnectMqtt()
    expect(result).toEqual(mockData)
    expect(Request.post).toHaveBeenCalledWith('/netApi/mqtt/reconnect')
  })

  it('should get MQTT status', async () => {
    const mockData = { code: 200, message: 'success', data: { connected: true }, success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockData)

    const result = await getMqttStatus()
    expect(result).toEqual(mockData)
    expect(Request.get).toHaveBeenCalledWith('/netApi/mqtt/status')
  })
})

