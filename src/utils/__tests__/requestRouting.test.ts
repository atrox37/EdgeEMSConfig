import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createApiConfig, setAxiosBaseURL } from '@/utils/apiConfig'
import { Request, service, setApiConfigRef } from '@/utils/request'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  user: {
    token: 'access-token',
    refreshUserToken: vi.fn(),
    clearUserData: vi.fn(),
  },
}))

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mocks.fetch }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/global', () => ({ useGlobalStore: () => ({ loading: false }) }))
vi.mock('@/utils/secureStore', () => ({
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn(),
}))
vi.mock('@/utils/downloadSave', () => ({ saveBytesWithPreferredPath: vi.fn() }))
vi.mock('@/utils/navigation', () => ({ goToLogin: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

const routes = [
  ['/api/v1/auth/me', 6005, '/api/v1/auth/me'],
  ['/comApi/api/channels', 6001, '/api/channels'],
  ['/modApi/api/instances', 6002, '/api/instances'],
  ['/ruleApi/api/rules', 6002, '/api/rules'],
  ['/hisApi/history', 6004, '/hisApi/history'],
  ['/netApi/mqtt/config', 6006, '/netApi/mqtt/config'],
  ['/alarmApi/rules', 6007, '/alarmApi/rules'],
] as const

const response = (status = 200) => new Response(
  JSON.stringify({ success: status === 200, data: [] }),
  { status, headers: { 'Content-Type': 'application/json' } },
)

const assertRequest = (url: string, options: RequestInit, port: number, path: string, token: string) => {
  const destination = new URL(url)
  expect(destination.origin).toBe(`http://192.0.2.10:${port}`)
  expect(destination.pathname).toBe(path)
  const headers = new Headers(options.headers)
  expect(headers.get('Authorization')).toBe(`Bearer ${token}`)
  expect(headers.has('X-Voltage-Audit-User-Id')).toBe(false)
  expect(headers.has('X-Voltage-Audit-Username')).toBe(false)
}

describe('direct service requests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    for (const method of ['log', 'error', 'warn', 'groupCollapsed', 'groupEnd'] as const) {
      vi.spyOn(console, method).mockImplementation(() => {})
    }
    mocks.user.token = 'access-token'
    mocks.fetch.mockReset().mockImplementation(async () => response())
    mocks.user.refreshUserToken.mockReset()
    await setAxiosBaseURL(createApiConfig('192.0.2.10'))
  })

  afterEach(() => {
    setApiConfigRef(null)
    service.defaults.baseURL = ''
    vi.restoreAllMocks()
  })

  it.each(routes)('routes %s with the authenticated identity', async (path, port, targetPath) => {
    await Request.get(path, undefined, { skipGlobalLoading: true })
    const [url, options] = mocks.fetch.mock.calls[0]
    assertRequest(url, options, port, targetPath, 'access-token')
  })

  it('routes alarms to 6007 when a saved configuration predates alarmApiURL', async () => {
    const saved = createApiConfig('192.0.2.10')
    delete saved.alarmApiURL
    await setAxiosBaseURL(saved)
    await Request.get('/alarmApi/rules/7', { channel_id: 12 }, { skipGlobalLoading: true })
    const [url, options] = mocks.fetch.mock.calls[0]
    assertRequest(url, options, 6007, '/alarmApi/rules/7', 'access-token')
    expect(new URL(url).searchParams.get('channel_id')).toBe('12')
  })

  it('uses an explicitly configured alarm service address', async () => {
    await setAxiosBaseURL({
      ...createApiConfig('192.0.2.10'),
      alarmApiURL: 'http://192.0.2.20:16007',
    })
    await Request.get('/alarmApi/rules', undefined, { skipGlobalLoading: true })
    expect(new URL(mocks.fetch.mock.calls[0][0]).origin).toBe('http://192.0.2.20:16007')
  })

  it.each(['get', 'post', 'put', 'patch', 'delete'])('authenticates alarm %s requests', async (method) => {
    await service.request({
      url: '/alarmApi/rules/7', method, skipGlobalLoading: true,
    })
    const [url, options] = mocks.fetch.mock.calls[0]
    assertRequest(url, options, 6007, '/alarmApi/rules/7', 'access-token')
    expect(options.method).toBe(method.toUpperCase())
  })

  it.each(routes)('retries %s on the same service after token refresh', async (path, port, targetPath) => {
    mocks.fetch.mockReset()
      .mockImplementationOnce(async () => response(401))
      .mockImplementationOnce(async () => response())
    mocks.user.refreshUserToken.mockImplementation(async () => {
      mocks.user.token = 'refreshed-token'
      return { success: true }
    })
    await Request.get(path, undefined, { skipGlobalLoading: true })
    expect(mocks.user.refreshUserToken).toHaveBeenCalledTimes(1)
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
    const [url, options] = mocks.fetch.mock.calls[1]
    assertRequest(url, options, port, targetPath, 'refreshed-token')
    expect(mocks.user.clearUserData).not.toHaveBeenCalled()
  })
})
