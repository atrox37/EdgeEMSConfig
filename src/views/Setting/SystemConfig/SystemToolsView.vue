<template>
  <div class="system-tools">
    <div class="system-tools__header">
      <h2 class="system-tools__title">System Tools</h2>
      <p class="system-tools__desc">
        Manage full-system files and firmware lifecycle tasks from a single workspace with clear operation status feedback.
      </p>
    </div>

    <div class="system-tools__content">
      <el-card class="system-tools__card system-tools__card--fixed">
        <template #header>
          <div class="system-tools__card-header">
            <span class="system-tools__card-title">Config Files</span>
            <span class="system-tools__card-desc">
              Import an archived configuration package for quick recovery, or export the current settings for backup and migration.
            </span>
          </div>
        </template>
        <div class="system-tools__card-body">
          <div class="system-tools__actions">
            <el-button type="primary" @click="handleConfigImport" :loading="configImportLoading">
              Import Configuration (.zip)
            </el-button>
            <el-button type="primary" @click="handleConfigExport" :loading="configExportLoading">
              Export Configuration (.zip)
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card class="system-tools__card system-tools__card--expand">
        <template #header>
          <div class="system-tools__card-header">
            <span class="system-tools__card-title">Firmware</span>
            <span class="system-tools__card-desc">
              Upload a validated firmware package, monitor upgrade progress continuously, and review logs throughout the process.
            </span>
          </div>
        </template>
        <div class="system-tools__card-body">
          <div class="system-tools__upload-section">
            <div class="system-tools__upload-actions">
              <el-upload
                ref="upgradeUploadRef"
                class="system-tools__upload"
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
              <span v-if="upgradeUploadLoading" class="system-tools__upload-hint-container">
                <AppIcon name="i-tabler-alert-triangle-filled" className="system-tools__upload-hint-icon" />
                <span class="system-tools__upload-hint-text">
                  Please do not close the window while the upgrade is running.
                </span>
              </span>
            </div>
          </div>

          <div class="system-tools__upgrade-status">
            <div class="system-tools__upgrade-status-header">
              <span>Upgrade Logs</span>
            </div>
            <div ref="upgradeStatusBodyRef" class="system-tools__upgrade-status-body">
              <pre
                v-if="upgradeStatusLog"
                ref="upgradeStatusLogRef"
                class="system-tools__upgrade-status-log"
              >{{ upgradeStatusLog }}</pre>
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
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type UploadFile, type UploadFiles } from 'element-plus'
import {
  abortUpgrade,
  cancelUpgradeUpload,
  downloadConfigExport,
  getUpgradeStatus,
  importConfigFile,
  uploadUpgradePackage,
} from '@/api/systemConfig'
import AppIcon from '@/components/AppIcon.vue'

const configFileInputRef = ref<HTMLInputElement>()
const configImportLoading = ref(false)
const configExportLoading = ref(false)

const upgradeUploadRef = ref()
const upgradeFileList = ref<UploadFile[]>([])
const upgradeUploadLoading = ref(false)
const upgradeAbortLoading = ref(false)
const upgradeStatusLog = ref('')
const upgradeStatusBodyRef = ref<HTMLElement | null>(null)
const upgradeStatusLogRef = ref<HTMLElement | null>(null)
const upgradeStatusTimer = ref<number | null>(null)
const upgradeStatusPolling = ref(false)
const upgradeAbortTriggered = ref(false)

const resetUpgradeSelection = () => {
  upgradeUploadRef.value?.clearFiles?.()
  upgradeFileList.value = []
}

const clearUpgradeStatus = () => {
  // Clear logs before each new upload.
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
  upgradeStatusPolling.value = true
  const fetchStatus = async () => {
    if (!upgradeStatusPolling.value) return
    try {
      const res = await getUpgradeStatus()
      if (res?.success) {
        const data = res.data || {}
        const status = String(data.status || '').toLowerCase()
        upgradeStatusLog.value = String(data.log_preview || '')
        await nextTick()
        const scrollEl = upgradeStatusLogRef.value ?? upgradeStatusBodyRef.value
        if (scrollEl) {
          scrollEl.scrollTop = scrollEl.scrollHeight
        }
        if (status === 'finished') {
          stopUpgradeStatusPolling()
          upgradeUploadLoading.value = false
          ElMessage.success('Upgrade finished')
          return
        }
      }
    } catch {
      // ignore polling errors
    }
    if (upgradeStatusPolling.value) {
      upgradeStatusTimer.value = window.setTimeout(fetchStatus, 2000)
    }
  }
  void fetchStatus()
}

watch(upgradeStatusLog, async () => {
  await nextTick()
  const scrollEl = upgradeStatusLogRef.value ?? upgradeStatusBodyRef.value
  if (scrollEl) {
    scrollEl.scrollTop = scrollEl.scrollHeight
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
    } 
  } catch (error: any) {
    console.error('Import failed:', error)
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
      },
    )

    upgradeUploadLoading.value = true
    upgradeAbortTriggered.value = false
    clearUpgradeStatus()

    const response = await uploadUpgradePackage(file)

    if (response.success) {
      startUpgradeStatusPolling()
      resetUpgradeSelection()
    } else {
      // ElMessage.error(response.message || 'Upload failed')
      stopUpgradeStatusPolling()
      upgradeUploadLoading.value = false
    }
  } catch (error: any) {
    const isCanceled =
      upgradeAbortTriggered.value || error?.code === 'ERR_CANCELED' || error?.message === '请求被取消'
    if (!isCanceled && error !== 'cancel') {
      console.error('Upload failed:', error)
      // ElMessage.error(error.message || 'Upload failed')
    }
    stopUpgradeStatusPolling()
    upgradeUploadLoading.value = false
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
  } catch (error: any) {
    console.error('Abort failed:', error)
    // ElMessage.error(error.message || 'Abort failed')
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
.system-tools {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-tools__header {
  margin-bottom: 24px;
}

.system-tools__title {
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
  margin: 0;
}

.system-tools__desc {
  margin: 8px 0 0;
  font-size: $font-size-small;
  color: $text-color-secondary;
  line-height: 1.6;
}

.system-tools__content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.system-tools__card {
  border-radius: $border-radius-base;
  box-shadow: $box-shadow-base;
}

.system-tools__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.system-tools__card-title {
  font-weight: $font-weight-semibold;
  font-size: $font-size-base;
  color: $text-color-primary;
}

.system-tools__card-desc {
  font-size: $font-size-small;
  color: $text-color-secondary;
  font-weight: $font-weight-normal;
}

.system-tools__card--expand {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-tools__card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.system-tools__actions {
  display: flex;
  gap: 16px;
}

.system-tools__upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  flex-shrink: 0;
}

.system-tools__upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.system-tools__upload-hint-container {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: $font-size-small;
  color: $warning-color;
}

.system-tools__upload {
  width: auto;
  align-self: flex-start;
}

.system-tools__upgrade-status {
  margin-top: 16px;
  border: 1px solid $border-color-base;
  border-radius: $border-radius-small;
  background: $bg-color-overlay;
  display: flex;
  flex-direction: column;
  height: calc(100% - 48px);
}

.system-tools__upgrade-status-header {
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-base;
  font-weight: $font-weight-semibold;
  font-size: $font-size-base;
  color: $text-color-primary;
}

.system-tools__upgrade-status-body {
  padding: 12px 14px;
  height: calc(100% - 41px);
  overflow: auto;
}

.system-tools__upgrade-status-log {
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
</style>
