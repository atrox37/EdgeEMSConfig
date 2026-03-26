import { computed, defineComponent, h, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  state: {
    updateInfo: {
      version: '1.1.0',
      notes: '### Changes\n- Fix updater flow',
    } as { version: string; notes?: string; date?: string } | null,
    isInstalling: false,
    installPhase: 'idle' as 'idle' | 'downloading' | 'installing',
    downloadPercent: 0,
    downloadedBytes: 0,
    totalBytes: null as number | null,
    progressMessage: '',
  },
  checkUpdateMock: vi.fn(),
  installUpdateMock: vi.fn(),
  getVersionMock: vi.fn().mockResolvedValue('1.0.0'),
}))

const FormDialogStub = defineComponent({
  name: 'FormDialog',
  setup(_, { slots, expose }) {
    const api = reactive({ dialogVisible: true })
    expose(api)

    return () =>
      h('div', { class: 'form-dialog-stub' }, [
        slots['dialog-body']?.(),
        slots['dialog-footer']?.(),
      ])
  },
})

const ElButtonStub = defineComponent({
  name: 'ElButton',
  props: {
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    type: { type: String, default: '' },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () =>
      h(
        'button',
        {
          disabled: props.disabled,
          'data-loading': String(props.loading),
          'data-type': props.type,
          onClick: () => emit('click'),
        },
        slots.default?.(),
      )
  },
})

const ElProgressStub = defineComponent({
  name: 'ElProgress',
  props: {
    percentage: { type: Number, default: 0 },
  },
  setup(props) {
    return () => h('div', { class: 'el-progress-stub', 'data-percentage': props.percentage })
  },
})

vi.mock('@/composables/useUpdater', () => ({
  useUpdater: () => ({
    updateInfo: computed(() => mocks.state.updateInfo),
    isInstalling: computed(() => mocks.state.isInstalling),
    installPhase: computed(() => mocks.state.installPhase),
    downloadPercent: computed(() => mocks.state.downloadPercent),
    downloadedBytes: computed(() => mocks.state.downloadedBytes),
    totalBytes: computed(() => mocks.state.totalBytes),
    progressMessage: computed(() => mocks.state.progressMessage),
    checkUpdate: mocks.checkUpdateMock,
    installUpdate: mocks.installUpdateMock,
  }),
}))

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: mocks.getVersionMock,
}))

import UpdateChecker from '@/components/UpdateChecker.vue'

describe('UpdateChecker', () => {
  beforeEach(() => {
    mocks.state.updateInfo = {
      version: '1.1.0',
      notes: '### Changes\n- Fix updater flow',
    }
    mocks.state.isInstalling = false
    mocks.state.installPhase = 'idle'
    mocks.state.downloadPercent = 0
    mocks.state.downloadedBytes = 0
    mocks.state.totalBytes = null
    mocks.state.progressMessage = ''
    mocks.checkUpdateMock.mockReset()
    mocks.installUpdateMock.mockReset()
    mocks.getVersionMock.mockClear()
  })

  it('renders progress details inside the dialog while downloading', async () => {
    mocks.state.isInstalling = true
    mocks.state.installPhase = 'downloading'
    mocks.state.downloadPercent = 42
    mocks.state.downloadedBytes = 420
    mocks.state.totalBytes = 1000
    mocks.state.progressMessage = 'Downloading update package...'

    const wrapper = mount(UpdateChecker, {
      global: {
        stubs: {
          FormDialog: FormDialogStub,
          ElButton: ElButtonStub,
          ElProgress: ElProgressStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Downloading Update')
    expect(wrapper.text()).toContain('42%')
    expect(wrapper.text()).toContain('Downloading update package...')
    expect(wrapper.text()).toContain('420 B / 1000 B')
    expect(wrapper.find('.el-progress-stub').attributes('data-percentage')).toBe('42')
  })

  it('keeps the dialog open when install fails', async () => {
    mocks.installUpdateMock.mockResolvedValue(false)

    const wrapper = mount(UpdateChecker, {
      global: {
        stubs: {
          FormDialog: FormDialogStub,
          ElButton: ElButtonStub,
          ElProgress: ElProgressStub,
        },
      },
    })

    const dialog = wrapper.findComponent(FormDialogStub)
    expect((dialog.vm.$.exposed as { dialogVisible: boolean }).dialogVisible).toBe(true)

    await wrapper.find('button[data-type="primary"]').trigger('click')
    await Promise.resolve()

    expect(mocks.installUpdateMock).toHaveBeenCalledTimes(1)
    expect((dialog.vm.$.exposed as { dialogVisible: boolean }).dialogVisible).toBe(true)
  })

  it('closes the dialog after a successful install', async () => {
    mocks.installUpdateMock.mockResolvedValue(true)

    const wrapper = mount(UpdateChecker, {
      global: {
        stubs: {
          FormDialog: FormDialogStub,
          ElButton: ElButtonStub,
          ElProgress: ElProgressStub,
        },
      },
    })

    const dialog = wrapper.findComponent(FormDialogStub)
    expect((dialog.vm.$.exposed as { dialogVisible: boolean }).dialogVisible).toBe(true)

    await wrapper.find('button[data-type="primary"]').trigger('click')
    await Promise.resolve()

    expect(mocks.installUpdateMock).toHaveBeenCalledTimes(1)
    expect((dialog.vm.$.exposed as { dialogVisible: boolean }).dialogVisible).toBe(false)
  })
})
