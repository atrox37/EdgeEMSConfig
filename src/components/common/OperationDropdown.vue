<template>
  <div class="operation-dropdown">
    <!-- 宽屏模式：显示所有操作按钮 -->
    <div v-if="!isNarrow" class="operation-buttons">
      <slot name="buttons"></slot>
    </div>

    <!-- 窄屏模式：显示更多下拉菜单 -->
    <el-dropdown v-else trigger="click" @command="handleCommand">
      <el-button link class="operation-more-btn">
        <el-icon :size="18"><MoreFilled /></el-icon>
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
import { MoreFilled } from '@element-plus/icons-vue'
import { useResponsive } from '@/composables/useResponsive'

const { isNarrow } = useResponsive()

// 定义 emits
const emit = defineEmits<{
  command: [command: string]
}>()

// 处理下拉菜单命令
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
    
    &:hover {
      background: $white-alpha-10;
    }
  }
}

// 下拉菜单样式
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
