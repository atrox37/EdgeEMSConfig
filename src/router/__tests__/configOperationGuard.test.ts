import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  beforeEach: vi.fn(), cancel: vi.fn(), operation: { busy: false },
}))
vi.mock('@/router/index', () => ({ router: { beforeEach: mocks.beforeEach } }))
vi.mock('@/utils/request', () => ({ cancelAllPendingRequests: mocks.cancel }))
vi.mock('@/stores/configOperation', () => ({ useConfigOperationStore: () => mocks.operation }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isLoggedIn: true, userInfo: {} }) }))
vi.mock('@/utils/firstGatewaySetup', () => ({ hasGatewayFirstSetupBeenSeen: () => true }))
vi.mock('@/utils/roleGuard', () => ({ assertValidUserRole: () => true }))
import '@/router/guard'

beforeEach(() => { mocks.cancel.mockClear(); mocks.operation.busy = false })

describe('configuration navigation lock', () => {
  it('rejects navigation before cancelling pending requests', async () => {
    mocks.operation.busy = true
    const next = vi.fn()
    await mocks.beforeEach.mock.calls[0][0]({ path: '/login' }, {}, next)
    expect(next).toHaveBeenCalledWith(false)
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('allows ordinary navigation after the final result', async () => {
    const next = vi.fn()
    await mocks.beforeEach.mock.calls[0][0]({ path: '/topologyConfig' }, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(mocks.cancel).toHaveBeenCalledTimes(1)
  })
})
