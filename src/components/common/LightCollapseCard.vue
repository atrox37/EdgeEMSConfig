<template>
  <section
    class="light-collapse-card"
    :class="{ 'is-open': modelValue, 'is-disabled': disabled, 'is-initial': !isReady }"
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

const bodyStyle = computed(() => ({
  maxHeight: props.modelValue ? (props.autoHeight ? '100%' : `${bodyHeight.value}px`) : '0px',
  opacity: props.modelValue ? '1' : '0',
}))

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
  height: 100%;
  border: 1px solid $white-alpha-10;
  border-radius: 10px;
  background: linear-gradient(180deg, $white-alpha-05, transparent);
  overflow: hidden;
  width: 100%;

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
    color: $text-color-primary;
    position: relative;
    transition: color 0.2s ease, background-color 0.2s ease;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 2px;
      background: $secondary-color;
      opacity: 0.6;
      transition: opacity 0.2s ease, background-color 0.2s ease;
    }

    &:hover:not(:disabled):not([data-collapsible='false']) {
      background: $orange-color-hover-bg;
      color: $primary-color;
    }

    &[data-collapsible='false'] {
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid $primary-color-alpha-40;
      outline-offset: 2px;
    }
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
    border-right: 2px solid $secondary-color;
    border-bottom: 2px solid $secondary-color;
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
    overflow: auto;
  }

  &.is-open {
    border-color: $primary-color-alpha-20;
    box-shadow: 0 0 0 1px $primary-color-alpha-20 inset;
    .light-collapse-card__icon {
      transform: rotate(45deg);
      border-right-color: $primary-color;
      border-bottom-color: $primary-color;
    }
    .light-collapse-card__header::before {
      opacity: 1;
      background: $primary-color;
    }
  }

  &.is-disabled {
    opacity: 0.6;
    .light-collapse-card__header {
      cursor: not-allowed;
    }
  }

  &.is-initial {
    .light-collapse-card__body {
      transition: none;
    }
  }
}
</style>
