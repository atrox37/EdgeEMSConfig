import { computed, nextTick, onUnmounted, ref, watch, type Ref } from "vue";
import {
  ElMessage,
  ElMessageBox,
  type UploadFile,
  type UploadFiles,
} from "element-plus";
import {
  abortUpgrade,
  cancelUpgradeUpload,
  getUpgradeStatus,
  uploadUpgradePackage,
} from "@/api/systemConfig";

type UpgradeDetailStatus =
  | "idle"
  | "uploading"
  | "running"
  | "completed"
  | "failed"
  | "aborted"
  | "";

const TERMINAL_STATUSES = new Set(["completed", "failed", "aborted"]);
const ACTIVE_STATUSES = new Set(["uploading", "running"]);

interface UseFirmwareUpgradeOptions {
  appendToRef: Ref<HTMLElement | null | undefined>;
}

export function useFirmwareUpgrade(options: UseFirmwareUpgradeOptions) {
  const upgradeUploadRef = ref();
  const upgradeFileList = ref<UploadFile[]>([]);
  const upgradeUploadLoading = ref(false);
  const upgradeAbortLoading = ref(false);
  const upgradeStatusLog = ref("");
  const upgradeStatusBodyRef = ref<HTMLElement | null>(null);
  const upgradeStatusLogRef = ref<HTMLElement | null>(null);
  const upgradeStatusTimer = ref<number | null>(null);
  const upgradeStatusPolling = ref(false);
  const upgradeAbortTriggered = ref(false);
  const upgradeDetailStatus = ref<UpgradeDetailStatus>("");
  const uploadProgressPct = ref<number | null>(null);
  const uploadReceivedBytes = ref(0);
  const uploadTotalBytes = ref(0);
  const isPreUploadPhase = ref(false);
  const isUpgradePreChecking = ref(false);
  const seenActiveInSession = ref(false);

  const isUploadingPhase = computed(
    () => upgradeDetailStatus.value === "uploading",
  );
  const isRunningPhase = computed(() => upgradeDetailStatus.value === "running");
  const showUploadProgress = computed(
    () => isPreUploadPhase.value || isUploadingPhase.value,
  );

  const resetUpgradeSelection = () => {
    upgradeUploadRef.value?.clearFiles?.();
    upgradeFileList.value = [];
  };

  const clearUpgradeStatus = () => {
    upgradeStatusLog.value = "";
  };

  const clearUpgradeStatusTimer = () => {
    if (upgradeStatusTimer.value !== null) {
      clearTimeout(upgradeStatusTimer.value);
      upgradeStatusTimer.value = null;
    }
  };

  const stopUpgradeStatusPolling = () => {
    upgradeStatusPolling.value = false;
    clearUpgradeStatusTimer();
  };

  const scrollUpgradeLogToBottom = async () => {
    await nextTick();
    const scrollEl = upgradeStatusLogRef.value ?? upgradeStatusBodyRef.value;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  };

  const startUpgradeStatusPolling = () => {
    clearUpgradeStatusTimer();
    upgradeStatusPolling.value = true;
    seenActiveInSession.value = false;

    const fetchStatus = async () => {
      if (!upgradeStatusPolling.value) return;

      try {
        const res = await getUpgradeStatus();
        if (res?.success) {
          const data = res.data || {};
          const detailStatus = String(
            data.detail?.status || "",
          ).toLowerCase() as UpgradeDetailStatus;

          if (TERMINAL_STATUSES.has(detailStatus) && !seenActiveInSession.value) {
            // Ignore stale terminal status until this session becomes active.
          } else {
            if (ACTIVE_STATUSES.has(detailStatus)) {
              seenActiveInSession.value = true;
              if (detailStatus === "uploading") {
                isPreUploadPhase.value = false;
              }
            }

            upgradeDetailStatus.value = detailStatus;

            if (detailStatus === "uploading") {
              const up = data.upload || {};
              uploadReceivedBytes.value = up.received_bytes ?? 0;
              uploadTotalBytes.value = up.total_bytes ?? 0;
              uploadProgressPct.value = up.progress_pct ?? null;
            } else if (
              detailStatus === "running" ||
              TERMINAL_STATUSES.has(detailStatus)
            ) {
              isPreUploadPhase.value = false;
              uploadProgressPct.value = null;
              upgradeStatusLog.value = String(data.log || "");
              await scrollUpgradeLogToBottom();
            }

            if (TERMINAL_STATUSES.has(detailStatus)) {
              stopUpgradeStatusPolling();
              upgradeUploadLoading.value = false;
              if (detailStatus === "completed") {
                ElMessage.success(
                  data.detail?.message || "Upgrade completed successfully",
                );
              } else {
                ElMessage.error(
                  data.detail?.message || `Upgrade failed (${detailStatus})`,
                );
              }
              return;
            }
          }
        }
      } catch {
        // Ignore transient polling failures and retry.
      }

      if (upgradeStatusPolling.value) {
        upgradeStatusTimer.value = window.setTimeout(fetchStatus, 1500);
      }
    };

    void fetchStatus();
  };

  watch(upgradeStatusLog, () => {
    void scrollUpgradeLogToBottom();
  });

  const handleUpgradeUpload = async () => {
    if (upgradeFileList.value.length === 0) {
      ElMessage.warning("Please select an upgrade package file");
      return;
    }

    const file = upgradeFileList.value[0].raw;
    if (!file) {
      ElMessage.error("Invalid file");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".run")) {
      ElMessage.error("Only .run files are supported");
      return;
    }

    if (isUpgradePreChecking.value) return;
    isUpgradePreChecking.value = true;

    try {
      try {
        const statusRes = await getUpgradeStatus();
        if (statusRes?.success) {
          const preStatus = String(
            statusRes.data?.detail?.status || "",
          ).toLowerCase();
          if (preStatus === "uploading" || preStatus === "running") {
            ElMessage.warning(
              "An upgrade is already in progress. Please wait for it to complete.",
            );
            resetUpgradeSelection();
            return;
          }
        }
      } catch {
        // Pre-check failures should not block the user from continuing.
      }

      await ElMessageBox.confirm(
        `Are you sure you want to upload the upgrade package: ${file.name}?`,
        "Confirm Upload",
        {
          appendTo: options.appendToRef.value ?? undefined,
          confirmButtonText: "Upload",
          cancelButtonText: "Cancel",
          type: "warning",
          center: true,
          showClose: false,
        },
      );

      upgradeUploadLoading.value = true;
      isPreUploadPhase.value = true;
      upgradeDetailStatus.value = "";
      uploadProgressPct.value = null;
      uploadReceivedBytes.value = 0;
      uploadTotalBytes.value = 0;
      upgradeAbortTriggered.value = false;
      clearUpgradeStatus();

      const uploadPromise = uploadUpgradePackage(file);
      startUpgradeStatusPolling();

      const response = await uploadPromise;
      isPreUploadPhase.value = false;

      if (!response.success) {
        stopUpgradeStatusPolling();
        upgradeUploadLoading.value = false;
        upgradeDetailStatus.value = "";
      }
    } catch (error: any) {
      const isCanceled =
        upgradeAbortTriggered.value ||
        error?.code === "ERR_CANCELED" ||
        error?.message === "请求被取消";
      if (!isCanceled && error !== "cancel") {
        console.error("Upload failed:", error);
      }
      stopUpgradeStatusPolling();
      upgradeUploadLoading.value = false;
      upgradeDetailStatus.value = "";
      isPreUploadPhase.value = false;
    } finally {
      isUpgradePreChecking.value = false;
      resetUpgradeSelection();
    }
  };

  const handleUpgradeFileChange = (file: UploadFile, fileList: UploadFiles) => {
    if (upgradeUploadLoading.value || isUpgradePreChecking.value) return;
    if (file.status !== "ready") return;

    if (file.raw && !file.raw.name.toLowerCase().endsWith(".run")) {
      ElMessage.error("Only .run files are supported");
      resetUpgradeSelection();
      return;
    }

    upgradeFileList.value = fileList.slice(-1);
    if (upgradeFileList.value.length > 0) {
      void handleUpgradeUpload();
    }
  };

  const handleUpgradeFileRemove = () => {
    resetUpgradeSelection();
  };

  const handleCancelUpload = () => {
    cancelUpgradeUpload();
    stopUpgradeStatusPolling();
    upgradeUploadLoading.value = false;
    isPreUploadPhase.value = false;
    upgradeDetailStatus.value = "";
    ElMessage.info("Upload cancelled");
  };

  const handleUpgradeAbort = async () => {
    if (upgradeAbortLoading.value) return;

    try {
      upgradeAbortLoading.value = true;
      upgradeAbortTriggered.value = true;
      await abortUpgrade();
      ElMessage.success("Upgrade aborted");
      upgradeUploadLoading.value = false;
      upgradeDetailStatus.value = "";
      isPreUploadPhase.value = false;
    } catch (error: any) {
      console.error("Abort failed:", error);
    } finally {
      upgradeAbortLoading.value = false;
      upgradeAbortTriggered.value = false;
      stopUpgradeStatusPolling();
    }
  };

  onUnmounted(() => {
    stopUpgradeStatusPolling();
  });

  return {
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
  };
}
