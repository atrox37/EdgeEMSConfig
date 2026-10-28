import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createApiConfig, setAxiosBaseURL } from '@/utils/apiConfig'
import { Request, service, setApiConfigRef } from '@/utils/request'
import { createPinia, setActivePinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  operation: { busy: false, generation: 0 },
  user: {
    token: 'access-token',
    refreshUserToken: vi.fn(),
    clearUserData: vi.fn(),
  },
}))

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: mocks.fetch }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/global', () => ({ useGlobalStore: () => ({ loading: false }) }))
vi.mock('@/stores/configOperation', () => ({ useConfigOperationStore: () => mocks.operation }))
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
    setActivePinia(createPinia())
    mocks.operation.busy = false
    mocks.operation.generation = 0
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
    vi.useRealTimers()
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

  it.each([
    [200, { success: true }, true],
    [200, { success: 'true', code: 200 }, false],
    [200, { success: false, code: 200 }, false],
    [201, { success: true }, false],
    [503, { success: true }, false],
  ])('requires the exact final configuration contract (%s, %j)', async (status, body, accepted) => {
    mocks.fetch.mockImplementation(async () => new Response(JSON.stringify(body), { status }));
    const request = Request.post('/api/v1/config/restart-services', {}, {
      requireConfigSuccess: true, showErrorMessage: false, skipGlobalLoading: true,
    });
    if (accepted) await expect(request).resolves.toEqual(body);
    else await expect(request).rejects.toMatchObject({ response: { status, data: body } });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  })

  it('preserves the full 503 failure and rollback body', async () => {
    const body = { success: false, error: { code: 'CONFIG_SERVICE_RESTART_FAILED', details: { rollback: { succeeded: true } } } };
    mocks.fetch.mockImplementation(async () => new Response(JSON.stringify(body), { status: 503 }));
    await expect(Request.post('/api/v1/config/versions/v1/restore', {}, {
      requireConfigSuccess: true, showErrorMessage: false, skipGlobalLoading: true,
    })).rejects.toMatchObject({ response: { status: 503, data: body } });
  })

  it('does not replay a configuration mutation after 401', async () => {
    mocks.fetch.mockImplementation(async () => response(401));
    await expect(Request.post('/api/v1/config/restart-services', {}, {
      requireConfigSuccess: true, showErrorMessage: false, skipGlobalLoading: true,
    })).rejects.toMatchObject({ response: { status: 401 } });
    expect(mocks.user.refreshUserToken).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  })

  it('does not fallback and resend a configuration ZIP', async () => {
    mocks.fetch.mockRejectedValue(new Error('Invalid array length'));
    const nativeFetch = vi.spyOn(globalThis, 'fetch');
    await expect(Request.upload('/api/v1/config/import', new File(['zip'], 'config.zip'), {}, {
      requireConfigSuccess: true, showErrorMessage: false, skipGlobalLoading: true,
    })).rejects.toThrow('Invalid array length');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(nativeFetch).not.toHaveBeenCalled();
  })

  it('bounds the full response wait even if the transport ignores abort', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockImplementation(async () => new Promise(() => {}));
    const request = Request.post('/api/v1/config/restart-services', {}, {
      requireConfigSuccess: true, showErrorMessage: false, skipGlobalLoading: true, timeout: 180000,
    });
    const rejected = expect(request).rejects.toMatchObject({ code: 'ECONNABORTED' });
    await vi.advanceTimersByTimeAsync(179999);
    expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejected;
    expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  })

  it('pauses background requests without sending them or showing an error', async () => {
    mocks.operation.busy = true;
    await expect(Request.get('/api/v1/config/current')).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(mocks.fetch).not.toHaveBeenCalled();
  })

  it('does not clear login when an in-flight ordinary request returns 401 during a config operation', async () => {
    let finish!: (value: Response) => void;
    mocks.fetch.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve }));
    const request = Request.get('/api/v1/config/current');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    mocks.operation.busy = true;
    finish(response(401));
    await rejected;
    expect(mocks.user.clearUserData).not.toHaveBeenCalled();
    expect(mocks.user.refreshUserToken).not.toHaveBeenCalled();
  })

  it('keeps login when a refresh started before the configuration operation fails afterwards', async () => {
    mocks.fetch.mockImplementation(async () => response(401));
    let finishRefresh!: (value: any) => void;
    mocks.user.refreshUserToken.mockImplementation(() => new Promise((resolve) => { finishRefresh = resolve }));
    const request = Request.get('/api/v1/config/current');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(mocks.user.refreshUserToken).toHaveBeenCalledTimes(1));
    mocks.operation.busy = true;
    finishRefresh({ success: false });
    await rejected;
    expect(mocks.user.clearUserData).not.toHaveBeenCalled();
  })

  it('discards old ordinary responses even after the config operation has completed', async () => {
    let finish!: (value: Response) => void;
    mocks.fetch.mockImplementation(() => new Promise<Response>((resolve) => { finish = resolve }));
    const request = Request.get('/api/v1/config/current');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    mocks.operation.generation += 1;
    finish(response());
    await rejected;
  })

  it('preserves login when a pre-operation refresh fails after the operation has completed', async () => {
    mocks.fetch.mockImplementation(async () => response(401));
    let finishRefresh!: (value: any) => void;
    mocks.user.refreshUserToken.mockImplementation(() => new Promise((resolve) => { finishRefresh = resolve }));
    const request = Request.get('/api/v1/config/current');
    const rejected = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await vi.waitFor(() => expect(mocks.user.refreshUserToken).toHaveBeenCalledTimes(1));
    mocks.operation.generation += 1;
    finishRefresh({ success: false });
    await rejected;
    expect(mocks.user.clearUserData).not.toHaveBeenCalled();
  })
})
