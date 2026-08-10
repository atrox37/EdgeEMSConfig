<template>
  <section
    class="light-collapse-card"
    :class="{
      'is-open': modelValue,
      'is-disabled': disabled,
      'is-initial': !isReady,
      'is-non-collapsible': !collapsible,
    }"
  >
    <button
      class="light-collapse-card__header"
      type="button"
      :disabled="disabled"
      :aria-expanded="modelValue"
      :aria-disabled="!collapsible || disabled"
      :data-collapsible="collapsible"
      @click="toggle"
    >
      <span class="light-collapse-card__title">{{ title }}</span>
      <span class="light-collapse-card__header-actions" @click.stop>
        <slot name="actions" />
      </span>
      <span class="light-collapse-card__icon" aria-hidden="true" />
    </button>
    <div class="light-collapse-card__body" :style="bodyStyle">
      <div ref="bodyRef" class="light-collapse-card__body-inner">
        <slot />
        <div v-if="$slots.footer" class="light-collapse-card__footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  title: string
  modelValue: boolean
  disabled?: boolean
  autoHeight?: boolean
  collapsible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  autoHeight: false,
  collapsible: true,
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const bodyRef = ref<HTMLElement | null>(null)
const isReady = ref(false)
const bodyHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

const updateHeight = () => {
  if (!bodyRef.value) return
  bodyHeight.value = bodyRef.value.scrollHeight
}

const bodyStyle = computed(() => {
  if (!props.collapsible) {
    return { maxHeight: 'none', opacity: '1' }
  }
  return {
    maxHeight: props.modelValue ? (props.autoHeight ? '100%' : `${bodyHeight.value}px`) : '0px',
    opacity: props.modelValue ? '1' : '0',
  }
})

const toggle = () => {
  if (props.disabled || !props.collapsible) return
  emit('update:modelValue', !props.modelValue)
}

onMounted(() => {
  updateHeight()
  if (bodyRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })
    resizeObserver.observe(bodyRef.value)
  }
  nextTick(() => {
    isReady.value = true
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    updateHeight()
  },
)

watch(
  () => props.collapsible,
  (value) => {
    if (!value && !props.modelValue) {
      emit('update:modelValue', true)
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.light-collapse-card {
  border: 1px solid var(--vt-color-white-10);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--vt-color-white-05), transparent);
  overflow: hidden;
  width: 100%;
}

.light-collapse-card__header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--vt-text-primary);
  position: relative;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.light-collapse-card__header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 2px;
  background: var(--vt-color-secondary);
  opacity: 0.6;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.light-collapse-card__header:hover:not(:disabled):not([data-collapsible='false']) {
  background: color-mix(in srgb, var(--vt-color-primary) 10%, transparent);
  color: var(--vt-color-primary);
}

.light-collapse-card__header[data-collapsible='false'] {
  cursor: default;
}

.light-collapse-card__header:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--vt-color-primary) 40%, transparent);
  outline-offset: 2px;
}

.light-collapse-card__title {
  font-size: 16px;
  font-weight: 600;
}

.light-collapse-card__header-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.light-collapse-card__icon {
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--vt-color-secondary);
  border-bottom: 2px solid var(--vt-color-secondary);
  transform: rotate(-45deg);
  transition: transform 0.25s ease, border-color 0.2s ease;
}

.light-collapse-card__header[data-collapsible='false'] .light-collapse-card__icon {
  display: none;
}

.light-collapse-card__body {
  height: calc(100% - 42.5px);
  overflow: hidden;
  transition: max-height 0.28s ease, opacity 0.2s ease;
  will-change: max-height, opacity;
}

.light-collapse-card__body-inner {
  height: 100%;
  padding: 6px 16px 16px;
  overflow: hidden;
}

.light-collapse-card__footer {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid var(--vt-color-white-10);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.light-collapse-card.is-open {
  border-color: color-mix(in srgb, var(--vt-color-primary) 20%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vt-color-primary) 20%, transparent) inset;
}

.light-collapse-card.is-open .light-collapse-card__icon {
  transform: rotate(45deg);
  border-right-color: var(--vt-color-primary);
  border-bottom-color: var(--vt-color-primary);
}

.light-collapse-card.is-open .light-collapse-card__header::before {
  opacity: 1;
  background: var(--vt-color-primary);
}

.light-collapse-card.is-disabled {
  opacity: 0.6;
}

.light-collapse-card.is-disabled .light-collapse-card__header {
  cursor: not-allowed;
}

.light-collapse-card.is-initial .light-collapse-card__body {
  transition: none;
}

.light-collapse-card.is-non-collapsible .light-collapse-card__body {
  transition: none;
}
</style>
