<template>
  <div class="system-configuration">
    <div class="system-configuration__header">
      <h2 class="system-configuration__title">System Config</h2>
    </div>

    <div class="system-configuration__content">
      <el-card class="system-configuration__card system-configuration__card--fixed">
        <template #header>
          <div class="system-configuration__card-header">
            <span>Configuration File Management</span>
          </div>
        </template>
        <div class="system-configuration__card-body">
          <div class="system-configuration__actions">
            <el-button type="primary" @click="handleConfigImport" :loading="configImportLoading">
              Import Configuration (.zip)
            </el-button>
            <el-button type="primary" @click="handleConfigExport" :loading="configExportLoading">
              Export Configuration (.zip)
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card
        class="system-configuration__card"
        :class="{ 'system-configuration__card--expand': upgradeStatusVisible }"
      >
        <template #header>
          <div class="system-configuration__card-header">
            <span>Firmware Upgrade</span>
          </div>
        </template>
        <div class="system-configuration__card-body">
          <div class="system-configuration__upload-section">
            <div class="system-configuration__upload-actions">
              <el-upload
                ref="upgradeUploadRef"
                class="system-configuration__upload"
                :auto-upload="false"
                :on-change="handleUpgradeFileChange"
                :on-remove="handleUpgradeFileRemove"
                accept=".run"
                :limit="1"
                :file-list="upgradeFileList"
                :show-file-list="false"
              >
                <template #trigger>
                  <el-button type="primary" :loading="upgradeUploadLoading">
                    Upload Upgrade Package (.run)
                  </el-button>
                </template>
              </el-upload>

              <el-button
                v-if="upgradeUploadLoading"
                type="danger"
                plain
                @click="handleUpgradeAbort"
                :disabled="upgradeAbortLoading"
              >
                Abort Upgrade
              </el-button>
            </div>

            <div v-if="upgradeProgressVisible" class="system-configuration__upload-progress">
              <el-progress :percentage="upgradeUploadProgress" :stroke-width="6" />
              <div class="system-configuration__upload-progress-text">
                {{ upgradeUploadProgressText }}
              </div>
            </div>
          </div>

          <div v-if="upgradeStatusVisible" class="system-configuration__upgrade-status">
            <div class="system-configuration__upgrade-status-header">
              <span>Upgrade Logs</span>
            </div>
            <div ref="upgradeStatusBodyRef" class="system-configuration__upgrade-status-body">
              <!-- <div class="system-configuration__upgrade-status-message">{{ upgradeStatusMessage }}</div> -->
              <pre v-if="upgradeStatusLog" class="system-configuration__upgrade-status-log">{{ upgradeStatusLog }}</pre>
            </div>
          </div>
        </div>
      </el-card>
    </div>

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
import { ref, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadFiles } from 'element-plus'
import {
  abortUpgrade,
  cancelUpgradeUpload,
  downloadConfigExport,
  getUpgradeStatus,
  importConfigFile,
  uploadUpgradePackage,
} from '@/api/systemConfig'

const configFileInputRef = ref<HTMLInputElement>()
const configImportLoading = ref(false)
const configExportLoading = ref(false)

const upgradeUploadRef = ref()
const upgradeFileList = ref<UploadFile[]>([])
const upgradeUploadLoading = ref(false)
const upgradeAbortLoading = ref(false)
const upgradeStatusVisible = ref(false)
// const upgradeStatusMessage = ref('')
const upgradeStatusLog = ref('')
const upgradeStatusBodyRef = ref<HTMLElement | null>(null)
const upgradeStatusTimer = ref<number | null>(null)
const upgradeStatusPolling = ref(false)
const upgradeUploadProgress = ref(0)
const upgradeUploadProgressText = ref('')
const upgradeProgressVisible = ref(false)
const upgradeAbortTriggered = ref(false)

const resetUpgradeSelection = () => {
  upgradeUploadRef.value?.clearFiles?.()
  upgradeFileList.value = []
}

const resetUpgradeProgress = () => {
  upgradeUploadProgress.value = 0
  upgradeUploadProgressText.value = ''
  upgradeProgressVisible.value = false
}

const clearUpgradeStatus = () => {
  // upgradeStatusMessage.value = ''
  upgradeStatusLog.value = ''
}

const clearUpgradeStatusTimer = () => {
  if (upgradeStatusTimer.value !== null) {
    clearTimeout(upgradeStatusTimer.value)
    upgradeStatusTimer.value = null
  }
}

const stopUpgradeStatusPolling = () => {
  upgradeStatusPolling.value = false
  clearUpgradeStatusTimer()
}

const startUpgradeStatusPolling = () => {
  clearUpgradeStatusTimer()
  upgradeStatusVisible.value = true
  upgradeStatusPolling.value = true
  const fetchStatus = async () => {
    if (!upgradeStatusPolling.value) return
    try {
      const res = await getUpgradeStatus()
      if (res?.success) {
        const data = res.data || {}
        const status = String(data.status || '').toLowerCase()
        // upgradeStatusMessage.value = status === 'finished' ? 'Upgrade finished' : ''
        upgradeStatusLog.value = String(data.log_preview || '')
        if (status === 'finished') {
          stopUpgradeStatusPolling()
          upgradeUploadLoading.value = false
          resetUpgradeProgress()
          ElMessage.success('Upgrade finished')
          return
        }
      }
    } catch (error: any) {
      // upgradeStatusMessage.value = ''
    }
    if (upgradeStatusPolling.value) {
      upgradeStatusTimer.value = window.setTimeout(fetchStatus, 2000)
    }
  }
  void fetchStatus()
}

watch(upgradeStatusLog, async () => {
  await nextTick()
  const container = upgradeStatusBodyRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
})

