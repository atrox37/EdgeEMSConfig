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
                :disabled="upgradeUploadLoading"
                :on-change="handleUpgradeFileChange"
                :on-remove="handleUpgradeFileRemove"
                accept=".run"
                :limit="1"
                :file-list="upgradeFileList"
                :show-file-list="false"
              >
                <template #trigger>
                  <el-button
                    type="primary"
                    :loading="upgradeUploadLoading"
                    :disabled="upgradeUploadLoading"
                  >
                    Upload Upgrade Package (.run)
                  </el-button>
                </template>
              </el-upload>

              <!-- 文件传输阶段：取消上传 -->
              <el-button
                v-if="upgradeUploadLoading && showUploadProgress"
                type="danger"
                plain
                @click="handleCancelUpload"
              >
                Cancel Upload
              </el-button>

              <!-- 升级脚本执行阶段：中止升级 -->
              <el-button
                v-if="upgradeUploadLoading && isRunningPhase"
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

          <!-- 文件上传进度（HTTP POST 飞行中 或 服务端确认 uploading） -->
          <div v-if="upgradeUploadLoading && showUploadProgress" class="system-tools__upload-progress">
            <div class="system-tools__upload-progress-header">
              <span class="system-tools__upload-progress-label">Uploading firmware package...</span>
              <span class="system-tools__upload-progress-size">
                <template v-if="uploadTotalBytes > 0">
                  {{ (uploadReceivedBytes / 1024 / 1024).toFixed(1) }} MB / {{ (uploadTotalBytes / 1024 / 1024).toFixed(1) }} MB
                </template>
                <template v-else-if="uploadReceivedBytes > 0">
                  {{ (uploadReceivedBytes / 1024 / 1024).toFixed(1) }} MB uploaded
                </template>
              </span>
            </div>
            <el-progress
              v-if="uploadProgressPct !== null"
              :percentage="uploadProgressPct"
              :stroke-width="8"
              :show-text="true"
              :format="(p: number) => `${p.toFixed(1)}%`"
              class="system-tools__upload-progress-bar"
            />
            <el-progress
              v-else
              :percentage="100"
              :stroke-width="8"
              :show-text="false"
              status=""
              striped
              striped-flow
              :duration="12"
              class="system-tools__upload-progress-bar"
            />
          </div>

          <div class="system-tools__upgrade-status">
            <div class="system-tools__upgrade-status-header">
              <span>Upgrade Logs</span>
              <span v-if="isRunningPhase" class="system-tools__upgrade-status-running">
                <span class="system-tools__running-dot" />
                Running
              </span>
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

// 当前升级阶段（来自 API detail.status）
const upgradeDetailStatus = ref<'idle' | 'uploading' | 'running' | 'completed' | 'failed' | 'aborted' | ''>('')
// 文件上传进度（仅 detail.status === 'uploading' 时有意义）
const uploadProgressPct = ref<number | null>(null)
const uploadReceivedBytes = ref(0)
const uploadTotalBytes = ref(0)

// HTTP POST 发出但服务端尚未确认 uploading 的过渡阶段
// 用于在进度条首次出现时显示不确定动画，避免手动设置 upgradeDetailStatus 引起的闪烁
const isPreUploadPhase = ref(false)

// 互斥锁：预检或确认框阶段防止并发进入（upgradeUploadLoading 在此阶段还是 false）
const isUpgradePreChecking = ref(false)

// 本轮轮询是否已经见过至少一次活跃状态（uploading / running）
// 未见过活跃状态时忽略 terminal 状态，防止把上次残留的 completed/failed 误判为本次结束
const seenActiveInSession = ref(false)

// 是否正在传输文件（用于控制 Abort 按钮显示 & 进度条显示）
const isUploadingPhase = computed(() => upgradeDetailStatus.value === 'uploading')
// 是否正在执行升级脚本
const isRunningPhase = computed(() => upgradeDetailStatus.value === 'running')
// 需要显示上传进度区块
const showUploadProgress = computed(() => isPreUploadPhase.value || isUploadingPhase.value)

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

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'aborted'])
const ACTIVE_STATUSES = new Set(['uploading', 'running'])

