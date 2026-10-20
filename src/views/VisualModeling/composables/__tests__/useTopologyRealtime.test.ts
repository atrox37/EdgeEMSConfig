import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import { flushPromises } from "@vue/test-utils";
import { getProductPoints } from "@/api/devicesManagement";
import wsManager from "@/utils/websocket";
import type { ListenerConfig } from "@/types/websocket";
import type { ProductMeasurement } from "@/types/deviceConfiguration";
import {
  defaultMeasurements,
  formatRealtimeValue,
  type RealtimeBinding,
} from "../../topologyRealtime";
import { useTopologyRealtime } from "../useTopologyRealtime";

vi.mock("@/api/devicesManagement", () => ({ getProductPoints: vi.fn() }));
vi.mock("@/utils/websocket", async () => {
  const { ref } = await import("vue");
  return {
    default: {
      status: ref("connected"),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  };
});

const points: ProductMeasurement[] = [
  { measurement_id: 7, name: "SOC", unit: "%", attr: { isDisplay: "true" } },
  {
    measurement_id: 2,
    name: "Hidden",
    unit: "V",
    attr: { isDisplay: "false" },
  },
  {
    measurement_id: 1,
    name: "Total Voltage",
    unit: "V",
    attr: { isDisplay: "true" },
  },
  { measurement_id: 3, name: "Not marked", unit: null },
];

let scope: EffectScope;
let listener: Partial<ListenerConfig>;

function setup(
  initial: RealtimeBinding[] = [{ productName: "Battery", instanceId: 20 }],
) {
  const enabled = ref(true);
  const bindings = ref(initial);
  scope = effectScope();
  const data = scope.run(() => useTopologyRealtime(enabled, bindings))!;
  return { data, enabled, bindings };
}

function batch(values: Record<string, unknown>, overrides = {}) {
  listener.onBatchDataUpdate?.({
    updates: [
      {
        source: "inst",
        channel_id: 20,
        data_type: "M",
        values,
        ts: Object.fromEntries(
          Object.keys(values).map((id) => [id, 1700000000000]),
        ),
        ...overrides,
      },
    ],
  } as Parameters<NonNullable<ListenerConfig["onBatchDataUpdate"]>>[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  wsManager.status.value = "connected";
  vi.mocked(getProductPoints).mockResolvedValue({
    success: true,
    code: 200,
    message: "",
    data: {
      product: { product_name: "Battery", measurements: points },
    },
  });
  vi.mocked(wsManager.subscribe).mockImplementation((_, handlers) => {
    listener = handlers ?? {};
    return `subscription-${vi.mocked(wsManager.subscribe).mock.calls.length}`;
  });
});
afterEach(() => scope?.stop());

describe("topology realtime data", () => {
  it("selects marked points in product order and preserves missing values and zero", () => {
    expect(
      defaultMeasurements(points).map((point) => point.measurement_id),
    ).toEqual([7, 1]);
    for (const value of [
      null,
      undefined,
      "",
      " ",
      "NaN",
      NaN,
      Infinity,
      "Infinity",
      false,
    ]) {
      expect(formatRealtimeValue(value, 1700000000000)).toBe("--");
    }
    expect(formatRealtimeValue("0", 1700000000000)).toBe("0");
    expect(formatRealtimeValue(0, 1700000000000)).toBe("0");
    expect(formatRealtimeValue("-1.25", 1700000000000)).toBe("-1.25");
  });

  it("loads each product once, subscribes bound instances together, keeps unbound rows", async () => {
    const { data, bindings } = setup([
      { productName: "Battery", instanceId: 20 },
      { productName: "Battery", instanceId: 21 },
      { productName: "Battery", instanceId: null },
    ]);
    await flushPromises();
    expect(getProductPoints).toHaveBeenCalledTimes(1);
    expect(wsManager.subscribe).toHaveBeenCalledWith(
      {
        source: "inst",
        channels: [20, 21],
        dataTypes: ["M"],
        interval: 1000,
      },
      expect.any(Object),
    );
    expect(
      data
        .getCardData({ productName: "Battery" })
        .points.map((point) => point.value),
    ).toEqual(["--", "--"]);
    bindings.value = bindings.value.map((binding) => ({ ...binding }));
    await nextTick();
    expect(wsManager.subscribe).toHaveBeenCalledTimes(1);
  });

  it("filters source/type/instance and replaces full snapshots to remove stale points", async () => {
    const { data } = setup();
    await flushPromises();
    batch({ 7: 0, 1: "12.5" });
    const values = () =>
      data
        .getCardData({ productName: "Battery", instanceId: 20 })
        .points.map((point) => point.value);
    expect(values()).toEqual(["0", "12.5"]);
    batch({ 7: 99 }, { source: "comsrv" });
    batch({ 7: 99 }, { data_type: "A" });
    batch({ 7: 99 }, { channel_id: 21 });
    expect(values()).toEqual(["0", "12.5"]);
    batch({ 7: null });
    expect(values()).toEqual(["--", "--"]);
  });

  it("requires each point timestamp and never reuses timestamps from a previous snapshot", async () => {
    const { data } = setup();
    await flushPromises();
    const values = () =>
      data
        .getCardData({ productName: "Battery", instanceId: 20 })
        .points.map((point) => point.value);
    batch({ 7: 0, 1: 12 }, { ts: { 7: 0, 1: null } });
    expect(values()).toEqual(["--", "--"]);
    batch({ 7: 0, 1: 12 });
    expect(values()).toEqual(["0", "12"]);
    batch({ 7: 0, 1: 12 }, { ts: { 7: 1700000000000 } });
    expect(values()).toEqual(["0", "--"]);
    batch({ 7: 0, 1: 12 }, { ts: undefined });
    expect(values()).toEqual(["--", "--"]);
    listener.onDataUpdate?.({
      channel_id: 20,
      data_type: "M",
      values: { 7: 0 },
      ts: { 7: 1700000000000 },
    });
    expect(values()).toEqual(["0", "--"]);
  });

  it("clears on disconnect and resumes from a fresh push after reconnect", async () => {
    const { data } = setup();
    await flushPromises();
    batch({ 7: 42 });
    wsManager.status.value = "disconnected";
    expect(
      data.getCardData({ productName: "Battery", instanceId: 20 }).points[0]
        .value,
    ).toBe("--");
    wsManager.status.value = "connected";
    expect(
      data.getCardData({ productName: "Battery", instanceId: 20 }).points[0]
        .value,
    ).toBe("--");
    batch({ 7: 43 });
    expect(
      data.getCardData({ productName: "Battery", instanceId: 20 }).points[0]
        .value,
    ).toBe("43");
  });

  it("stops in edit mode, ignores old callbacks, resubscribes when bindings change and disposes", async () => {
    const { data, enabled, bindings } = setup();
    await flushPromises();
    const oldListener = listener;
    enabled.value = false;
    await nextTick();
    expect(wsManager.unsubscribe).toHaveBeenCalledWith("subscription-1");
    bindings.value = [{ productName: "Battery", instanceId: 21 }];
    enabled.value = true;
    await nextTick();
    oldListener.onDataUpdate?.({
      channel_id: 20,
      data_type: "M",
      values: { 7: 100 },
    });
    expect(
      data.getCardData({ productName: "Battery", instanceId: 20 }).points[0]
        .value,
    ).toBe("--");
    expect(
      vi.mocked(wsManager.subscribe).mock.calls.at(-1)?.[0].channels,
    ).toEqual([21]);
    scope.stop();
    expect(wsManager.unsubscribe).toHaveBeenLastCalledWith("subscription-2");
  });

  it("exposes product errors and allows retry without hiding them as an empty product", async () => {
    vi.mocked(getProductPoints).mockRejectedValueOnce(new Error("offline"));
    const { data } = setup();
    await flushPromises();
    expect(data.getCardData({ productName: "Battery" }).error).toBe(true);
    data.retryProduct("Battery");
    await flushPromises();
    expect(data.getCardData({ productName: "Battery" }).error).toBe(false);
    expect(data.getCardData({ productName: "Battery" }).points).toHaveLength(2);
  });
});
