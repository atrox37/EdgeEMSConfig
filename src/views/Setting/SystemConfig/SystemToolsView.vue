<template>
  <div class="system-tools" ref="systemToolsRef">
    <div class="system-tools__header">
      <h2 class="system-tools__title">System Tools</h2>
      <p class="system-tools__desc">
        Manage full-system files and firmware lifecycle tasks from a single
        workspace with clear operation status feedback.
      </p>
    </div>

    <div class="system-tools__content">
      <el-card class="system-tools__card system-tools__card--fixed">
        <template #header>
          <div class="system-tools__card-header">
            <span class="system-tools__card-title"
              >Configuration Backup & Recovery</span
            >
            <span class="system-tools__card-desc">
              Create local restore points or export portable backup packages for
              recovery and migration.
            </span>
          </div>
        </template>
        <div class="system-tools__card-body">
          <div class="system-tools__current" v-loading="currentVersionLoading">
            <div class="system-tools__current-title">Latest Restore Point</div>
            <div class="system-tools__current-meta">
              <div class="system-tools__current-row">
                <span class="system-tools__current-label">Restore Point:</span>
                <span class="system-tools__current-value">{{
                  currentVersionText
                }}</span>
                <span
                  v-if="currentInitialized"
                  class="system-tools__current-badge"
                  >Active</span
                >
              </div>
              <div class="system-tools__current-row">
                <span class="system-tools__current-label">Activated:</span>
                <span class="system-tools__current-value">{{
                  currentUpdatedText
                }}</span>
              </div>
              <div class="system-tools__current-row">
                <span class="system-tools__current-label">Created by:</span>
                <span class="system-tools__current-value">{{
                  currentOperatorText
                }}</span>
              </div>
            </div>
          </div>

          <div class="system-tools__actions">
            <el-button
              type="primary"
              :disabled="configBusy"
              @click="openBackupDialog"
            >
              Create Restore Point
            </el-button>
            <el-button
              :disabled="configBusy && !configExportLoading"
              :loading="configExportLoading"
              @click="handleConfigExport"
            >
              Export Backup Package
            </el-button>
            <el-button
              v-permission="'engineer'"
              :disabled="configBusy"
              @click="openImportDialog"
            >
              Import Backup Package
            </el-button>
            <el-button :disabled="configBusy" @click="openHistoryDialog">
              View Restore Points
            </el-button>
          </div>

          <p class="system-tools__hint">
            Restore points stay on this site for quick rollback. Exported
            packages can be stored offline or used for migration. Before an
            import or restore, the system creates an automatic safety restore
            point.
          </p>
        </div>
      </el-card>

      <FirmwareUpgradeSection
        :append-to="systemToolsRef"
        :blocked="configDialogBusy"
        @busy-change="firmwareBusy = $event"
      />
    </div>

    <ConfigBackupDialog
      ref="backupDialogRef"
      @busy-change="backupBusy = $event"
      @created="refreshCurrentVersion"
    />
    <ConfigImportDialog
      ref="importDialogRef"
      @busy-change="importBusy = $event"
    />
    <ConfigVersionHistoryDialog
      ref="historyDialogRef"
      @busy-change="historyBusy = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useConfigOperationStore } from '@/stores/configOperation';
import { isRequestCanceled } from '@/utils/request';
import { ElMessage } from "element-plus";
import {
  downloadConfigExport,
  getCurrentConfigVersion,
} from "@/api/systemConfig";
import ConfigBackupDialog from "./components/ConfigBackupDialog.vue";
import ConfigImportDialog from "./components/ConfigImportDialog.vue";
import ConfigVersionHistoryDialog from "./components/ConfigVersionHistoryDialog.vue";
import FirmwareUpgradeSection from "./components/FirmwareUpgradeSection.vue";
import {
  buildConfigExportFilename,
  getConfigErrorMessage,
  formatRestorePointLabel,
} from "@/utils/configVersion";
import { formatDateTime } from "@/utils/date";
import type { ConfigCurrentVersion } from "@/types/systemConfig";

