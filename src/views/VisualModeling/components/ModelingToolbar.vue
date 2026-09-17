<template>
  <div class="modeling-editor__header">
    <PageTitle title="Topology Config" />
    <EditorToolbar
      :is-view-mode="isViewMode"
      :is-fullscreen="isFullscreen"
      :export-loading="exportLoading"
      export-mode="dropdown"
      @toggle-fullscreen="$emit('toggle-fullscreen')"
      @export="(command) => $emit('export', command ?? 'json')"
      @enter-edit="$emit('enter-edit')"
      @auto-layout="$emit('auto-layout')"
      @import="$emit('import')"
      @exit-edit="$emit('exit-edit')"
    />
  </div>
</template>

<script setup lang="ts">
import EditorToolbar from '@/components/common/EditorToolbar.vue'
import PageTitle from '@/components/common/PageTitle.vue'

defineProps<{
  isViewMode: boolean
  isFullscreen: boolean
  exportLoading: boolean
}>()

defineEmits<{
  'toggle-fullscreen': []
  export: [command: string]
  'enter-edit': []
  'auto-layout': []
  import: []
  'exit-edit': []
}>()
</script>

<style scoped lang="scss">
.modeling-editor__header {
  height: 64px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $border-color-gray-light;
}
</style>
