<template>
  <div class="system-config">
    <div class="system-config__header">
      <h2 class="system-config__title">System Config</h2>
    </div>

    <div class="system-config__content">
      <!-- 配置文件管理区域 -->
      <el-card class="system-config__card">
        <template #header>
          <div class="system-config__card-header">
            <span>Configuration File Management</span>
          </div>
        </template>
        <div class="system-config__card-body">
          <div class="system-config__actions">
            <el-button type="primary" @click="handleConfigImport" :loading="configImportLoading">
              Import Configuration
            </el-button>
            <el-button type="primary" @click="handleConfigExport" :loading="configExportLoading">
              Export Configuration
            </el-button>
          </div>
          <p class="system-config__hint">Only .zip files are supported</p>
        </div>
      </el-card>

      <!-- 升级包上传区�?-->
      <el-card class="system-config__card">
        <template #header>
          <div class="system-config__card-header">
            <span>Firmware Upgrade</span>
          </div>
        </template>
        <div class="system-config__card-body">
          <div class="system-config__upload-section">
            <el-upload
              ref="upgradeUploadRef"
              class="system-config__upload"
              :auto-upload="false"
              :on-change="handleUpgradeFileChange"
              :on-remove="handleUpgradeFileRemove"
              accept=".zip"
              :limit="1"
              :file-list="upgradeFileList"
            >
              <template #trigger>
                <el-button type="primary">Select Upgrade Package</el-button>
              </template>
              <template #tip>
                <div class="el-upload__tip">Only .zip files are supported</div>
              </template>
            </el-upload>

            <el-button
              v-if="upgradeFileList.length > 0"
              type="primary"
              @click="handleUpgradeUpload"
              :loading="upgradeUploadLoading"
              :disabled="upgradeUploadLoading"
              class="system-config__upload-btn"
            >
              Upload Upgrade Package
            </el-button>
          </div>

          <!-- 上传日志区域 -->
          <div v-if="upgradeLogs.length > 0 || upgradeUploadLoading" class="system-config__logs">
            <div class="system-config__logs-header">
              <span>Upload Logs</span>
              <el-button
                v-if="!upgradeUploadLoading"
                type="text"
                size="small"
                @click="clearUpgradeLogs"
              >
                Clear
              </el-button>
            </div>
            <div class="system-config__logs-content">
              <div
                v-for="(log, index) in upgradeLogs"
                :key="index"
                class="system-config__log-item"
                :class="`log-${log.type}`"
              >
                <span class="system-config__log-time">{{ log.time }}</span>
                <span class="system-config__log-message">{{ log.message }}</span>
              </div>
              <div v-if="upgradeUploadLoading" class="system-config__log-item log-info">
                <span class="system-config__log-time">{{ currentTime }}</span>
                <span class="system-config__log-message">Uploading... {{ upgradeProgress }}%</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 隐藏的文件输�?-->
    <input
      ref="configFileInputRef"
      type="file"
      accept=".zip"
      style="display: none"
      @change="handleConfigFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadFiles } from 'element-plus'
import { Request } from '@/utils/request'

// 配置文件相关
const configFileInputRef = ref<HTMLInputElement>()
const configImportLoading = ref(false)
const configExportLoading = ref(false)

// 升级包相�?
const upgradeUploadRef = ref()
const upgradeFileList = ref<UploadFile[]>([])
const upgradeUploadLoading = ref(false)
const upgradeProgress = ref(0)
const upgradeLogs = ref<Array<{ time: string; message: string; type: 'info' | 'success' | 'error' }>>([])

// 当前时间格式�?
const currentTime = ref('')

// 更新当前时间
const updateCurrentTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', { hour12: false })
}

// 定时更新当前时间
let timeInterval: NodeJS.Timeout | null = null

// 添加日志
const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  updateCurrentTime()
  upgradeLogs.value.push({
    time: currentTime.value,
    message,
    type,
  })
  // 自动滚动到底�?
  setTimeout(() => {
    const logsContent = document.querySelector('.system-config__logs-content')
    if (logsContent) {
      logsContent.scrollTop = logsContent.scrollHeight
    }
  }, 100)
}

// 清除日志
const clearUpgradeLogs = () => {
  upgradeLogs.value = []
}

// 配置文件导入
const handleConfigImport = () => {
  configFileInputRef.value?.click()
}

// 配置文件文件选择处理
const handleConfigFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.zip')) {
    ElMessage.error('Please select a .zip file')
    return
  }

  try {
    configImportLoading.value = true
    const formData = new FormData()
    formData.append('file', file)

    // TODO: 替换为实际的导入API接口
    const response = await Request.post('/api/v1/system/config/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    if (response.success) {
      ElMessage.success('Configuration imported successfully')
    } else {
      ElMessage.error(response.message || 'Import failed')
    }
  } catch (error: any) {
    console.error('Import failed:', error)
    ElMessage.error(error.message || 'Import failed')
  } finally {
    configImportLoading.value = false
    // 重置文件输入
    if (configFileInputRef.value) {
      configFileInputRef.value.value = ''
    }
  }
}

