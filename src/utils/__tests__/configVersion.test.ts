import { describe, expect, it } from "vitest";
import {
  CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE,
  CONFIG_OPERATION_IN_PROGRESS_MESSAGE,
  CONFIG_STORAGE_INSUFFICIENT_MESSAGE,
  CONFIG_VERSION_CURRENT_MESSAGE,
  CONFIG_VERSION_NOT_FOUND_MESSAGE,
  formatBackupStorageLabel,
  formatConfigImportExpiryHint,
  formatRestorePointLabel,
  getBackupStorageProgressStatus,
  getConfigErrorCode,
  getConfigErrorMessage,
  isConfigImportSessionUnavailableError,
  normalizeBackupStoragePercent,
} from "@/utils/configVersion";

describe("formatRestorePointLabel", () => {
  it("displays simplified configuration versions directly", () => {
    expect(formatRestorePointLabel("V1")).toBe("V1");
    expect(formatRestorePointLabel("V23")).toBe("V23");
  });

  it("trims surrounding whitespace", () => {
    expect(formatRestorePointLabel("  V2  ")).toBe("V2");
  });

  it("preserves unknown version formats", () => {
    expect(formatRestorePointLabel("legacy-config")).toBe("legacy-config");
  });

  it("uses a placeholder when no version is available", () => {
    expect(formatRestorePointLabel()).toBe("-");
    expect(formatRestorePointLabel("")).toBe("-");
    expect(formatRestorePointLabel("   ")).toBe("-");
  });
});

describe("formatBackupStorageLabel", () => {
  it("formats backup storage usage with two decimal places", () => {
    expect(
      formatBackupStorageLabel({
        backup_size_mb: 126.45,
        total_size_mb: 500,
        used_percent: 25.29,
      }),
    ).toBe("126.45 MB / 500.00 MB (25.29%)");
  });

  it("returns a placeholder when storage is unavailable", () => {
    expect(formatBackupStorageLabel(null)).toBe("-");
  });
});

describe("getBackupStorageProgressStatus", () => {
  it("maps usage thresholds to progress bar statuses", () => {
    expect(getBackupStorageProgressStatus(25)).toBe("");
    expect(getBackupStorageProgressStatus(80)).toBe("warning");
    expect(getBackupStorageProgressStatus(95)).toBe("exception");
  });
});

describe("normalizeBackupStoragePercent", () => {
  it("clamps invalid values into the 0-100 range", () => {
    expect(normalizeBackupStoragePercent(125.5)).toBe(100);
    expect(normalizeBackupStoragePercent(-3)).toBe(0);
    expect(normalizeBackupStoragePercent(undefined)).toBe(0);
  });
});

describe("formatConfigImportExpiryHint", () => {
  it("returns the 30-minute guidance with an optional expiry label", () => {
    expect(formatConfigImportExpiryHint()).toEqual({
      guidance:
        "Apply within 30 minutes. The uploaded package is removed automatically after validation expires.",
      expiresAtLabel: null,
    });
    expect(formatConfigImportExpiryHint("2026-09-23T16:30:00+08:00")).toEqual({
      guidance:
        "Apply within 30 minutes. The uploaded package is removed automatically after validation expires.",
      expiresAtLabel: "Expires at: 2026-09-23 16:30:00",
    });
  });
});

describe("isConfigImportSessionUnavailableError", () => {
  it("detects expired or missing import sessions", () => {
    expect(
      isConfigImportSessionUnavailableError({
        response: { data: { error: { code: "CONFIG_IMPORT_EXPIRED" } } },
      }),
    ).toBe(true);
    expect(
      isConfigImportSessionUnavailableError({
        response: { data: { error: { code: "CONFIG_IMPORT_NOT_FOUND" } } },
      }),
    ).toBe(true);
    expect(isConfigImportSessionUnavailableError(new Error("network"))).toBe(
      false,
    );
  });
});

describe("getConfigErrorCode", () => {
  it("extracts typed configuration error codes", () => {
    const error = {
      response: {
        data: {
          success: false,
          error: {
            code: "CONFIG_STORAGE_INSUFFICIENT",
            message: "configuration archives use ...",
          },
        },
      },
    };

    expect(getConfigErrorCode(error)).toBe("CONFIG_STORAGE_INSUFFICIENT");
  });

  it("returns null when no error code is present", () => {
    expect(getConfigErrorCode(new Error("network error"))).toBeNull();
  });
});

describe("getConfigErrorMessage", () => {
  const typedError = (code: string, message?: string) => ({
    response: { data: { success: false, error: { code, message } } },
  });

  it("prefers the backend message for typed errors", () => {
    const message =
      "Backup storage is full. Please delete one or more restore points before continuing.";
    expect(
      getConfigErrorMessage(
        typedError("CONFIG_STORAGE_INSUFFICIENT", message),
        "Failed",
      ),
    ).toBe(message);
  });

  it("maps known codes to user-facing hints when the backend message is missing", () => {
    expect(
      getConfigErrorMessage(typedError("CONFIG_STORAGE_INSUFFICIENT"), "Failed"),
    ).toBe(CONFIG_STORAGE_INSUFFICIENT_MESSAGE);
    expect(
      getConfigErrorMessage(typedError("CONFIG_IMPORT_EXPIRED", "  "), "Failed"),
    ).toBe(CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE);
    expect(
      getConfigErrorMessage(typedError("CONFIG_IMPORT_NOT_FOUND"), "Failed"),
    ).toBe(CONFIG_IMPORT_SESSION_EXPIRED_MESSAGE);
    expect(
      getConfigErrorMessage(typedError("CONFIG_VERSION_CURRENT"), "Failed"),
    ).toBe(CONFIG_VERSION_CURRENT_MESSAGE);
    expect(
      getConfigErrorMessage(typedError("CONFIG_VERSION_NOT_FOUND"), "Failed"),
    ).toBe(CONFIG_VERSION_NOT_FOUND_MESSAGE);
    expect(
      getConfigErrorMessage(typedError("CONFIG_OPERATION_IN_PROGRESS"), "Failed"),
    ).toBe(CONFIG_OPERATION_IN_PROGRESS_MESSAGE);
  });

  it("uses the provided fallback for unknown errors", () => {
    expect(getConfigErrorMessage(typedError("CONFIG_UNKNOWN"), "Failed")).toBe(
      "Failed",
    );
    expect(getConfigErrorMessage(new Error("network error"), "Failed")).toBe(
      "Failed",
    );
  });
});
