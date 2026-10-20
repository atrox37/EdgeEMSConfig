import { formatNumber } from "@/utils/common";

/** 点位时间戳为毫秒；0、缺失和非法值均表示没有有效的更新时间。 */
export function normalizePointTimestamp(raw: unknown): number | undefined {
  const value = finiteNumber(raw);
  return value !== undefined && value > 0 && value <= 8.64e15
    ? value
    : undefined;
}

function finiteNumber(raw: unknown): number | undefined {
  if (typeof raw !== "number" && typeof raw !== "string") return undefined;
  if (typeof raw === "string" && !raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** 逐点更新时间有效后才展示数值，保留实际采集到的 0。 */
export function getRealtimePointValue(
  raw: unknown,
  timestamp: unknown,
): number | undefined {
  return normalizePointTimestamp(timestamp) === undefined
    ? undefined
    : finiteNumber(raw);
}

export function formatRealtimePointValue(
  raw: unknown,
  timestamp: unknown,
): string {
  const value = getRealtimePointValue(raw, timestamp);
  return value === undefined ? "--" : formatNumber(value);
}

export interface RealtimePointState {
  value?: number;
  update_ts?: number;
}

/** inst/comsrv 推送是完整快照，缺失字段必须清空，不能沿用上次的值或时间。 */
export function applyRealtimePointSnapshot<T extends RealtimePointState>(
  rows: T[],
  getPointId: (row: T) => number,
  values: Record<string, unknown>,
  timestamps?: Record<string, unknown>,
) {
  rows.forEach((row) => {
    const id = String(getPointId(row));
    row.update_ts = normalizePointTimestamp(timestamps?.[id]);
    row.value = getRealtimePointValue(values[id], row.update_ts);
  });
}
