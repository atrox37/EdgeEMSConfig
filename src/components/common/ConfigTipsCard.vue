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
  border: 1px solid rgba($secondary-color, 0.3);
  border-radius: $border-radius-base;
  background: rgba($secondary-color, 0.06);
  padding: 16px;
}

.config-tips-card__title {
  font-weight: $font-weight-semibold;
  color: $secondary-color;
  margin-bottom: 10px;
}

.config-tips-card__content {
  color: $secondary-color;
  font-size: $font-size-base;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-tips-card__item {
  padding: 10px 12px;
  border-radius: $border-radius-small;
  border: 1px solid rgba($secondary-color, 0.2);
  background: rgba($secondary-color, 0.08);
}

.config-tips-card__item-label {
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin-bottom: 2px;
}

.config-tips-card__item-text {
  color: $text-color-secondary;
}

.config-tips-card__note {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba($secondary-color, 0.35);
}

.config-tips-card__note-title {
  font-weight: $font-weight-semibold;
  color: $secondary-color;
  margin-bottom: 4px;
}

.config-tips-card__note-text {
  color: $text-color-secondary;
  line-height: 1.5;
}
</style>
