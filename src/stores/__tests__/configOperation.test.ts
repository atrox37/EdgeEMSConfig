import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConfigOperationStore } from '../configOperation'
import { ConfigOperationError } from '@/utils/configOperation'

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), success: vi.fn() }))
vi.mock('@/stores/visualModeling', () => ({ useVisualModelingStore: () => ({ invalidateConfiguration: mocks.invalidate }) }))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success } }))

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('synchronous configuration operations', () => {
  it('stays locked until the final reply and rejects duplicate submissions without sending them', async () => {
    const store = useConfigOperationStore()
    let finish!: (value: any) => void
    const request = vi.fn(() => new Promise<any>((resolve) => { finish = resolve }))
    const running = store.run('restore', request)
    expect(store.busy).toBe(true)
    store.dismiss()
    expect(store.visible).toBe(true)
    const duplicate = vi.fn()
    await expect(store.run('restore', duplicate)).rejects.toBeInstanceOf(ConfigOperationError)
    expect(duplicate).not.toHaveBeenCalled()
    expect(store.busy).toBe(true)
    finish({ success: true, data: {} })
    await running
    expect(store.busy).toBe(false)
    expect(store.visible).toBe(false)
    expect(store.configurationRevision).toBe(1)
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
  })

  it('treats successful automatic recovery as a failed operation and refreshes actual metadata', async () => {
    const store = useConfigOperationStore()
    const error = { response: { status: 503, data: { success: false, error: { details: {
      restart_results: [{ service: 'voltageems-modsrv', success: false, state: 'exited', error: 'Exited' }],
      rollback: { succeeded: true, restart_results: [{ service: 'voltageems-modsrv', success: true, state: 'running' }] },
    } } } } }
    await expect(store.run('restore', async () => { throw error })).rejects.toMatchObject({
      result: { status: 'recovered' }, response: error.response,
    })
    expect(store.busy).toBe(false)
    expect(store.visible).toBe(true)
    expect(store.result?.services[0].state).toBe('exited')
    expect(store.result?.rollbackServices[0].state).toBe('running')
    expect(store.configurationRevision).toBe(1)
    expect(mocks.success).not.toHaveBeenCalled()
  })

  it.each([
    ['restore', { response: { status: 503, data: { error: { details: { rollback: { succeeded: false } } } } } }, 'unavailable'],
    ['restart', { response: { status: 503, data: { message: 'Restart failed', data: { results: [{ service: 'voltageems-comsrv', success: false, error: 'Docker unavailable' }] } } } }, 'unavailable'],
    ['restore', { response: { status: 422, data: { error: { message: 'Invalid ZIP' } } } }, 'rejected'],
    ['restore', { response: { status: 409, data: { error: { code: 'CONFIG_OPERATION_IN_PROGRESS' } } } }, 'rejected'],
    ['restore', { response: { status: 500, data: { message: 'Failed to apply' } } }, 'failed'],
    ['restore', new Error('Network failure'), 'unknown'],
  ] as const)('ends loading and retains the result for %s / %s', async (kind, error, status) => {
    const store = useConfigOperationStore()
    const request = vi.fn(async () => { throw error })
    await expect(store.run(kind, request)).rejects.toBeInstanceOf(ConfigOperationError)
    expect(store.busy).toBe(false)
    expect(store.visible).toBe(true)
    expect(store.result?.status).toBe(status)
    expect(store.configurationRevision).toBe(0)
    expect(request).toHaveBeenCalledTimes(1)
    expect(mocks.success).not.toHaveBeenCalled()
    store.dismiss()
    expect(store.visible).toBe(false)
  })
})
