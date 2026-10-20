<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import RuleFormMiniActionBtn from '@/components/common/RuleFormMiniActionBtn.vue'
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
  <RuleFormMiniActionBtn
    v-if="variant === 'add'"
    kind="add"
    size="sm"
    :title="label"
    @click="emit('click')"
  />
  <RuleFormMiniActionBtn
    v-else-if="variant === 'delete'"
    kind="delete"
    size="sm"
    :title="label"
    @click="emit('click')"
  />
  <div
    v-else
    class="point-table__op-btn"
    :class="`point-table__op-btn--${variant}`"
    @click="emit('click')"
  >
    <AppIcon :name="icon" className="point-table__op-icon" />
    <span>{{ label }}</span>
  </div>
</template>
