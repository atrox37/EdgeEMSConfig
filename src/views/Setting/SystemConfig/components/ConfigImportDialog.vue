<template>
  <FormDialog
    ref="dialogRef"
    title="Import Backup Package"
    width="600px"
    dialog-class="config-import-dialog-wrapper"
    :before-close="handleDialogBeforeClose"
  >
    <template #dialog-body>
      <div class="config-import-dialog" v-loading="applying">
        <el-upload
          ref="uploadRef"
          class="config-import-dialog__upload"
          drag
          accept=".zip"
          :auto-upload="false"
          :disabled="busy"
          :limit="1"
          :show-file-list="false"
          :file-list="fileList"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
        >
          <AppIcon
            name="i-tabler-file-zip"
            className="config-import-dialog__upload-icon"
          />
          <div class="config-import-dialog__upload-title">
            Drag or select a .zip backup package (Max 64M)
          </div>
        </el-upload>

        <div v-if="selectedFile" class="config-import-dialog__file">
          <AppIcon
            name="i-tabler-file"
            className="config-import-dialog__file-icon"
          />
          <div class="config-import-dialog__file-meta">
            <span class="config-import-dialog__file-name">{{
              selectedFile.name
            }}</span>
            <span class="config-import-dialog__file-size">{{
              formatConfigFileSize(selectedFile.size)
            }}</span>
          </div>
          <button
            type="button"
            class="config-import-dialog__file-remove"
            :disabled="busy"
            aria-label="Remove"
            @click="clearSelectedFile"
          >
            <AppIcon
              name="i-tabler-x"
              className="config-import-dialog__file-remove-icon"
            />
          </button>
        </div>

        <div v-if="selectedFile" class="config-import-dialog__checks">
          <div class="config-import-dialog__checks-title">Safety Checks</div>
          <div
            v-for="check in displayChecks"
            :key="check.code"
            class="config-import-dialog__check"
            :class="checkRowClass(check)"
          >
            <AppIcon
              :name="checkIcon(check)"
              :className="checkIconClass(check)"
            />
            <span class="config-import-dialog__check-label">{{
              getConfigCheckLabel(check.code)
            }}</span>
          </div>
        </div>

        <div
          v-if="showImportExpiryHint"
          class="config-import-dialog__expiry"
        >
          <AppIcon
            name="i-tabler-clock"
            className="config-import-dialog__expiry-icon"
          />
          <div class="config-import-dialog__expiry-text">
            <span>{{ importExpiryHint.guidance }}</span>
            <span
              v-if="importExpiryHint.expiresAtLabel"
              class="config-import-dialog__expiry-time"
            >
              {{ importExpiryHint.expiresAtLabel }}
            </span>
          </div>
        </div>

        <div class="config-import-dialog__notice">
          <AppIcon
            name="i-tabler-info-circle"
            className="config-import-dialog__notice-icon"
          />
          <span class="config-import-dialog__notice-text">{{
            importNotice
          }}</span>
        </div>
      </div>
    </template>
    <template #dialog-footer>
      <el-button :disabled="applying" @click="close">Cancel</el-button>
      <el-button
        type="primary"
        :loading="applying"
        :disabled="!canApply"
        @click="handleApply"
      >
        Apply Backup Package
      </el-button>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import {
  ElMessage,
  type UploadFile,
  type UploadFiles,
  type UploadInstance,
} from "element-plus";
import FormDialog from "@/components/dialog/FormDialog.vue";
import AppIcon from "@/components/AppIcon.vue";
import {
  applyConfigImport,
  cancelConfigImportValidate,
  validateConfigImport,
} from "@/api/systemConfig";
import type {
  ConfigImportCheck,
  ConfigImportValidateData,
} from "@/types/systemConfig";
import { isRequestCanceled } from "@/utils/request";
import {
  CONFIG_IMPORT_MAX_BYTES,
  formatConfigFileSize,
  formatConfigImportExpiryHint,
  getConfigCheckLabel,
  getConfigErrorMessage,
  getConfigImportValidateData,
  isConfigImportSessionUnavailableError,
} from "@/utils/configVersion";

const emit = defineEmits<{
  (e: "busy-change", busy: boolean): void;
  (e: "applied"): void;
}>();

const dialogRef = ref<InstanceType<typeof FormDialog> | null>(null);
const uploadRef = ref<UploadInstance>();
const fileList = ref<UploadFile[]>([]);
const selectedFile = ref<File | null>(null);
const validating = ref(false);
const applying = ref(false);
const importId = ref("");
const importExpiresAt = ref("");
const valid = ref(false);
const checks = ref<ConfigImportCheck[]>([]);
let validateSeq = 0;

