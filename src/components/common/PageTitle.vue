<template>
  <div class="page-title">
    <img :src="iconSrc" class="page-title__icon" />
    <span class="page-title__text">{{ title }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import cardIcon from '@/assets/icons/card-icon.svg'

const props = withDefaults(defineProps<{
  title: string
  icon?: string
}>(), {
  icon: undefined,
})

const iconSrc = computed(() => props.icon || cardIcon)
</script>

<style lang="scss" scoped>
.page-title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-title__icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.page-title__text {
  font-weight: var(--vt-font-weight-bold);
  font-size: var(--vt-font-size-lg);
  line-height: 100%;
  letter-spacing: 0%;
}
</style>
