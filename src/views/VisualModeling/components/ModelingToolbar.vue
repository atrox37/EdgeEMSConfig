<template>
  <div class="modeling-editor__header">
    <PageTitle title="Topology Config" />
    <div class="modeling-editor__toolbar">
      <el-button size="small" type="primary" class="custom-button" @click="$emit('toggle-fullscreen')">
        <img :src="fullscreenIcon" class="modeling-editor__toolbar-icon" />
        {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
      </el-button>

      <el-dropdown
        v-if="isViewMode"
        trigger="click"
        :disabled="exportLoading"
        split-button
        placement="bottom-end"
        :show-arrow="false"
        @click="$emit('export', 'json')"
        @command="$emit('export', $event)"
      >
        <img :src="exportIcon" class="modeling-editor__toolbar-icon" />
        Export
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="json">File(.json)</el-dropdown-item>
            <el-dropdown-item command="png">Image(.png)</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-button
        v-if="isViewMode"
        v-permission="'engineer'"
        size="small"
        type="primary"
        class="custom-button"
        @click="$emit('enter-edit')"
      >
        <img :src="editIcon" class="modeling-editor__toolbar-icon" />
        Edit
      </el-button>

      <template v-else>
        <el-button v-permission="'engineer'" size="small" class="custom-button" @click="$emit('auto-layout')">
          <AppIcon name="i-tabler-layout-distribute-vertical" class="modeling-editor__toolbar-icon" />
          Auto Layout
        </el-button>
        <el-button
          v-permission="'engineer'"
          size="small"
          type="primary"
          class="custom-button"
          @click="$emit('import')"
        >
          <AppIcon name="i-tabler-upload" class="modeling-editor__toolbar-icon" />
          Import
        </el-button>
        <el-button
          v-permission="'engineer'"
          size="small"
          type="primary"
          class="custom-button"
          @click="$emit('exit-edit')"
        >
          <AppIcon name="i-tabler-arrow-left" class="modeling-editor__toolbar-icon" />
          Exit Edit
        </el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import PageTitle from '@/components/common/PageTitle.vue'
import fullscreenIcon from '@/assets/icons/button-fullscreen.svg'
import editIcon from '@/assets/icons/button-edit.svg'
import exportIcon from '@/assets/icons/button-download.svg'

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #dcdfe6;
}

.modeling-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.modeling-editor__toolbar-icon {
  margin-right: 6px;

  :deep(svg) {
    width: 12px;
    height: 12px;
  }
}
</style>
