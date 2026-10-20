import { describe, expect, it } from "vitest";
import {
  applyRealtimePointSnapshot,
  formatRealtimePointValue,
  getRealtimePointValue,
  normalizePointTimestamp,
} from "@/utils/pointRealtime";
import { formatUpdateTime, formatUpdateTimeForCsv } from "@/utils/csvExport";
import {
  getDevicePointColumns,
  type DevicePointColumnContext,
} from "@/schemas/deviceTableColumns";
import { getPointColumns } from "@/schemas/channelTableColumns";
import type { PointInfo } from "@/types/channelConfiguration";

const timestamp = 1700000000000;
const invalidTimestamps = [
  0,
  -1,
  null,
  undefined,
  "",
  " ",
  false,
  NaN,
  Infinity,
  "invalid",
  8.64e15 + 1,
];

describe("point data validity across views and CSV", () => {
  it("treats zero, missing, malformed and out-of-range timestamps as unavailable", () => {
    for (const time of invalidTimestamps) {
      expect(normalizePointTimestamp(time)).toBeUndefined();
      expect(getRealtimePointValue(0, time)).toBeUndefined();
      expect(formatRealtimePointValue(0, time)).toBe("--");
      expect(formatUpdateTime(time)).toBe("--");
      expect(formatUpdateTimeForCsv(time)).toBe("");
    }
    expect(normalizePointTimestamp(String(timestamp))).toBe(timestamp);
    expect(formatUpdateTime(timestamp)).toBe(
      new Date(timestamp).toLocaleString(),
    );
    expect(formatUpdateTimeForCsv(timestamp)).toBe("2023-11-14T22:13:20.000Z");
  });

  it("preserves actual zero and negative values without coercing empty values to zero", () => {
    for (const raw of [0, "0"])
      expect(formatRealtimePointValue(raw, timestamp)).toBe("0");
    expect(formatRealtimePointValue(-1.25, timestamp)).toBe("-1.25");
    expect(formatRealtimePointValue(12.345678, timestamp)).toBe("12.346");
    expect(formatRealtimePointValue("0.30000000000000004", timestamp)).toBe(
      "0.300",
    );
    expect(formatRealtimePointValue(220, timestamp)).toBe("220");
    for (const raw of [
      null,
      undefined,
      "",
      " ",
      false,
      {},
      NaN,
      Infinity,
      "NaN",
    ]) {
      expect(formatRealtimePointValue(raw, timestamp)).toBe("--");
    }
  });

  it("clears old values and timestamps when a full snapshot drops or invalidates a point", () => {
    const rows = [1, 2, 3, 4].map((id) => ({
      id,
      value: 99 as number | undefined,
      update_ts: timestamp as number | undefined,
    }));
    applyRealtimePointSnapshot(
      rows,
      (row) => row.id,
      { 1: 0, 2: null, 3: 5 },
      { 1: timestamp, 2: timestamp, 3: 0 },
    );
    expect(rows.map((row) => row.value)).toEqual([
      0,
      undefined,
      undefined,
      undefined,
    ]);
    expect(rows.map((row) => row.update_ts)).toEqual([
      timestamp,
      timestamp,
      undefined,
      undefined,
    ]);
    applyRealtimePointSnapshot(rows, (row) => row.id, { 1: 9 });
    expect(
      rows.every(
        (row) => row.value === undefined && row.update_ts === undefined,
      ),
    ).toBe(true);
  });

  it("applies the same missing/zero rules to device measurement/action and channel columns", () => {
    const channelColumns = getPointColumns({
      isEditing: false,
      isTA: true,
      onFieldInput: () => {},
      canEditPointId: () => false,
    });
    const channelValue = channelColumns.find((col) => col.key === "value")!;
    const channelTime = channelColumns.find(
      (col) => col.key === "update_time",
    )!;
    for (const time of [0, undefined, timestamp]) {
      const row = { measurement_id: 1, value: 0, update_ts: time };
      for (const category of ["measurement", "action"] as const) {
        const ctx: DevicePointColumnContext = { category, getPointId: () => 1 };
        const columns = getDevicePointColumns(ctx);
        expect(
          columns.find((col) => col.key === "value")!.display(row, ctx),
        ).toBe(time ? "0" : "--");
        expect(
          columns.find((col) => col.key === "update_time")!.display(row, ctx),
        ).toBe(formatUpdateTime(time));
      }
      expect(channelValue.display(row as unknown as PointInfo)).toBe(
        time ? "0" : "--",
      );
      expect(channelTime.display(row as unknown as PointInfo)).toBe(
        formatUpdateTime(time),
      );
    }
  });

  it("keeps static property values available without a sampling timestamp", () => {
    const ctx: DevicePointColumnContext = {
      category: "property",
      getPointId: () => 1,
    };
    const columns = getDevicePointColumns(ctx);
    expect(columns.some((col) => col.key === "update_time")).toBe(false);
    const valueColumn = columns.find((col) => col.key === "value")!;
    expect(valueColumn.display({ value: 0 }, ctx)).toBe("0");
    expect(valueColumn.display({ value: "manufacturer" }, ctx)).toBe(
      "manufacturer",
    );
    expect(valueColumn.display({ value: null }, ctx)).toBe("--");
  });
});