const systemToolsRef = ref<HTMLElement | null>(null);
const configOperation = useConfigOperationStore();
const configExportLoading = ref(false);
const currentVersionLoading = ref(false);
const currentInitialized = ref(false);
const currentVersion = ref<ConfigCurrentVersion | null>(null);
const backupBusy = ref(false);
const importBusy = ref(false);
const historyBusy = ref(false);
const firmwareBusy = ref(false);
const backupDialogRef = ref<{ open: () => void; close: () => void } | null>(
  null,
);
const importDialogRef = ref<{ open: () => void; close: () => void } | null>(
  null,
);
const historyDialogRef = ref<{ open: () => void; close: () => void } | null>(
  null,
);

const configDialogBusy = computed(
  () => backupBusy.value || importBusy.value || historyBusy.value,
);

const configBusy = computed(
  () =>
    configOperation.busy ||
    configExportLoading.value ||
    configDialogBusy.value ||
    firmwareBusy.value,
);

const currentVersionText = computed(() =>
  formatRestorePointLabel(currentVersion.value?.version),
);
const currentUpdatedText = computed(() =>
  formatDateTime(currentVersion.value?.updated_at),
);
const currentOperatorText = computed(
  () => currentVersion.value?.operator?.username || "-",
);

let currentVersionRequest = 0;
const refreshCurrentVersion = async () => {
  const requestId = ++currentVersionRequest;
  currentVersionLoading.value = true;
  try {
    const res = await getCurrentConfigVersion();
    if (requestId !== currentVersionRequest) return;
    currentInitialized.value = Boolean(res.initialized && res.data);
    currentVersion.value = res.data || null;
  } catch (error) {
    if (requestId !== currentVersionRequest || isRequestCanceled(error)) return;
    currentInitialized.value = false;
    currentVersion.value = null;
  } finally {
    if (requestId === currentVersionRequest) currentVersionLoading.value = false;
  }
};

const openImportDialog = () => {
  if (configBusy.value) return;
  importDialogRef.value?.open();
};

const openBackupDialog = () => {
  if (configBusy.value) return;
  backupDialogRef.value?.open();
};

const openHistoryDialog = () => {
  if (configBusy.value) return;
  historyDialogRef.value?.open();
};

const handleConfigExport = async () => {
  try {
    configExportLoading.value = true;
    await downloadConfigExport(
      buildConfigExportFilename(currentVersion.value?.version),
    );
  } catch (error) {
    ElMessage.error(getConfigErrorMessage(error, "Failed to export configuration"));
  } finally {
    configExportLoading.value = false;
  }
};

onMounted(() => {
  void refreshCurrentVersion();
});

watch(() => configOperation.configurationRevision, () => {
  void refreshCurrentVersion();
});
</script>

<style lang="scss" scoped>
.system-tools {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-tools__header {
  margin-bottom: 16px;
}

.system-tools__title {
  margin: 0;
  height: 32px;
  line-height: 32px;
  font-size: var(--vt-font-size-md);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-tools__desc {
  margin: 8px 0 0;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
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

.system-tools__card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.system-tools__current {
  margin-bottom: 16px;
}

.system-tools__current-title {
  margin-bottom: 10px;
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-tools__current-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.system-tools__current-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
}

.system-tools__current-label {
  color: var(--vt-text-secondary);
}

.system-tools__current-value {
  color: var(--vt-text-primary);
}

.system-tools__current-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  background: rgba($success-color, 0.12);
  color: var(--vt-color-success);
  font-size: var(--vt-font-size-xs);
  font-weight: var(--vt-font-weight-medium);
}

.system-tools__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.system-tools__hint {
  margin: 12px 0 0;
  font-size: var(--vt-font-size-sm);
  line-height: 1.6;
  color: var(--vt-text-secondary);
}
</style>
