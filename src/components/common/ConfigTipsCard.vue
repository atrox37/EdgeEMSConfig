<template>
  <div class="config-tips-card">
    <div class="config-tips-card__title">{{ title }}</div>
    <div class="config-tips-card__content">
      <div v-for="(item, index) in items" :key="`${item.label}-${index}`" class="config-tips-card__item">
        <div class="config-tips-card__item-label">{{ item.label }}:</div>
        <div class="config-tips-card__item-text">{{ item.text }}</div>
      </div>
    </div>

    <div v-if="noteText" class="config-tips-card__note">
      <div class="config-tips-card__note-title">{{ noteTitle }}</div>
      <div class="config-tips-card__note-text">{{ noteText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TipItem {
  label: string
  text: string
}

withDefaults(
  defineProps<{
    title: string
    items: TipItem[]
    noteTitle?: string
    noteText?: string
  }>(),
  {
    noteTitle: 'Note',
    noteText: '',
  },
)
</script>

<style scoped lang="scss">
.config-tips-card {
  border: 1px solid color-mix(in srgb, var(--vt-color-secondary) 30%, transparent);
  border-radius: var(--vt-radius-md);
  background: color-mix(in srgb, var(--vt-color-secondary) 6%, transparent);
  padding: 16px;
}

.config-tips-card__title {
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-color-secondary);
  margin-bottom: 10px;
}

.config-tips-card__content {
  color: var(--vt-color-secondary);
  font-size: var(--vt-font-size-base);
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-tips-card__item {
  padding: 10px 12px;
  border-radius: var(--vt-radius-sm);
  border: 1px solid color-mix(in srgb, var(--vt-color-secondary) 20%, transparent);
  background: color-mix(in srgb, var(--vt-color-secondary) 8%, transparent);
}

.config-tips-card__item-label {
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
  margin-bottom: 2px;
}

.config-tips-card__item-text {
  color: var(--vt-text-secondary);
}

.config-tips-card__note {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--vt-color-secondary) 35%, transparent);
}

.config-tips-card__note-title {
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-color-secondary);
  margin-bottom: 4px;
}

.config-tips-card__note-text {
  color: var(--vt-text-secondary);
  line-height: 1.5;
}
</style>