const startUpgradeStatusPolling = () => {
  clearUpgradeStatusTimer()
  upgradeStatusPolling.value = true
  seenActiveInSession.value = false  // 每次新轮询会话重置
  const fetchStatus = async () => {
    if (!upgradeStatusPolling.value) return
    try {
      const res = await getUpgradeStatus()
      if (res?.success) {
        const data = res.data || {}
        const detailStatus = String(data.detail?.status || '').toLowerCase() as typeof upgradeDetailStatus.value

        // 终态且本次会话尚未激活 → 上次残留的旧状态，跳过所有处理，保持不确定进度条
        if (TERMINAL_STATUSES.has(detailStatus) && !seenActiveInSession.value) {
          // 什么都不做，继续轮询等待本次 uploading/running
        } else {
          // 一旦见到活跃状态，标记本次会话已激活
          if (ACTIVE_STATUSES.has(detailStatus)) {
            seenActiveInSession.value = true
            if (detailStatus === 'uploading') {
              isPreUploadPhase.value = false
            }
          }

          upgradeDetailStatus.value = detailStatus

          if (detailStatus === 'uploading') {
            const up = data.upload || {}
            uploadReceivedBytes.value = up.received_bytes ?? 0
            uploadTotalBytes.value = up.total_bytes ?? 0
            uploadProgressPct.value = up.progress_pct ?? null
          } else if (detailStatus === 'running' || TERMINAL_STATUSES.has(detailStatus)) {
            isPreUploadPhase.value = false
            uploadProgressPct.value = null
            upgradeStatusLog.value = String(data.log || '')
            await nextTick()
            const scrollEl = upgradeStatusLogRef.value ?? upgradeStatusBodyRef.value
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight
          }

          if (TERMINAL_STATUSES.has(detailStatus)) {
            stopUpgradeStatusPolling()
            upgradeUploadLoading.value = false
            if (detailStatus === 'completed') {
              ElMessage.success(data.detail?.message || 'Upgrade completed successfully')
            } else {
              ElMessage.error(data.detail?.message || `Upgrade failed (${detailStatus})`)
            }
            return
          }
        }
      }
    } catch {
      // 轮询期间忽略单次请求失败，继续重试
    }
    if (upgradeStatusPolling.value) {
      upgradeStatusTimer.value = window.setTimeout(fetchStatus, 1500)
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
  // 升级进行中或预检/确认阶段禁止响应新的文件选择
  if (upgradeUploadLoading.value || isUpgradePreChecking.value) return
  // el-upload on-change 在文件状态变化时也会触发，只处理刚选中的文件
  if (file.status !== 'ready') return

  if (file.raw && !file.raw.name.toLowerCase().endsWith('.run')) {
    ElMessage.error('Only .run files are supported')
    resetUpgradeSelection()
    return
  }
  upgradeFileList.value = fileList.slice(-1)
  if (upgradeFileList.value.length > 0) {
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

  // 互斥：预检 + 确认阶段加锁，防止并发调用绕过预检
  if (isUpgradePreChecking.value) return
  isUpgradePreChecking.value = true

  try {
    // 第1步：预检当前服务端状态，防止覆盖正在进行的升级
    try {
      const statusRes = await getUpgradeStatus()
      if (statusRes?.success) {
        const preStatus = String(statusRes.data?.detail?.status || '').toLowerCase()
        if (preStatus === 'uploading' || preStatus === 'running') {
          ElMessage.warning('An upgrade is already in progress. Please wait for it to complete.')
          resetUpgradeSelection()
          return
        }
      }
    } catch {
      // 预检网络失败不阻断，继续让用户决定
    }

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
    isPreUploadPhase.value = true
    upgradeDetailStatus.value = ''
    uploadProgressPct.value = null
    uploadReceivedBytes.value = 0
    uploadTotalBytes.value = 0
    upgradeAbortTriggered.value = false
    clearUpgradeStatus()

    // 第2步：发起 POST，同时立即启动轮询（并发）
    // POST 飞行期间轮询展示 uploading 进度；POST 返回说明文件已传完且升级已启动
    const uploadPromise = uploadUpgradePackage(file)
    startUpgradeStatusPolling()

    const response = await uploadPromise
    isPreUploadPhase.value = false

    if (!response.success) {
      stopUpgradeStatusPolling()
      upgradeUploadLoading.value = false
      upgradeDetailStatus.value = ''
    }
    // POST 成功 → 轮询继续，自动处理 running / completed / failed
  } catch (error: any) {
    const isCanceled =
      upgradeAbortTriggered.value || error?.code === 'ERR_CANCELED' || error?.message === '请求被取消'
    if (!isCanceled && error !== 'cancel') {
      console.error('Upload failed:', error)
    }
    stopUpgradeStatusPolling()
    upgradeUploadLoading.value = false
    upgradeDetailStatus.value = ''
    isPreUploadPhase.value = false
  } finally {
    isUpgradePreChecking.value = false
    resetUpgradeSelection()
  }
}

const handleCancelUpload = () => {
  cancelUpgradeUpload()
  stopUpgradeStatusPolling()
  upgradeUploadLoading.value = false
  isPreUploadPhase.value = false
  upgradeDetailStatus.value = ''
  ElMessage.info('Upload cancelled')
}

const handleUpgradeAbort = async () => {
  if (upgradeAbortLoading.value) return
  try {
    upgradeAbortLoading.value = true
    upgradeAbortTriggered.value = true
    await abortUpgrade()
    ElMessage.success('Upgrade aborted')
    upgradeUploadLoading.value = false
    upgradeDetailStatus.value = ''
    isPreUploadPhase.value = false
  } catch (error: any) {
    console.error('Abort failed:', error)
  } finally {
    upgradeAbortLoading.value = false
    upgradeAbortTriggered.value = false
    stopUpgradeStatusPolling()
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

.system-tools__upload-progress {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid $border-color-base;
  border-radius: $border-radius-small;
  background: $bg-color-overlay;
  flex-shrink: 0;
}

.system-tools__upload-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.system-tools__upload-progress-label {
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.system-tools__upload-progress-size {
  font-size: $font-size-small;
  color: $text-color-secondary;
  font-variant-numeric: tabular-nums;
}

.system-tools__upload-progress-bar {
  :deep(.el-progress-bar__inner) {
    background-color: $primary-color;
    transition: width 0.4s ease;
  }
}

.system-tools__upgrade-status-running {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: $font-size-small;
  color: $primary-color;
  font-weight: $font-weight-normal;
}

.system-tools__running-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: $primary-color;
  animation: running-pulse 1.4s ease-in-out infinite;
}

@keyframes running-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.7); }
}
</style>
