<template>
  <div v-if="updateInfo && !dismissed" class="update-checker">
    <!-- 更新提示横幅 -->
    <el-alert
      v-if="!updateDialogVisible"
      :title="`发现新版本 v${updateInfo.version}`"
      type="info"
      :closable="true"
      show-icon
      @close="dismissUpdate"
    >
      <template #default>
        <div class="update-alert-content">
          <p>{{ updateInfo.notes ? truncateNotes(updateInfo.notes) : '有新版本可用' }}</p>
          <div class="update-actions">
            <el-button type="primary" size="small" @click="showUpdateDialog">
              查看详情
            </el-button>
            <el-button size="small" @click="dismissUpdate">稍后提醒</el-button>
          </div>
        </div>
      </template>
    </el-alert>

    <!-- 更新对话框 -->
    <el-dialog
      v-model="updateDialogVisible"
      title="应用更新"
      width="600px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      :show-close="true"
      @close="dismissUpdate"
    >
      <div v-if="updateInfo" class="update-dialog-content">
        <div class="update-header">
          <h3>发现新版本 v{{ updateInfo.version }}</h3>
          <p v-if="updateInfo.date" class="update-date">
            发布日期: {{ formatDate(updateInfo.date) }}
          </p>
        </div>

        <div class="update-notes">
          <h4>更新内容：</h4>
          <div class="notes-content" v-html="formatNotes(updateInfo.notes)"></div>
        </div>
      </div>

      <template #footer>
        <el-button @click="dismissUpdate">稍后提醒</el-button>
        <el-button type="primary" :loading="isInstalling" @click="handleInstall">
          立即更新
        </el-button>
      </template>
    </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useUpdater } from '@/composables/useUpdater'
import { ElMessage } from 'element-plus'

const {
  isChecking,
  updateInfo,
  checkUpdate,
  installUpdate: installUpdateFn,
} = useUpdater()

const updateDialogVisible = ref(false)
const isInstalling = ref(false)
const dismissed = ref(false) // 用户是否已关闭更新提示

/**
 * 格式化日期
 */
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * 格式化更新日志（支持 Markdown）
 */
const formatNotes = (notes?: string): string => {
  if (!notes) return '<p style="color: #909399;">暂无更新说明</p>'

  // 简单的 Markdown 转 HTML
  return notes
    .replace(/### (.*?)\n/g, '<h4 style="margin: 15px 0 8px 0; font-weight: 600; color: #303133;">$1</h4>')
    .replace(/- (.*?)(\n|$)/g, '<li style="margin: 6px 0; padding-left: 8px; color: #606266;">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p style="margin: 8px 0;">$1</p>')
}

/**
 * 截断更新日志（用于横幅显示）
 */
const truncateNotes = (notes?: string): string => {
  if (!notes) return '有新版本可用'
  const maxLength = 100
  if (notes.length <= maxLength) return notes
  return notes.substring(0, maxLength) + '...'
}

/**
 * 显示更新对话框
 */
const showUpdateDialog = () => {
  updateDialogVisible.value = true
}

/**
 * 关闭更新提示
 */
const dismissUpdate = () => {
  updateDialogVisible.value = false
  dismissed.value = true
}

/**
 * 处理安装更新
 */
const handleInstall = async () => {
  try {
    isInstalling.value = true
    await installUpdateFn()
    updateDialogVisible.value = false
  } catch (error) {
    console.error('安装更新失败:', error)
  } finally {
    isInstalling.value = false
  }
}

// 监听更新信息变化，自动显示对话框
import { watch } from 'vue'

watch(
  () => updateInfo.value,
  (newInfo) => {
    if (newInfo && !dismissed.value) {
      // 有更新时，自动显示对话框
      updateDialogVisible.value = true
    }
  },
  { immediate: true }
)

// 组件挂载时自动检查更新
onMounted(() => {
  // 延迟检查，避免影响应用启动速度
  setTimeout(() => {
    checkUpdate(true) // 静默检查
  }, 3000)
})
</script>

<style scoped lang="scss">
.update-checker {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
}

.update-alert-content {
  p {
    margin: 8px 0;
    color: #606266;
    font-size: 14px;
  }

  .update-actions {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }
}

.update-dialog-content {
  .update-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;

    h3 {
      margin: 0 0 8px 0;
      color: #409eff;
      font-size: 20px;
    }

    .update-date {
      margin: 0;
      color: #909399;
      font-size: 12px;
    }
  }

  .update-notes {
    h4 {
      margin: 0 0 12px 0;
      font-weight: 600;
      color: #303133;
      font-size: 16px;
    }

    .notes-content {
      max-height: 300px;
      overflow-y: auto;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 4px;
      line-height: 1.6;

      :deep(h4) {
        margin: 15px 0 8px 0;
        font-weight: 600;
        color: #303133;
      }

      :deep(li) {
        margin: 6px 0;
        padding-left: 8px;
        color: #606266;
      }

      :deep(p) {
        margin: 8px 0;
        color: #606266;
      }
    }
  }
}
</style>

