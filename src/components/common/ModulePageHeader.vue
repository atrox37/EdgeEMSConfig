<template>
  <div class="module-page-header">
    <div class="module-page-header__title-row">
      <span class="module-page-header__accent" aria-hidden="true" />
      <h2 class="module-page-header__title">{{ title }}</h2>
    </div>
    <div v-if="$slots.toolbar" class="module-page-header__toolbar-row">
      <div class="module-page-header__toolbar">
        <slot name="toolbar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
