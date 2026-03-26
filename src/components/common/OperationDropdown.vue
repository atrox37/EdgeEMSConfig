<template>
  <div class="operation-dropdown">
    <div v-if="!isNarrow" class="operation-buttons">
      <slot name="buttons"></slot>
    </div>

    <el-dropdown v-else trigger="click" @command="handleCommand">
      <el-button link class="operation-more-btn">
        <AppIcon name="i-tabler-dots" className="operation-dropdown__more-icon" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu class="operation-dropdown-menu">
          <slot name="dropdown"></slot>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import { useResponsive } from '@/composables/useResponsive'

const { isNarrow } = useResponsive()

const emit = defineEmits<{
  command: [command: string]
}>()

const handleCommand = (command: string) => {
  emit('command', command)
}
</script>

<style scoped lang="scss">

.operation-dropdown {
  display: inline-flex;
  align-items: center;

  .operation-buttons {
    display: flex;
    align-items: center;
    }

  .operation-more-btn {
    color: $text-color-primary;
    padding: $size-xs;

    :deep(.operation-dropdown__more-icon) {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: $white-alpha-10;
    }
  }
}

:deep(.operation-dropdown-menu) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    color: $text-color-primary;
    font-size: $font-size-base;

    img {
      width: $font-size-base;
      height: $font-size-base;
      object-fit: contain;
    }

    &:hover {
      background: $white-alpha-10;
    }
  }
}
</style>
