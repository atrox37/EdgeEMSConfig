<template>
  <el-tooltip
    effect="light"
    :placement="placement"
    :show-after="showAfter"
    :hide-after="100"
    :enterable="true"
    popper-class="hint-tooltip__popper"
  >
    <template #content>
      <div class="hint-tooltip__content">
        <div class="hint-tooltip__heading">
          <span class="hint-tooltip__heading-icon">
            <AppIcon name="i-tabler-bulb-filled" />
          </span>
          <span>{{ title }}</span>
        </div>
        <div class="hint-tooltip__description">
          <slot name="content">{{ content }}</slot>
        </div>
      </div>
    </template>

    <span
      class="hint-tooltip__trigger"
      :class="`hint-tooltip__trigger--${size}`"
      role="img"
      :aria-label="title"
      tabindex="0"
    >
      <AppIcon name="i-tabler-info-circle-filled" />
    </span>
  </el-tooltip>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

type HintTooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

withDefaults(
  defineProps<{
    title: string
    content?: string
    placement?: HintTooltipPlacement
    showAfter?: number
    size?: 'small' | 'medium'
  }>(),
  {
    content: '',
    placement: 'top',
    showAfter: 250,
    size: 'small',
  },
)
</script>

<style scoped lang="scss">
.hint-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--vt-color-primary);
  background: color-mix(in srgb, var(--vt-color-primary) 10%, transparent);
  cursor: help;
  outline: none;
  transition:
    color var(--vt-transition-fast),
    background-color var(--vt-transition-fast),
    transform var(--vt-transition-fast);

}

.hint-tooltip__trigger:hover,
.hint-tooltip__trigger:focus-visible {
  color: $white-alpha-100;
  background: var(--vt-color-primary);
  transform: translateY(-1px);
}

.hint-tooltip__trigger.hint-tooltip__trigger--small {
  width: 16px;
  height: 16px;
  font-size: 12px;
}

.hint-tooltip__trigger.hint-tooltip__trigger--medium {
  width: 20px;
  height: 20px;
  font-size: 15px;
}

.hint-tooltip__content {
  width: min(280px, calc(100vw - 40px));
}

.hint-tooltip__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vt-text-primary);
  font-size: 14px;
  font-weight: var(--vt-font-weight-semibold);
  line-height: 22px;
}

.hint-tooltip__heading-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 6px;
  color: var(--vt-color-primary);
  background: color-mix(in srgb, var(--vt-color-primary) 10%, transparent);
  font-size: 14px;
}

.hint-tooltip__description {
  margin-top: 8px;
  color: var(--vt-text-secondary);
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}

:global(.hint-tooltip__popper.el-popper.is-light) {
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--vt-color-primary) 20%, var(--vt-border-color));
  border-radius: var(--vt-radius-sm);
  background: $white-alpha-100;
  box-shadow: 0 8px 24px rgba(53, 76, 123, 0.16);
}

:global(.hint-tooltip__popper.el-popper.is-light .el-popper__arrow::before) {
  border-color: color-mix(in srgb, var(--vt-color-primary) 20%, var(--vt-border-color));
  background: $white-alpha-100;
}
</style>
