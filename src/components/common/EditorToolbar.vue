<template>
  <div class="editor-toolbar">
    <el-button size="small" type="primary" class="custom-button" @click="$emit('toggle-fullscreen')">
      <AppIcon
        :name="isFullscreen ? 'i-tabler-arrows-minimize' : 'i-tabler-arrows-maximize'"
        className="editor-toolbar__icon"
      />
      {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
    </el-button>

    <el-dropdown
      v-if="isViewMode && exportMode === 'dropdown'"
      trigger="click"
      :disabled="exportLoading"
      split-button
      placement="bottom-end"
      :show-arrow="false"
      @click="$emit('export', 'json')"
      @command="$emit('export', $event)"
    >
      <AppIcon name="i-tabler-download" className="editor-toolbar__icon" />
      Export
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="item in exportDropdownItems"
            :key="item.command"
            :command="item.command"
          >
            {{ item.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-button
      v-if="isViewMode && exportMode === 'button'"
      size="small"
      type="primary"
      class="custom-button"
      :loading="exportLoading"
      @click="$emit('export')"
    >
      <AppIcon name="i-tabler-file-export" className="editor-toolbar__icon" />
      Export
    </el-button>

    <el-button
      v-if="isViewMode"
      v-permission="'engineer'"
      size="small"
      type="primary"
      class="custom-button"
      @click="$emit('enter-edit')"
    >
      <AppIcon name="i-tabler-pencil" className="editor-toolbar__icon" />
      Edit
    </el-button>

    <template v-else>
      <el-button
        v-permission="'engineer'"
        size="small"
        class="custom-button"
        @click="$emit('auto-layout')"
      >
        <AppIcon name="i-tabler-layout-distribute-vertical" className="editor-toolbar__icon" />
        Auto Layout
      </el-button>
      <el-button
        v-permission="'engineer'"
        size="small"
        type="primary"
        class="custom-button"
        @click="$emit('import')"
      >
        <AppIcon name="i-tabler-upload" className="editor-toolbar__icon" />
        Import
      </el-button>
      <el-button
        v-permission="'engineer'"
        size="small"
        type="primary"
        class="custom-button"
        @click="$emit('exit-edit')"
      >
        <AppIcon name="i-tabler-arrow-left" className="editor-toolbar__icon" />
        Exit Edit
      </el-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

export interface EditorToolbarExportItem {
  command: string
  label: string
}

withDefaults(
  defineProps<{
    isViewMode: boolean
    isFullscreen: boolean
    exportLoading?: boolean
    exportMode?: 'none' | 'button' | 'dropdown'
    exportDropdownItems?: EditorToolbarExportItem[]
  }>(),
  {
    exportLoading: false,
    exportMode: 'button',
    exportDropdownItems: () => [
      { command: 'json', label: 'File(.json)' },
      { command: 'png', label: 'Image(.png)' },
    ],
  },
)

defineEmits<{
  'toggle-fullscreen': []
  export: [format?: string]
  'enter-edit': []
  'auto-layout': []
  import: []
  'exit-edit': []
}>()
</script>

<style scoped lang="scss">
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-toolbar__icon {
  margin-right: 6px;

  :deep(svg) {
    width: 12px;
    height: 12px;
  }
}
</style>
