<template>
  <div
    class="collapse-center"
    :class="{
      'collapse-center--left': collapsedSection === 'rule',
      'collapse-center--right': collapsedSection === 'variable',
    }"
  >
    <el-button
      class="collapse-center__btn"
      type="primary"
      link
      :title="collapsedSection === 'variable' ? 'Show Rule Settings' : 'Show Variable Settings'"
      @click="emit('toggle')"
    >
      <AppIcon
        v-if="collapsedSection === 'variable'"
        name="i-tabler-arrow-big-right"
        className="collapse-center__glyph"
      />
      <AppIcon v-else name="i-tabler-arrow-big-left" className="collapse-center__glyph" />
    </el-button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  collapsedSection: 'variable' | 'rule' | null
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>