const busy = computed(() => validating.value || applying.value);
const canApply = computed(
  () =>
    Boolean(valid.value && importId.value) &&
    !applying.value &&
    !validating.value,
);
const importNotice =
  "Applying this package replaces the current configuration. Local users and roles are kept, and an automatic safety restore point is created first.";
const defaultChecks: ConfigImportCheck[] = [
  { code: "archive_safety", passed: false },
  { code: "package_structure", passed: false },
  { code: "format_compatibility", passed: false },
  { code: "reference_integrity", passed: false },
];
const displayChecks = computed(() =>
  checks.value.length ? checks.value : defaultChecks,
);
const checksReady = computed(
  () => checks.value.length > 0 && !validating.value,
);
const showImportExpiryHint = computed(
  () => Boolean(valid.value && importId.value && !validating.value),
);
const importExpiryHint = computed(() =>
  formatConfigImportExpiryHint(importExpiresAt.value),
);

const checkRowClass = (check: ConfigImportCheck) => {
  if (!checksReady.value) return "is-pending";
  return check.passed ? "is-pass" : "is-fail";
};

const checkIcon = (check: ConfigImportCheck) => {
  if (!checksReady.value) return "i-tabler-circle-dashed";
  return check.passed ? "i-tabler-circle-check" : "i-tabler-circle-x";
};

const checkIconClass = (check: ConfigImportCheck) => {
  if (!checksReady.value) return "config-import-dialog__check-icon is-pending";
  return check.passed
    ? "config-import-dialog__check-icon is-pass"
    : "config-import-dialog__check-icon is-fail";
};

const emitBusy = () => {
  emit("busy-change", busy.value);
};

const resetState = (clearFiles = true) => {
  validateSeq += 1;
  cancelConfigImportValidate();
  fileList.value = [];
  selectedFile.value = null;
  importId.value = "";
  importExpiresAt.value = "";
  valid.value = false;
  checks.value = [];
  validating.value = false;
  applying.value = false;
  if (clearFiles) uploadRef.value?.clearFiles?.();
  emitBusy();
};

const clearSelectedFile = () => {
  if (applying.value) return;
  resetState();
};

const open = () => {
  resetState();
  if (dialogRef.value) dialogRef.value.dialogVisible = true;
};

const close = () => {
  if (applying.value) return;
  if (dialogRef.value) dialogRef.value.dialogVisible = false;
};

const handleDialogBeforeClose = (done: () => void) => {
  if (applying.value) return;
  resetState();
  done();
};

const resetImportSession = () => {
  importId.value = "";
  importExpiresAt.value = "";
  valid.value = false;
  checks.value = [];
};

const applyValidationResult = (data?: ConfigImportValidateData | null) => {
  importId.value = data?.import_id || "";
  importExpiresAt.value = data?.expires_at || "";
  valid.value = Boolean(data?.valid);
  checks.value = data?.checks || [];
};

const validateSelectedFile = async (file: File) => {
  if (!file.name.toLowerCase().endsWith(".zip")) {
    ElMessage.error("Please select a .zip file");
    resetState();
    return;
  }
  if (file.size > CONFIG_IMPORT_MAX_BYTES) {
    ElMessage.error("The configuration package exceeds 64M");
    resetState();
    return;
  }

  selectedFile.value = file;
  const seq = ++validateSeq;
  validating.value = true;
  emitBusy();
  try {
    const res = await validateConfigImport(file);
    if (seq !== validateSeq) return;
    applyValidationResult(res.data);
    if (!res.data?.valid) {
      ElMessage.warning("Configuration package validation failed");
    }
  } catch (error) {
    if (seq !== validateSeq || isRequestCanceled(error)) return;
    const failedData = getConfigImportValidateData(error);
    if (failedData) {
      applyValidationResult(failedData);
      ElMessage.warning("Configuration package validation failed");
      return;
    }
    applyValidationResult(null);
    ElMessage.error(
      getConfigErrorMessage(error, "Failed to validate configuration package"),
    );
  } finally {
    if (seq === validateSeq) {
      validating.value = false;
      emitBusy();
    }
  }
};

const handleFileChange = (file: UploadFile, files: UploadFiles) => {
  if (busy.value) return;
  if (file.status !== "ready") return;
  fileList.value = files.slice(-1);
  const raw = file.raw;
  if (!raw) {
    ElMessage.error("Invalid file");
    resetState();
    return;
  }
  void validateSelectedFile(raw);
};

