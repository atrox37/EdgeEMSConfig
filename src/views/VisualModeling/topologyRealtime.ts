import type { InjectionKey, Ref } from "vue";
import type { ProductMeasurement } from "@/types/deviceConfiguration";

export interface RealtimeBinding {
  productName: string;
  instanceId?: number | null;
}

export interface RealtimePoint {
  id: number;
  name: string;
  value: string;
  unit: string;
}

export interface RealtimeCardData {
  points: RealtimePoint[];
  loading: boolean;
  error: boolean;
}

export interface TopologyRealtimeContext {
  connected: Readonly<Ref<boolean>>;
  ready: Readonly<Ref<boolean>>;
  getCardData: (binding: RealtimeBinding) => RealtimeCardData;
  retryProduct: (productName: string) => void;
}

export const TOPOLOGY_REALTIME_KEY: InjectionKey<TopologyRealtimeContext> =
  Symbol("topologyRealtime");

export function defaultMeasurements(
  points: ProductMeasurement[],
): ProductMeasurement[] {
  return points.filter(
    (point) =>
      point.attr?.isDisplay === "true" || point.attr?.isDisplay === true,
  );
}

export { formatRealtimePointValue as formatRealtimeValue } from "@/utils/pointRealtime";
