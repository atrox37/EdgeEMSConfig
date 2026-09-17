<template>
  <button
    type="button"
    class="rule-form-mini-action"
    :class="[
      `rule-form-mini-action--${kind}`,
      `rule-form-mini-action--${size}`,
    ]"
    :title="title"
    :aria-label="title"
    @click.stop="emit('click')"
  >
    <span class="rule-form-mini-action__halo" aria-hidden="true" />
    <img
      class="rule-form-mini-action__glyph"
      :src="iconSrc"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import topologyAddIcon from '@/assets/icons/topology-add.svg'
import topologyDeleteIcon from '@/assets/icons/topology-delete.svg'

const props = withDefaults(
  defineProps<{
    kind: 'add' | 'delete'
    title: string
    size?: 'sm' | 'md'
  }>(),
  {
    size: 'md',
  },
)

const emit = defineEmits<{
  click: []
}>()

const iconSrc = computed(() => (props.kind === 'add' ? topologyAddIcon : topologyDeleteIcon))
</script>

<style lang="scss" scoped>
.rule-form-mini-action {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(0.92);
  }
}

.rule-form-mini-action--md {
  width: 28px;
  height: 28px;
}

.rule-form-mini-action--sm {
  width: 24px;
  height: 24px;
}

.rule-form-mini-action__halo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 31, 61, 0.12);
}

.rule-form-mini-action--md .rule-form-mini-action__glyph {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  object-fit: contain;
  pointer-events: none;
}

.rule-form-mini-action--sm .rule-form-mini-action__glyph {
  position: relative;
  z-index: 1;
  width: 16px;
  height: 16px;
  object-fit: contain;
  pointer-events: none;
}
</style>
