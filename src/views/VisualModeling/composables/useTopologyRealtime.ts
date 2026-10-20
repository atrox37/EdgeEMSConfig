import { computed, onScopeDispose, reactive, watch, type Ref } from "vue";
import { getProductPoints } from "@/api/devicesManagement";
import type { RealtimeDataUpdate } from "@/types/websocket";
import type { ProductMeasurement } from "@/types/deviceConfiguration";
import wsManager from "@/utils/websocket";
import {
  defaultMeasurements,
  formatRealtimeValue,
  type RealtimeBinding,
  type TopologyRealtimeContext,
} from "../topologyRealtime";

interface ProductState {
  points: ProductMeasurement[];
  loading: boolean;
  error: boolean;
}

/** 展示态数据独立于 flow_json，避免实时推送触发拓扑脏标记或被持久化。 */
export function useTopologyRealtime(
  enabled: Ref<boolean>,
  bindings: Ref<RealtimeBinding[]>,
): TopologyRealtimeContext {
  const products = reactive<Record<string, ProductState>>({});
  const values = reactive<Record<number, Record<string, unknown>>>({});
  const timestamps = reactive<Record<number, Record<string, unknown>>>({});
  const connected = computed(() => wsManager.status.value === "connected");
  let subscriptionId: string | undefined;
  let disposed = false;
  let subscriptionVersion = 0;

  const productNames = computed(() =>
    [
      ...new Set(
        bindings.value.map((item) => item.productName).filter(Boolean),
      ),
    ].sort(),
  );
  const instanceIds = computed(() =>
    [
      ...new Set(
        bindings.value
          .map((item) => item.instanceId)
          .filter(
            (id): id is number =>
              typeof id === "number" && Number.isInteger(id) && id > 0,
          ),
      ),
    ].sort((a, b) => a - b),
  );

  async function loadProduct(productName: string) {
    if (!productName || products[productName]?.loading) return;
    const state: ProductState = { points: [], loading: true, error: false };
    products[productName] = state;
    try {
      const response = await getProductPoints(productName);
      if (
        !response.success ||
        !Array.isArray(response.data?.product?.measurements)
      )
        throw new Error("Invalid product points");
      if (!disposed)
        products[productName] = {
          points: defaultMeasurements(response.data.product.measurements),
          loading: false,
          error: false,
        };
    } catch {
      if (!disposed)
        products[productName] = { points: [], loading: false, error: true };
    }
  }

  watch(
    () => (enabled.value ? productNames.value.join("\0") : null),
    (key) => {
      if (key === null) return;
      for (const name of productNames.value) {
        if (!products[name] || products[name].error) void loadProduct(name);
      }
    },
    { immediate: true },
  );

  function clearValues() {
    for (const id of Object.keys(values)) {
      delete values[Number(id)];
      delete timestamps[Number(id)];
    }
  }

  watch(
    [() => enabled.value, () => instanceIds.value.join(",")],
    () => {
      const version = ++subscriptionVersion;
      if (subscriptionId) wsManager.unsubscribe(subscriptionId);
      subscriptionId = undefined;
      clearValues();
      if (!enabled.value || !instanceIds.value.length) return;
      const ids = new Set(instanceIds.value);
      const applyUpdate = (update: RealtimeDataUpdate) => {
        if (
          disposed ||
          version !== subscriptionVersion ||
          !enabled.value ||
          !connected.value ||
          !ids.has(update.channel_id) ||
          update.data_type !== "M" ||
          (update.source && update.source !== "inst")
        )
          return;
        // inst:M 推送为完整快照；直接替换使已移除点位恢复为缺失值。
        values[update.channel_id] = update.values;
        timestamps[update.channel_id] = update.ts ?? {};
      };
      subscriptionId = wsManager.subscribe(
        {
          source: "inst",
          channels: [...ids],
          dataTypes: ["M"],
          interval: 1000,
        },
        {
          onDataUpdate: applyUpdate,
          onBatchDataUpdate: (data) => {
            if ("updates" in data) data.updates.forEach(applyUpdate);
          },
        },
      );
    },
    { immediate: true },
  );

  // 订阅级 onDisconnect 不会由管理器触发，直接观察共享连接状态。
  watch(
    connected,
    (online) => {
      if (!online) clearValues();
    },
    { flush: "sync" },
  );

  onScopeDispose(() => {
    disposed = true;
    if (subscriptionId) wsManager.unsubscribe(subscriptionId);
  });

  return {
    connected,
    ready: computed(() =>
      productNames.value.every(
        (name) => products[name] && !products[name].loading,
      ),
    ),
    retryProduct: (name) => {
      if (enabled.value) void loadProduct(name);
    },
    getCardData: ({ productName, instanceId }) => {
      const product = products[productName];
      return {
        loading: !!productName && (!product || product.loading),
        error: product?.error ?? false,
        points: (product?.points ?? []).map((point) => ({
          id: point.measurement_id,
          name: point.name,
          unit: point.unit || "",
          value: formatRealtimeValue(
            connected.value && instanceId != null
              ? values[instanceId]?.[String(point.measurement_id)]
              : undefined,
            instanceId != null
              ? timestamps[instanceId]?.[String(point.measurement_id)]
              : undefined,
          ),
        })),
      };
    },
  };
}
