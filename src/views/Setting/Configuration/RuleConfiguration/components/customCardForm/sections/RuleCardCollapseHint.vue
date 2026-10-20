<template>
  <div class="collapse-hint">
    <AppIcon name="i-tabler-info-circle-filled" className="collapse-hint__icon" />
    <span class="collapse-hint__text">
      Tip: Click
      <AppIcon name="i-tabler-chevron-left" className="collapse-hint__arrow" />
      Variable or
      <AppIcon name="i-tabler-chevron-right" className="collapse-hint__arrow" />
      Rule on the side to switch.
    </span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
</script>