const handleConfigImport = () => {
  if (configFileInputRef.value) {
    configFileInputRef.value.value = ''
  }
  configFileInputRef.value?.click()
}

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

    const response = await importConfigFile(formData)

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
    if (configFileInputRef.value) {
      configFileInputRef.value.value = ''
    }
  }
}

const handleConfigExport = async () => {
  try {
    configExportLoading.value = true
    await downloadConfigExport(`system_config_${Date.now()}.zip`)
  } catch (error: any) {
    console.error('Export failed:', error)
    ElMessage.error(error.message || 'Export failed')
  } finally {
    configExportLoading.value = false
  }
}

const handleUpgradeFileChange = (file: UploadFile, fileList: UploadFiles) => {
  if (file.raw && !file.raw.name.toLowerCase().endsWith('.run')) {
    ElMessage.error('Only .run files are supported')
    resetUpgradeSelection()
    return
  }
  upgradeFileList.value = fileList.slice(-1)
  if (upgradeFileList.value.length > 0 && !upgradeUploadLoading.value) {
    void handleUpgradeUpload()
  }
}

const handleUpgradeFileRemove = () => {
  resetUpgradeSelection()
}

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

  if (!file.name.toLowerCase().endsWith('.run')) {
    ElMessage.error('Only .run files are supported')
    return
  }

  try {
    await ElMessageBox.confirm(
      `Are you sure you want to upload the upgrade package: ${file.name}?`,
      'Confirm Upload',
      {
        confirmButtonText: 'Upload',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    )

    ElMessage.warning('Please do not close the window while the upgrade is running.')
    upgradeUploadLoading.value = true
    upgradeAbortTriggered.value = false
    upgradeStatusVisible.value = true
    clearUpgradeStatus()
    resetUpgradeProgress()
    upgradeProgressVisible.value = true
    upgradeUploadProgressText.value = 'Uploading... 0%'

    const response = await uploadUpgradePackage(file, {
      onUploadProgress: (event: any) => {
        if (!event?.total) return
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
        upgradeUploadProgress.value = percent
        upgradeUploadProgressText.value = `Uploading... ${percent}%`
      },
    })

    if (response.success) {
      ElMessage.success(response.message || 'Upgrade task started')
      upgradeProgressVisible.value = false
      startUpgradeStatusPolling()
      resetUpgradeSelection()
    } else {
      ElMessage.error(response.message || 'Upload failed')
      stopUpgradeStatusPolling()
      upgradeUploadLoading.value = false
      resetUpgradeProgress()
    }
  } catch (error: any) {
    const isCanceled =
      upgradeAbortTriggered.value ||
      error?.code === 'ERR_CANCELED' ||
      error?.message === '请求被取消'
    if (!isCanceled && error !== 'cancel') {
      console.error('Upload failed:', error)
      ElMessage.error(error.message || 'Upload failed')
    }
    stopUpgradeStatusPolling()
    upgradeUploadLoading.value = false
    resetUpgradeProgress()
  } finally {
    resetUpgradeSelection()
  }
}

const handleUpgradeAbort = async () => {
  if (upgradeAbortLoading.value) return
  try {
    upgradeAbortLoading.value = true
    upgradeAbortTriggered.value = true
    cancelUpgradeUpload()
    await abortUpgrade()
    ElMessage.success('Upgrade aborted')
    upgradeUploadLoading.value = false
    resetUpgradeProgress()
  } catch (error: any) {
    console.error('Abort failed:', error)
    ElMessage.error(error.message || 'Abort failed')
  } finally {
    upgradeAbortLoading.value = false
    upgradeAbortTriggered.value = false
  }
}

onUnmounted(() => {
  stopUpgradeStatusPolling()
})
</script>

<style lang="scss" scoped>
.system-configuration {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-configuration__header {
  margin-bottom: 24px;
}

.system-configuration__title {
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin: 0;
}

.system-configuration__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.system-configuration__card {
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
}

.system-configuration__card-header {
  font-weight: $font-weight-semibold;
  font-size: $font-size-base;
  color: $text-color-primary;
}

.system-configuration__card--expand {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-configuration__card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.system-configuration__actions {
  display: flex;
  gap: 16px;
}

.system-configuration__upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  flex-shrink: 0;
}

.system-configuration__upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.system-configuration__upload {
  width: auto;
  align-self: flex-start;
}

.system-configuration__upload-progress {
  width: 100%;
  max-width: 420px;
}

:deep(.system-configuration__upload-progress .el-progress-bar__inner)  {
  background-color: $primary-color;
}

.system-configuration__upload-progress-text {
  margin-top: 6px;
  font-size: $font-size-small;
  color: $text-color-secondary;
}

.system-configuration__upgrade-status {
  margin-top: 16px;
  border: 1px solid $border-color-base;
  border-radius: $border-radius-small;
  background: $bg-color-overlay;
  display: flex;
  flex-direction: column;
  height: calc(100% - 48px);
}

.system-configuration__upgrade-status-header {
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-base;
  font-weight: $font-weight-semibold;
  font-size: $font-size-base;
  color: $text-color-primary;
}

.system-configuration__upgrade-status-body {
  padding: 12px 14px;
  // height: calc(100% - 41px);
  flex:1;
  overflow: auto;
}

// .system-configuration__upgrade-status-message {
//   color: $text-color-primary;
//   margin-bottom: 8px;
//   word-break: break-word;
// }

.system-configuration__upgrade-status-log {
  margin: 0;
  max-height: 100%;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: $font-size-small;
  color: $text-color-secondary;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload__tip) {
  margin-top: 8px;
  font-size: $font-size-small;
  color: $text-color-secondary;
}
:deep(.el-card__body){
  height: calc(100% - 57px);
}
</style>
