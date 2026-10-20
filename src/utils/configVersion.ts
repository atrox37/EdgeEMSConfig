import type {
  ConfigApiErrorBody,
  ConfigImportValidateData,
  ConfigVersionOrigin,
  ConfigVersionStorage,
} from "@/types/systemConfig";
import { formatDateTime } from "@/utils/date";

export const CONFIG_IMPORT_MAX_BYTES = 64 * 1024 * 1024;
export const CONFIG_IMPORT_SESSION_TTL_MINUTES = 30;
export const CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE =
  "The import session has expired. Please upload and validate the package again.";
export const CONFIG_IMPORT_EXPIRED_CODE = "CONFIG_IMPORT_EXPIRED";
export const CONFIG_IMPORT_NOT_FOUND_CODE = "CONFIG_IMPORT_NOT_FOUND";
export const CONFIG_IMPORT_NOT_VALIDATED_CODE = "CONFIG_IMPORT_NOT_VALIDATED";
export const CONFIG_DESCRIPTION_MAX_CHARS = 100;
export const CONFIG_STORAGE_INSUFFICIENT_CODE = "CONFIG_STORAGE_INSUFFICIENT";
export const CONFIG_STORAGE_INSUFFICIENT_MESSAGE =
  "Backup storage is full. Please delete one or more restore points before continuing.";
export const CONFIG_VERSION_CURRENT_CODE = "CONFIG_VERSION_CURRENT";
export const CONFIG_VERSION_CURRENT_MESSAGE =
  "The current restore point cannot be deleted.";
export const CONFIG_VERSION_NOT_FOUND_CODE = "CONFIG_VERSION_NOT_FOUND";
export const CONFIG_VERSION_NOT_FOUND_MESSAGE =
  "Restore point not found. It may have already been deleted.";
export const CONFIG_OPERATION_IN_PROGRESS_CODE = "CONFIG_OPERATION_IN_PROGRESS";
export const CONFIG_OPERATION_IN_PROGRESS_MESSAGE =
  "Another configuration operation is in progress. Please try again later.";
export const CONFIG_IMPORT_NOT_VALIDATED_MESSAGE =
  "The backup package has not completed validation. Please validate it before applying.";

const CONFIG_ERROR_MESSAGES: Record<string, string> = {
  [CONFIG_STORAGE_INSUFFICIENT_CODE]: CONFIG_STORAGE_INSUFFICIENT_MESSAGE,
  [CONFIG_VERSION_CURRENT_CODE]: CONFIG_VERSION_CURRENT_MESSAGE,
  [CONFIG_VERSION_NOT_FOUND_CODE]: CONFIG_VERSION_NOT_FOUND_MESSAGE,
  [CONFIG_OPERATION_IN_PROGRESS_CODE]: CONFIG_OPERATION_IN_PROGRESS_MESSAGE,
  [CONFIG_IMPORT_EXPIRED_CODE]: CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE,
  [CONFIG_IMPORT_NOT_FOUND_CODE]: CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE,
  [CONFIG_IMPORT_NOT_VALIDATED_CODE]: CONFIG_IMPORT_NOT_VALIDATED_MESSAGE,
};

export const CONFIG_ORIGIN_LABELS: Record<string, string> = {
  initial: "Initial restore point",
  manual_backup: "Manual restore point",
  import: "Imported backup package",
  pre_import_snapshot: "Automatic pre-import point",
  pre_restore_snapshot: "Automatic pre-restore point",
  restore: "Restored from history",
};

export const CONFIG_CHECK_LABELS: Record<string, string> = {
  archive_safety: "Archive safety",
  package_structure: "Package structure and checksum",
  format_compatibility: "Format compatibility",
  reference_integrity: "Database integrity and references",
};

export const getConfigOriginLabel = (
  origin?: ConfigVersionOrigin | null,
): string => {
  if (!origin) return "-";
  return CONFIG_ORIGIN_LABELS[origin] || origin;
};

export const getConfigCheckLabel = (code: string): string => {
  return CONFIG_CHECK_LABELS[code] || code;
};

