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
    gap: 20px;
  }

  .operation-more-btn {
    color: #fff;
    padding: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

// 下拉菜单样式
:deep(.operation-dropdown-menu) {
  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    color: #fff;
    font-size: 14px;

    img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}
</style>

