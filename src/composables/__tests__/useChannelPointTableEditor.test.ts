import { afterEach, describe, expect, it, vi } from "vitest";
import { useChannelPointTableEditor } from "@/composables/useChannelPointTableEditor";
import { mountComposable } from "./composableTestUtils";
import type { PointInfo } from "@/types/channelConfiguration";
import { downloadCsv } from "@/utils/csvExport";
import { getPointCsvSchema } from "@/schemas/channelProtocols";
import { parseCsvRows } from "@/utils/csvSchema";

vi.mock("@/utils/csvExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/csvExport")>()),
  downloadCsv: vi.fn().mockResolvedValue({ displayPath: "test.csv" }),
}));

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  vi.mocked(downloadCsv).mockClear();
});

describe("channel point data and CSV export", () => {
  it.each(["T", "S", "C", "A"] as const)(
    "uses per-point timestamps for %s snapshots and export",
    async (pointType) => {
      const points: PointInfo[] = [1, 2].map((point_id) => ({
        point_id,
        signal_name: `P${point_id}`,
        value: 99,
        update_ts: 1700000000000,
        scale: 1,
        offset: 0,
        unit: "V",
        data_type: "float",
        reverse: false,
        description: "",
      }));
      const { result, wrapper, scope } = await mountComposable(() =>
        useChannelPointTableEditor({
          pointType: () => pointType,
          points: () => points,
          editFilters: () => [],
          isEditing: () => false,
          publishMode: () => false,
          channelProtocol: () => "modbus_tcp",
          onPublishChange: () => {},
          onEnterEditMode: () => {},
          openValuePublishDialog: () => {},
        }),
      );
      cleanup = () => {
        wrapper.unmount();
        scope.stop();
      };
      result.applyRealtimeValues({ 1: 0, 2: null }, { 1: 1700000000000, 2: 0 });
      expect(result.getEditedData().map((row) => row.value)).toEqual([
        0,
        undefined,
      ]);
      await result.handleExport();
      const csv = vi.mocked(downloadCsv).mock.calls[0][0];
      const exported = parseCsvRows(
        getPointCsvSchema(pointType, "modbus_tcp"),
        csv,
      ).rows;
      expect(exported.map((row) => [row.value, row.update_time])).toEqual([
        ["0", "2023-11-14T22:13:20.000Z"],
        ["", ""],
      ]);
      expect(csv).not.toContain("1970");
      result.applyRealtimeValues({ 1: 8 });
      expect(
        result
          .getEditedData()
          .every(
            (row) => row.value === undefined && row.update_ts === undefined,
          ),
      ).toBe(true);
    },
  );
});
