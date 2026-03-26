<template>
  <Icon :icon="iconName" :class="className" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    name: string
    className?: string
  }>(),
  {
    className: '',
  },
)

const iconName = computed(() => {
  const rawName = String(props.name || '').trim()
  if (!rawName) return 'tabler:help-circle'
  if (!rawName.startsWith('i-')) return rawName

  const parts = rawName.slice(2).split('-').filter(Boolean)
  if (parts.length < 2) return 'tabler:help-circle'

  const [collection, ...iconParts] = parts
  return `${collection}:${iconParts.join('-')}`
})
</script>
