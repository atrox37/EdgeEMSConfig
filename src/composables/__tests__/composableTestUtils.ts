import { effectScope, type EffectScope } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

export function withComposableScope<T>(fn: () => T): T {
  const scope = effectScope(true)
  try {
    return scope.run(fn)!
  } finally {
    scope.stop()
  }
}

export async function mountComposable<T>(
  setupFn: () => T,
): Promise<{ result: T; wrapper: VueWrapper; scope: EffectScope }> {
  let result: T | undefined
  const scope = effectScope(true)
  const Comp = defineComponent({
    setup() {
      result = scope!.run(setupFn)
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  await wrapper.vm.$nextTick()
  if (!result) {
    throw new Error('Composable setup did not return a value')
  }
  return { result, wrapper, scope: scope! }
}

export function destroyComposableMount(wrapper: VueWrapper, scope: EffectScope) {
  wrapper.unmount()
  scope.stop()
}