const handleExceed = (files: File[]) => {
  const file = files[0];
  if (!file || busy.value) return;
  uploadRef.value?.clearFiles?.();
  fileList.value = [
    {
      name: file.name,
      uid: Date.now(),
      status: "ready",
      raw: file,
    } as UploadFile,
  ];
  void validateSelectedFile(file);
};

const handleApply = async () => {
  if (!canApply.value || !importId.value) return;
  applying.value = true;
  emitBusy();
  try {
    const res = await applyConfigImport(importId.value, {});
    if (!res.success) {
      ElMessage.error("Failed to apply backup package");
      return;
    }
    ElMessage.success("Backup package applied successfully");
    emit("applied");
    if (dialogRef.value) dialogRef.value.dialogVisible = false;
    resetState();
  } catch (error) {
    ElMessage.error(
      getConfigErrorMessage(error, "Failed to apply backup package"),
    );
    if (isConfigImportSessionUnavailableError(error)) {
      resetImportSession();
    }
  } finally {
    applying.value = false;
    emitBusy();
  }
};

defineExpose({
  open,
  close,
});
</script>

<style scoped lang="scss">
.config-import-dialog {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.config-import-dialog__upload-icon {
  font-size: 32px;
  color: $primary-color;
}

.config-import-dialog__upload-title {
  margin-top: $spacing-sm;
  font-size: $font-size-base;
  color: $text-color-primary;
}

.config-import-dialog__expiry {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  border: 1px solid rgba($warning-color, 0.35);
  border-radius: $border-radius-base;
  background: rgba($warning-color, 0.08);
}

.config-import-dialog__expiry-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 16px;
  color: $warning-color;
}

.config-import-dialog__expiry-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  font-size: $font-size-small;
  line-height: 1.5;
  color: $text-color-secondary;
}

.config-import-dialog__expiry-time {
  color: $text-color-primary;
  font-weight: $font-weight-medium;
}

.config-import-dialog__notice {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
}

.config-import-dialog__notice-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 16px;
  color: $text-color-secondary;
}

.config-import-dialog__notice-text {
  flex: 1;
  font-size: $font-size-small;
  line-height: 1.5;
  color: $text-color-secondary;
}

.config-import-dialog__file {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 8px 12px;
  border: 1px solid $border-color-base;
  border-radius: $border-radius-base;
  background: $bg-color-overlay;
}

.config-import-dialog__file-icon {
  font-size: 18px;
  color: $primary-color;
}

.config-import-dialog__file-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.config-import-dialog__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-color-primary;
}

.config-import-dialog__file-size {
  font-size: $font-size-small;
  color: $text-color-secondary;
}

.config-import-dialog__file-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: $text-color-secondary;
  cursor: pointer;
}

.config-import-dialog__file-remove:hover:not(:disabled) {
  color: $danger-color;
}

.config-import-dialog__file-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.config-import-dialog__file-remove-icon {
  font-size: 16px;
}

.config-import-dialog__checks-title {
  margin-bottom: $spacing-sm;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.config-import-dialog__check {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  min-height: 24px;
  margin-bottom: 6px;
}

.config-import-dialog__check-icon {
  font-size: 16px;
}

.config-import-dialog__check-icon.is-pass {
  color: $success-color;
}

.config-import-dialog__check-icon.is-fail {
  color: $danger-color;
}

.config-import-dialog__check-icon.is-pending {
  color: $text-color-placeholder;
}

.config-import-dialog__check-label {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  line-height: 1.4;
}

.config-import-dialog__check.is-pass .config-import-dialog__check-label {
  color: $success-color;
}

.config-import-dialog__check.is-fail .config-import-dialog__check-label {
  color: $danger-color;
}

.config-import-dialog__check.is-pending .config-import-dialog__check-label {
  color: $text-color-secondary;
  font-weight: $font-weight-medium;
}

.config-import-dialog__upload {
  width: 100%;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload-list) {
  display: none;
}

:deep(.el-upload-dragger) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  min-height: 112px;
  width: 100%;
}
</style>

<style lang="scss">
.config-import-dialog-wrapper.el-dialog {
  padding: 20px;
}

.config-import-dialog-wrapper .el-dialog__body {
  padding: 12px 0 8px;
}

.config-import-dialog-wrapper .el-dialog__footer {
  padding-top: 12px;
}
</style>
