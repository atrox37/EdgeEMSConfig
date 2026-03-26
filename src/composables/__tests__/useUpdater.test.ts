import { beforeEach, describe, expect, it, vi } from 'vitest'

const { checkMock, confirmMock, elMessage } = vi.hoisted(() => ({
  checkMock: vi.fn(),
  confirmMock: vi.fn(),
  elMessage: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: checkMock,
  Update: class {},
}))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
  ElMessageBox: {
    confirm: confirmMock,
  },
}))

import { useUpdater } from '@/composables/useUpdater'

const createUpdate = (overrides: Record<string, unknown> = {}) => ({
  available: true,
  version: '1.1.0',
  body: '### Changes\n- Fix updater flow',
  date: '2025-01-01',
  rawJson: {},
  close: vi.fn().mockResolvedValue(undefined),
  download: vi.fn().mockResolvedValue(undefined),
  install: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

class PrivateFieldUpdate {
  available = true
  version = '1.3.0'
  body = '### Changes\n- Preserve private fields'
  date = '2025-01-02'
  rawJson = {}
  close = vi.fn().mockResolvedValue(undefined)
  #installed = false

  async download() {}

  async install() {
    this.#installed = true
  }

  get installed() {
    return this.#installed
  }
}

describe('useUpdater', () => {
  beforeEach(() => {
    checkMock.mockReset()
    confirmMock.mockReset()
    elMessage.success.mockReset()
    elMessage.error.mockReset()
    elMessage.info.mockReset()
  })

  it('clears stale update state when a later check finds no update', async () => {
    const firstUpdate = createUpdate({ version: '1.2.0' })
    checkMock.mockResolvedValueOnce(firstUpdate).mockResolvedValueOnce(null)

    const updater = useUpdater()

    await updater.checkUpdate(true)
    expect(updater.updateInfo.value?.version).toBe('1.2.0')
    expect(updater.updateAvailable.value?.version).toBe('1.2.0')

    await updater.checkUpdate(true)

    expect(firstUpdate.close).toHaveBeenCalledTimes(1)
    expect(updater.updateAvailable.value).toBeNull()
    expect(updater.updateInfo.value).toBeNull()
  })

  it('tracks download progress and install phase during update install', async () => {
    const progressUpdate = createUpdate({
      download: vi.fn().mockImplementation(async (onEvent?: (event: any) => void) => {
        onEvent?.({ event: 'Started', data: { contentLength: 100 } })
        onEvent?.({ event: 'Progress', data: { chunkLength: 25 } })
        onEvent?.({ event: 'Progress', data: { chunkLength: 25 } })
        onEvent?.({ event: 'Finished' })
      }),
    })
    checkMock.mockResolvedValueOnce(progressUpdate)
    confirmMock.mockResolvedValueOnce(undefined)

    const updater = useUpdater()
    await updater.checkUpdate(true)

    const installPromise = updater.installUpdate()

    expect(updater.isInstalling.value).toBe(true)
    expect(updater.installPhase.value).toBe('downloading')
    expect(updater.progressMessage.value).toContain('Downloading')

    const result = await installPromise

    expect(result).toBe(true)
    expect(progressUpdate.download).toHaveBeenCalledTimes(1)
    expect(progressUpdate.install).toHaveBeenCalledTimes(1)
    expect(progressUpdate.close).toHaveBeenCalledTimes(1)
  })

  it('returns false and keeps the update available for retry when install fails', async () => {
    const failedUpdate = createUpdate({
      download: vi.fn().mockRejectedValue(new Error('network error')),
    })
    checkMock.mockResolvedValueOnce(failedUpdate)

    const updater = useUpdater()
    await updater.checkUpdate(true)

    const result = await updater.installUpdate()

    expect(result).toBe(false)
    expect(failedUpdate.download).toHaveBeenCalledTimes(1)
    expect(elMessage.error).toHaveBeenCalledWith(expect.stringContaining('install update failed'))
    expect(updater.updateAvailable.value?.version).toBe('1.1.0')
    expect(updater.updateInfo.value?.version).toBe('1.1.0')
    expect(updater.progressMessage.value).toContain('failed')
  })

  it('preserves class instances with private fields during install', async () => {
    const privateUpdate = new PrivateFieldUpdate()
    checkMock.mockResolvedValueOnce(privateUpdate)
    confirmMock.mockResolvedValueOnce(undefined)

    const updater = useUpdater()
    await updater.checkUpdate(true)

    const result = await updater.installUpdate()

    expect(result).toBe(true)
    expect(privateUpdate.installed).toBe(true)
    expect(privateUpdate.close).toHaveBeenCalledTimes(1)
  })

  it('returns true and clears update state after a successful install', async () => {
    const successUpdate = createUpdate()
    checkMock.mockResolvedValueOnce(successUpdate)
    confirmMock.mockResolvedValueOnce(undefined)

    const updater = useUpdater()
    await updater.checkUpdate(true)

    const result = await updater.installUpdate()

    expect(result).toBe(true)
    expect(successUpdate.download).toHaveBeenCalledTimes(1)
    expect(successUpdate.install).toHaveBeenCalledTimes(1)
    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(successUpdate.close).toHaveBeenCalledTimes(1)
    expect(updater.updateAvailable.value).toBeNull()
    expect(updater.updateInfo.value).toBeNull()
  })
})