// 配置文件导出
const handleConfigExport = async () => {
  try {
    configExportLoading.value = true
    // TODO: 替换为实际的导出API接口
    await Request.download('/api/v1/system/config/export', {}, `system_config_${Date.now()}.zip`)
  } catch (error: any) {
    console.error('Export failed:', error)
    ElMessage.error(error.message || 'Export failed')
  } finally {
    configExportLoading.value = false
  }
}

// 升级包文件变化处�?
const handleUpgradeFileChange = (file: UploadFile, fileList: UploadFiles) => {
  if (file.raw && !file.raw.name.toLowerCase().endsWith('.zip')) {
    ElMessage.error('Only .zip files are supported')
    upgradeFileList.value = []
    return
  }
  upgradeFileList.value = fileList
}

// 升级包文件移除处�?
const handleUpgradeFileRemove = () => {
  upgradeFileList.value = []
  clearUpgradeLogs()
}

// 升级包上�?
const handleUpgradeUpload = async () => {
  if (upgradeFileList.value.length === 0) {
    ElMessage.warning('Please select an upgrade package file')
    return
  }

  const file = upgradeFileList.value[0].raw
  if (!file) {
    ElMessage.error('Invalid file')
    return
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    ElMessage.error('Only .zip files are supported')
    return
  }

  try {
    // 确认上传
    await ElMessageBox.confirm(
      `Are you sure you want to upload the upgrade package: ${file.name}?`,
      'Confirm Upload',
      {
        confirmButtonText: 'Upload',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )

    upgradeUploadLoading.value = true
    upgradeProgress.value = 0
    clearUpgradeLogs()
    
    // 开始定时更新时间和进度显示
    timeInterval = setInterval(() => {
      updateCurrentTime()
    }, 1000)

    addLog(`Starting upload: ${file.name}`, 'info')
    addLog(`File size: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 'info')

    // TODO: 替换为实际上传API接口
    const response = await Request.upload<any>(
      '/api/v1/system/upgrade/upload',
      file,
      {},
      {
        onUploadProgress: (evt: any) => {
          const total = evt.total || 0
          const loaded = evt.loaded || 0
          const percent = total > 0 ? Math.round((loaded / total) * 100) : 0
          upgradeProgress.value = percent
          addLog(`Upload progress: ${percent}%`, 'info')
        },
      }
    )

    if (response.success) {
      addLog('Upload completed successfully', 'success')
      addLog(`Response: ${JSON.stringify(response.data || response)}`, 'info')
      ElMessage.success('Upgrade package uploaded successfully')
      upgradeFileList.value = []
    } else {
      addLog(`Upload failed: ${response.message || 'Unknown error'}`, 'error')
      ElMessage.error(response.message || 'Upload failed')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Upload failed:', error)
      addLog(`Upload error: ${error.message || 'Unknown error'}`, 'error')
      ElMessage.error(error.message || 'Upload failed')
    }
  } finally {
    upgradeUploadLoading.value = false
    upgradeProgress.value = 0
    if (timeInterval) {
      clearInterval(timeInterval)
      timeInterval = null
    }
  }
}

// 组件卸载时清理定时器
onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style lang="scss" scoped>

.system-config {
  height: 100%;
  display: flex;
  flex-direction: column;
  // padding: 20px;

  &__header {
    margin-bottom: 24px;
  }

  &__title {
    font-size: $font-size-large;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
    margin: 0;
  }

  &__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  &__card {
    border-radius: $border-radius-medium;
    box-shadow: $box-shadow-base;

    &-header {
      font-weight: $font-weight-semibold;
      font-size: $font-size-base;
      color: $text-color-primary;
    }

    &-body {
      padding: 20px;
    }
  }

  &__actions {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  &__hint {
    font-size: $font-size-small;
    color: $text-color-secondary;
    margin: 0;
  }

  &__upload-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__upload {
    width: 100%;
  }

  &__upload-btn {
    align-self: flex-start;
  }

  &__logs {
    margin-top: 24px;
    border: 1px solid $border-color-base;
    border-radius: $border-radius-small;
    background: $bg-color-overlay;
    max-height: 400px;
    display: flex;
    flex-direction: column;

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid $border-color-base;
      font-weight: $font-weight-semibold;
      font-size: $font-size-base;
      color: $text-color-primary;
    }

    &-content {
      flex: 1;
      padding: 12px 16px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: $font-size-small;
    }
  }

  &__log-item {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    line-height: 1.6;

    &.log-info {
      color: $text-color-primary;
    }

    &.log-success {
      color: $success-color;
    }

    &.log-error {
      color: $danger-color;
    }
  }

  &__log-time {
    color: $text-color-secondary;
    min-width: 80px;
  }

  &__log-message {
    flex: 1;
    word-break: break-word;
  }
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload__tip) {
  margin-top: 8px;
  font-size: $font-size-small;
  color: $text-color-secondary;
}
</style>