export const formatRestorePointLabel = (version?: string | null): string => {
  const value = version?.trim();
  if (!value) return "-";
  return value;
};

export const countUnicodeChars = (value: string): number => {
  return Array.from(value).length;
};

export const buildConfigDescriptionPayload = (
  description: string,
): Record<string, never> | { description: string } => {
  const trimmed = description.trim();
  if (!trimmed) return {};
  return { description: trimmed };
};

export const validateConfigDescription = (
  description: string,
): string | null => {
  if (countUnicodeChars(description.trim()) > CONFIG_DESCRIPTION_MAX_CHARS) {
    return `Description must be ${CONFIG_DESCRIPTION_MAX_CHARS} characters or less`;
  }
  return null;
};

export const buildConfigExportFilename = (version?: string | null): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const ver = version && version.trim() ? version.trim() : "current";
  return `Config_${ver}_${stamp}.zip`;
};

export const formatConfigFileSize = (bytes?: number | null): string => {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatStorageMegabytes = (value?: number | null): string => {
  if (value == null || !Number.isFinite(value) || value < 0) return "-";
  return value.toFixed(2);
};

export const formatBackupStorageLabel = (
  storage?: ConfigVersionStorage | null,
): string => {
  if (!storage) return "-";
  const used = formatStorageMegabytes(storage.backup_size_mb);
  const total = formatStorageMegabytes(storage.total_size_mb);
  const percent = formatStorageMegabytes(storage.used_percent);
  if (used === "-" || total === "-" || percent === "-") return "-";
  return `${used} MB / ${total} MB (${percent}%)`;
};

export const getBackupStorageProgressStatus = (
  usedPercent?: number | null,
): "" | "warning" | "exception" => {
  if (usedPercent == null || !Number.isFinite(usedPercent)) return "";
  if (usedPercent >= 95) return "exception";
  if (usedPercent >= 80) return "warning";
  return "";
};

export const normalizeBackupStoragePercent = (
  usedPercent?: number | null,
): number => {
  if (usedPercent == null || !Number.isFinite(usedPercent)) return 0;
  return Math.min(100, Math.max(0, usedPercent));
};

export const getHttpErrorData = <T = ConfigApiErrorBody>(
  error: unknown,
): T | null => {
  const data = (error as { response?: { data?: T } })?.response?.data;
  return data ?? null;
};

export const getConfigErrorCode = (error: unknown): string | null => {
  const payload = getHttpErrorData(error);
  const code = payload?.error?.code?.trim();
  return code || null;
};

export const getConfigErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const payload = getHttpErrorData(error);
  const message = payload?.error?.message?.trim() || payload?.message?.trim();
  if (message) return message;

  const code = getConfigErrorCode(error);
  if (code && CONFIG_ERROR_MESSAGES[code]) {
    return CONFIG_ERROR_MESSAGES[code];
  }

  return fallback;
};

export const getConfigImportValidateData = (error: unknown) => {
  const payload = getHttpErrorData<{ data?: ConfigImportValidateData }>(error);
  return payload?.data?.checks ? payload.data : null;
};

export interface ConfigImportExpiryHint {
  guidance: string;
  expiresAtLabel: string | null;
}

export const formatConfigImportExpiryHint = (
  expiresAt?: string | null,
): ConfigImportExpiryHint => {
  const guidance = `Apply within ${CONFIG_IMPORT_SESSION_TTL_MINUTES} minutes. The uploaded package is removed automatically after validation expires.`;
  if (!expiresAt?.trim()) {
    return { guidance, expiresAtLabel: null };
  }

  const formatted = formatDateTime(expiresAt);
  if (formatted === "-") {
    return { guidance, expiresAtLabel: null };
  }

  return {
    guidance,
    expiresAtLabel: `Expires at: ${formatted}`,
  };
};

export const isConfigImportSessionUnavailableError = (
  error: unknown,
): boolean => {
  const code = getConfigErrorCode(error);
  return (
    code === CONFIG_IMPORT_EXPIRED_CODE || code === CONFIG_IMPORT_NOT_FOUND_CODE
  );
};
