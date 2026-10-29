import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { emit, TauriEvent } from '@tauri-apps/api/event'
import { mockIPC, mockWindows, clearMocks } from '@tauri-apps/api/mocks'
import { ElMessageBox } from 'element-plus'
import capability from '../../../src-tauri/capabilities/default.json'
import TitleBar from '../TitleBar.vue'

const state = vi.hoisted(() => ({ busy: false, updating: false }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/login' }),
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isLoggedIn: false }) }))
vi.mock('@/stores/configOperation', () => ({ useConfigOperationStore: () => state }))
vi.mock('@/utils/apiConfig', () => ({ getApiConfig: vi.fn() }))
vi.mock('@/utils/downloadPath', () => ({ ensureDefaultDownloadPath: vi.fn() }))
vi.mock('@/composables/useAppUpdateState', () => ({
  useAppUpdateState: () => ({ isAppUpdating: { get value() { return state.updating } } }),
}))
vi.mock('@/layout/components/TitlebarSettingDialog.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('element-plus', () => ({ ElMessageBox: { confirm: vi.fn() } }))

let wrapper: VueWrapper
let commands: string[]
let denied: string[]
let destroyed: string[]

beforeEach(async () => {
  state.busy = false
  state.updating = false
  commands = []
  denied = []
  destroyed = []
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32')
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Windows')
  vi.mocked(ElMessageBox.confirm).mockReset()
  const permissions = new Set(capability.permissions.filter((value) => typeof value === 'string'))

  mockIPC(async (command, args) => {
    commands.push(command)
    if (command === 'plugin:window|close' || command === 'plugin:window|destroy') {
      const action = command.split('|')[1]
      if (!permissions.has(`core:window:allow-${action}`)) {
        denied.push(command)
        return
      }
      if (action === 'close') await emit(TauriEvent.WINDOW_CLOSE_REQUESTED)
      else destroyed.push(String(args?.label))
    }
    if (command === 'plugin:window|is_maximized') return false
  }, { shouldMockEvents: true })
  mockWindows('main')
  wrapper = mount(TitleBar, {
    global: { stubs: { ElDropdown: true, ElDropdownMenu: true, ElDropdownItem: true } },
  })
  await flushPromises()
})

afterEach(async () => {
  wrapper.unmount()
  await flushPromises()
  clearMocks()
  vi.restoreAllMocks()
})

async function clickClose() {
  await wrapper.get('.titlebar__button--close').trigger('click')
  await flushPromises()
}

describe('Title bar close with the native Tauri close listener', () => {
  it('allows the SDK to finish closing the main window under the configured permissions', async () => {
    await clickClose()

    expect(commands).toContain('plugin:window|close')
    expect(commands).toContain('plugin:window|destroy')
    expect(denied).toEqual([])
    expect(destroyed).toEqual(['main'])
  })

  it('blocks button and native close while applying configuration, then allows closing', async () => {
    state.busy = true
    await clickClose()
    expect(commands).not.toContain('plugin:window|close')
    await emit(TauriEvent.WINDOW_CLOSE_REQUESTED)
    await flushPromises()
    expect(destroyed).toEqual([])

    state.busy = false
    await clickClose()
    expect(destroyed).toEqual(['main'])
  })

  it('keeps the window open when the user cancels exiting during an update', async () => {
    state.updating = true
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel')
    await clickClose()
    expect(ElMessageBox.confirm).toHaveBeenCalledOnce()
    expect(commands).not.toContain('plugin:window|close')
    expect(destroyed).toEqual([])
  })

  it('closes after the user confirms exiting during an update', async () => {
    state.updating = true
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as never)
    await clickClose()
    expect(destroyed).toEqual(['main'])
  })
})
