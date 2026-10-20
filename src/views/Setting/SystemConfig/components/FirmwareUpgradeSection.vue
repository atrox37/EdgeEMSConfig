<template>
  <el-card class="system-tools__card system-tools__card--expand firmware-upgrade">
    <template #header>
      <div class="system-tools__card-header">
        <span class="system-tools__card-title">Firmware</span>
        <span class="system-tools__card-desc">
          Upload a validated firmware package, monitor upgrade progress
          continuously, and review logs throughout the process.
        </span>
      </div>
    </template>

    <div class="firmware-upgrade__body">
      <div class="firmware-upgrade__upload-section">
        <div v-permission="'engineer'" class="firmware-upgrade__upload-actions">
          <el-upload
            ref="upgradeUploadRef"
            class="firmware-upgrade__upload"
            :auto-upload="false"
            :disabled="uploadDisabled"
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
                :disabled="uploadDisabled"
              >
                Upload Upgrade Package (.run)
              </el-button>
            </template>
          </el-upload>

          <el-button
            v-if="upgradeUploadLoading && showUploadProgress"
            type="danger"
            plain
            @click="handleCancelUpload"
          >
            Cancel Upload
          </el-button>

          <el-button
            v-if="upgradeUploadLoading && isRunningPhase"
            type="danger"
            plain
            @click="handleUpgradeAbort"
            :disabled="upgradeAbortLoading"
          >
            Abort Upgrade
          </el-button>

          <span
            v-if="upgradeUploadLoading"
            class="firmware-upgrade__upload-hint-container"
          >
            <AppIcon
              name="i-tabler-alert-triangle-filled"
              className="firmware-upgrade__upload-hint-icon"
            />
            <span class="firmware-upgrade__upload-hint-text">
              Please do not close the window while the upgrade is running.
            </span>
          </span>
        </div>
      </div>

      <div
        v-if="upgradeUploadLoading && showUploadProgress"
        class="firmware-upgrade__upload-progress"
      >
        <div class="firmware-upgrade__upload-progress-header">
          <span class="firmware-upgrade__upload-progress-label"
            >Uploading firmware package...</span
          >
          <span class="firmware-upgrade__upload-progress-size">
            <template v-if="uploadTotalBytes > 0">
              {{ (uploadReceivedBytes / 1024 / 1024).toFixed(1) }} MB /
              {{ (uploadTotalBytes / 1024 / 1024).toFixed(1) }} MB
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
          class="firmware-upgrade__upload-progress-bar"
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
          class="firmware-upgrade__upload-progress-bar"
        />
      </div>

      <div class="firmware-upgrade__status">
        <div class="firmware-upgrade__status-header">
          <span>Upgrade Logs</span>
          <span
            v-if="isRunningPhase"
            class="firmware-upgrade__status-running"
          >
            <span class="firmware-upgrade__running-dot" />
            Running
          </span>
        </div>
        <div ref="upgradeStatusBodyRef" class="firmware-upgrade__status-body">
          <pre
            v-if="upgradeStatusLog"
            ref="upgradeStatusLogRef"
            class="firmware-upgrade__status-log"
            >{{ upgradeStatusLog }}</pre
          >
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from "vue";
import AppIcon from "@/components/AppIcon.vue";
import { useFirmwareUpgrade } from "@/composables/useFirmwareUpgrade";

const props = defineProps<{
  blocked?: boolean;
  appendTo: HTMLElement | null;
}>();

const emit = defineEmits<{
  "busy-change": [busy: boolean];
}>();

const {
  upgradeUploadRef,
  upgradeFileList,
  upgradeUploadLoading,
  upgradeAbortLoading,
  upgradeStatusLog,
  upgradeStatusBodyRef,
  upgradeStatusLogRef,
  uploadProgressPct,
  uploadReceivedBytes,
  uploadTotalBytes,
  isRunningPhase,
  showUploadProgress,
  handleUpgradeFileChange,
  handleUpgradeFileRemove,
  handleCancelUpload,
  handleUpgradeAbort,
} = useFirmwareUpgrade({ appendToRef: toRef(props, "appendTo") });

const uploadDisabled = computed(
  () => Boolean(props.blocked) || upgradeUploadLoading.value,
);

watch(
  upgradeUploadLoading,
  (busy) => {
    emit("busy-change", busy);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.firmware-upgrade.system-tools__card--expand {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--vt-radius-md);
  box-shadow: var(--vt-shadow-base);
}

.system-tools__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.system-tools__card-title {
  font-weight: var(--vt-font-weight-semibold);
  font-size: var(--vt-font-size-base);
  color: var(--vt-text-primary);
}

.system-tools__card-desc {
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  font-weight: var(--vt-font-weight-normal);
}

.firmware-upgrade__body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.firmware-upgrade__upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
  flex-shrink: 0;
}

.firmware-upgrade__upload-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.firmware-upgrade__upload-hint-container {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-color-warning);
}

.firmware-upgrade__upload {
  width: auto;
  align-self: flex-start;
}

.firmware-upgrade__status {
  margin-top: 16px;
  border: 1px solid var(--vt-border-color);
  border-radius: var(--vt-radius-sm);
  display: flex;
  flex-direction: column;
  height: calc(100% - 48px);
}

.firmware-upgrade__status-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--vt-border-color);
  font-weight: var(--vt-font-weight-semibold);
  font-size: var(--vt-font-size-base);
  color: var(--vt-text-primary);
}

.firmware-upgrade__status-body {
  padding: 12px 14px;
  height: calc(100% - 41px);
  overflow: auto;
}

.firmware-upgrade__status-log {
  margin: 0;
  max-height: 100%;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
}

:deep(.el-upload) {
  width: 100%;
}

.firmware-upgrade__upload-progress {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid var(--vt-border-color);
  border-radius: var(--vt-radius-sm);
  background: var(--vt-bg-overlay);
  flex-shrink: 0;
}

.firmware-upgrade__upload-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.firmware-upgrade__upload-progress-label {
  font-size: var(--vt-font-size-sm);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.firmware-upgrade__upload-progress-size {
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  font-variant-numeric: tabular-nums;
}

.firmware-upgrade__upload-progress-bar {
  :deep(.el-progress-bar__inner) {
    background-color: var(--vt-color-primary);
    transition: width 0.4s ease;
  }
}

.firmware-upgrade__status-running {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-color-primary);
  font-weight: var(--vt-font-weight-normal);
}

.firmware-upgrade__running-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--vt-color-primary);
  animation: firmware-running-pulse 1.4s ease-in-out infinite;
}

@keyframes firmware-running-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.35;
    transform: scale(0.7);
  }
}
</style>
