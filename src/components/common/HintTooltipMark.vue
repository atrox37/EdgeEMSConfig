<template>
  <span class="hint-tooltip-mark" :class="`hint-tooltip-mark--${tone}`">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  }>(),
  {
    tone: 'primary',
  },
)
</script>

<style scoped lang="scss">
.hint-tooltip-mark {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  margin: 0 2px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: var(--vt-font-weight-semibold);
  line-height: 18px;
  white-space: nowrap;

}

.hint-tooltip-mark.hint-tooltip-mark--primary {
  color: var(--vt-color-primary);
  background: color-mix(in srgb, var(--vt-color-primary) 10%, transparent);
}

.hint-tooltip-mark.hint-tooltip-mark--success {
  color: var(--vt-color-success);
  background: color-mix(in srgb, var(--vt-color-success) 11%, transparent);
}

.hint-tooltip-mark.hint-tooltip-mark--warning {
  color: $hint-mark-warning;
  background: color-mix(in srgb, var(--vt-color-warning) 14%, transparent);
}

.hint-tooltip-mark.hint-tooltip-mark--danger {
  color: var(--vt-color-danger);
  background: color-mix(in srgb, var(--vt-color-danger) 10%, transparent);
}

.hint-tooltip-mark.hint-tooltip-mark--neutral {
  color: var(--vt-text-secondary);
  background: var(--vt-bg-elevated);
}
</style>
