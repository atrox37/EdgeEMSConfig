<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { PointTableOpVariant } from '@/constants/pointTable'

defineProps<{
  variant: PointTableOpVariant
  icon: string
  label: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div
    class="point-table__op-btn"
    :class="`point-table__op-btn--${variant}`"
    @click="emit('click')"
  >
    <AppIcon :name="icon" className="point-table__op-icon" />
    <span>{{ label }}</span>
  </div>
</template>
