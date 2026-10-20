import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { POINT_TABLE_BODY_HEIGHT_KEY } from "@/constants/pointTable";
import { shallowMount, flushPromises, type VueWrapper } from "@vue/test-utils";
import DevicePointTablePoints from "../DevicePointTablePoints.vue";
import { downloadCsv } from "@/utils/csvExport";
import { parseCsvRows } from "@/utils/csvSchema";
import { devicePointCsvSchema } from "@/schemas/devicePoints";

vi.mock("@/utils/csvExport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/csvExport")>()),
  downloadCsv: vi.fn().mockResolvedValue({ displayPath: "test.csv" }),
}));

const Table = defineComponent({
  name: "TestTable",
  props: ["data"],
  setup: () => () => h("div"),
});
const timestamp = 1700000000000;
let wrapper: VueWrapper;
function mountTable(
  category: "measurement" | "action" | "property" = "measurement",
) {
  wrapper = shallowMount(DevicePointTablePoints, {
    props: {
      category,
      points: [1, 2].map((id) => ({
        point_index: id,
        measurement_id: id,
        action_id: id,
        property_id: id,
        name: `P${id}`,
        unit: "V",
        description: "",
        value: 0,
        update_ts: 0,
      })),
      viewMode: "points",
      editFilters: [],
      isEditing: false,
    },
    global: {
      provide: { [POINT_TABLE_BODY_HEIGHT_KEY as symbol]: ref(400) },
      stubs: {
        PointTableShell: {
          template: '<div><slot name="toolbar"/><slot/></div>',
        },
        PointTableToolbar: { template: '<div><slot name="actions"/></div>' },
        ElButton: { template: "<button><slot/></button>" },
        ElTable: Table,
        ElTableColumn: true,
      },
      directives: { loading: () => {} },
    },
  });
  return wrapper.vm as unknown as {
    applyRealtimeValues: (
      values: Record<string, unknown>,
      ts?: Record<string, unknown>,
    ) => void;
  };
}
const rows = () =>
  wrapper.findComponent(Table).props("data") as Array<{
    value: unknown;
    update_ts?: number;
  }>;
afterEach(() => wrapper?.unmount());
beforeEach(() => vi.mocked(downloadCsv).mockClear());

describe("device point realtime snapshots and export", () => {
  it.each(["measurement", "action"] as const)(
    "exports latest %s snapshot, preserving real zero and leaving unavailable cells blank",
    async (category) => {
      const table = mountTable(category);
      table.applyRealtimeValues({ 1: 0, 2: 12 }, { 1: timestamp, 2: 0 });
      await nextTick();
      expect(rows().map((row) => row.value)).toEqual([0, undefined]);
      await wrapper.get("button").trigger("click");
      await flushPromises();
      const csv = vi.mocked(downloadCsv).mock.calls[0][0];
      const exported = parseCsvRows(devicePointCsvSchema, csv).rows;
      expect(exported.map((row) => [row.value, row.update_time])).toEqual([
        ["0", "2023-11-14T22:13:20.000Z"],
        ["", ""],
      ]);
      expect(csv).not.toContain("1970");
      table.applyRealtimeValues({ 1: 5, 2: 0 });
      await nextTick();
      expect(
        rows().every(
          (row) => row.value === undefined && row.update_ts === undefined,
        ),
      ).toBe(true);
    },
  );

  it("keeps text and zero properties without timestamps and does not coerce null into zero", async () => {
    const table = mountTable("property");
    table.applyRealtimeValues({ 1: "manufacturer", 2: 0 });
    await nextTick();
    expect(rows().map((row) => row.value)).toEqual(["manufacturer", 0]);
    await wrapper.get("button").trigger("click");
    await flushPromises();
    const exported = parseCsvRows(
      devicePointCsvSchema,
      vi.mocked(downloadCsv).mock.calls[0][0],
    ).rows;
    expect(exported.map((row) => [row.value, row.update_time])).toEqual([
      ["manufacturer", ""],
      ["0", ""],
    ]);
    table.applyRealtimeValues({ 1: null });
    await nextTick();
    expect(rows().map((row) => row.value)).toEqual([null, 0]);
  });
});
