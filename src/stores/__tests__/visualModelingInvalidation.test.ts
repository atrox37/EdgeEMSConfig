import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVisualModelingStore } from '../visualModeling'

const mocks = vi.hoisted(() => ({ instances: vi.fn(), products: vi.fn() }))
vi.mock('@/api/devicesManagement', () => ({ getAllInstances: mocks.instances, getProducts: mocks.products }))
vi.mock('@/api/stationTopology', () => ({ getChannelBindings: vi.fn(), getStationTopology: vi.fn(), saveStationTopology: vi.fn() }))

beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

describe('configuration cache invalidation', () => {
  it.each(['resolve', 'reject'])('ignores a pre-operation instance request that later %ss', async (outcome) => {
    const store = useVisualModelingStore()
    let resolveOld!: (value: any) => void
    let rejectOld!: (value: any) => void
    mocks.instances.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject }))
    const oldLoad = store.loadInstances()
    store.invalidateConfiguration()
    expect(store.instancesLoading).toBe(false)
    mocks.instances.mockResolvedValueOnce({ success: true, data: { list: [{ id: 42, name: 'Current Meter', product_name: 'Meter' }] } })
    await store.loadInstances()
    if (outcome === 'resolve') resolveOld({ success: true, data: { list: [{ id: 1, name: 'Old Meter', product_name: 'Meter' }] } })
    else rejectOld(new Error('Old request canceled'))
    await oldLoad
    expect(store.instances).toEqual([{ instance_id: 42, instance_name: 'Current Meter', product_name: 'Meter' }])
    expect(store.instancesLoaded).toBe(true)
  })
})
