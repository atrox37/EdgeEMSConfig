import { describe, expect, it, vi } from "vitest";
import {
  applyConfigImport,
  createConfigBackup,
  deleteConfigVersion,
  downloadConfigExport,
  listConfigVersions,
  restoreConfigVersion,
  validateConfigImport,
} from "../systemConfig";

vi.mock("@/utils/request", () => ({
  Request: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
    upload: vi.fn(),
  },
  cancelPendingRequestsByUrl: vi.fn(),
}));

describe("systemConfig API", () => {
  it("lists restore points with pagination", async () => {
    const mockData = {
      success: true,
      data: {
        list: [],
        total: 0,
        storage: {
          backup_size_mb: 0,
          total_size_mb: 500,
          used_percent: 0,
        },
      },
    };
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.get).mockResolvedValue(mockData);

    const result = await listConfigVersions(1, 20);
    expect(result).toEqual(mockData);
    expect(Request.get).toHaveBeenCalledWith(
      "/api/v1/config/versions",
      { page: 1, page_size: 20 },
      { skipGlobalLoading: true },
    );
  });

  it("creates a restore point backup", async () => {
    const mockData = { success: true, data: { created: true } };
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.post).mockResolvedValue(mockData);

    const result = await createConfigBackup({ description: "Before import" });
    expect(result).toEqual(mockData);
    expect(Request.post).toHaveBeenCalledWith(
      "/api/v1/config/backups",
      { description: "Before import" },
      expect.objectContaining({ skipGlobalLoading: true, showErrorMessage: false }),
    );
  });

  it("validates an import package upload", async () => {
    const mockData = {
      success: true,
      data: {
        import_id: "import-1",
        valid: true,
        expires_at: "2026-09-23T16:30:00+08:00",
        checks: [],
      },
    };
    const file = new File(["zip"], "Config_V1.zip", {
      type: "application/zip",
    });
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.upload).mockResolvedValue(mockData);

    const result = await validateConfigImport(file);
    expect(result).toEqual(mockData);
    expect(Request.upload).toHaveBeenCalledWith(
      "/api/v1/config/imports/validate",
      file,
      {},
      expect.objectContaining({ showErrorMessage: false }),
    );
  });

  it("applies a validated import package", async () => {
    const mockData = { success: true, data: { files_extracted: 12 } };
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.post).mockResolvedValue(mockData);

    const result = await applyConfigImport("import-1", {});
    expect(result).toEqual(mockData);
    expect(Request.post).toHaveBeenCalledWith(
      "/api/v1/config/imports/import-1/apply",
      {},
      expect.objectContaining({ showErrorMessage: false }),
    );
  });

  it("restores a historical restore point", async () => {
    const mockData = { success: true, data: { version: { version: "V2" } } };
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.post).mockResolvedValue(mockData);

    const result = await restoreConfigVersion("version-2", {});
    expect(result).toEqual(mockData);
    expect(Request.post).toHaveBeenCalledWith(
      "/api/v1/config/versions/version-2/restore",
      {},
      expect.objectContaining({ showErrorMessage: false }),
    );
  });

  it("deletes a historical restore point", async () => {
    const mockData = {
      success: true,
      data: {
        id: "version-2",
        version: "V2",
        archive_size: 203984,
        archive_removed: true,
        deleted_at: "2026-09-23T15:30:00+08:00",
      },
    };
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.delete).mockResolvedValue(mockData);

    const result = await deleteConfigVersion("version-2");
    expect(result).toEqual(mockData);
    expect(Request.delete).toHaveBeenCalledWith(
      "/api/v1/config/versions/version-2",
      expect.objectContaining({ showErrorMessage: false }),
    );
  });

  it("exports the current configuration package", async () => {
    const { Request } = await import("@/utils/request");
    vi.mocked(Request.download).mockResolvedValue(undefined);

    await downloadConfigExport("Config_V1_20260923-153000.zip");
    expect(Request.download).toHaveBeenCalledWith(
      "/api/v1/config/export",
      {},
      "Config_V1_20260923-153000.zip",
      expect.objectContaining({ timeout: 120000 }),
    );
  });
});
