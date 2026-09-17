<template>
  <div class="collapse-hint">
    <AppIcon name="i-tabler-info-circle-filled" className="collapse-hint__icon" />
    <span class="collapse-hint__text">
      Tip: Click
      <AppIcon name="i-tabler-arrow-big-right" className="collapse-hint__arrow" />
      /
      <AppIcon name="i-tabler-arrow-big-left" className="collapse-hint__arrow" />
      to toggle Variable/Rule.
    </span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>
