import type { StationTopology } from '@/types/stationTopology'
import { createDefaultModelFlow } from '@/utils/defaultModelFlow'

export const STATION_TOPOLOGY_ID = 'station'

const MOCK_STORAGE_KEY = 'mock_station_topology_v2'

/** 模拟边端已绑定的实例 ID（需与实例列表 mock/真实数据对齐） */
function buildDefaultTopology(): StationTopology {
  const flow = createDefaultModelFlow([
    { instance_id: 1, instance_name: 'battery_01', product_name: 'Battery' },
    { instance_id: 2, instance_name: 'diesel_gen_01', product_name: 'Diesel' },
    { instance_id: 3, instance_name: 'pcs_01', product_name: 'PCS' },
    { instance_id: 4, instance_name: 'PV Group_01', product_name: 'PV Group' },
    { instance_id: 5, instance_name: 'station_01', product_name: 'Station' },
    { instance_id: 6, instance_name: 'Load_01', product_name: 'Load' },
  ])

  const now = new Date().toISOString()
  return {
    station_id: STATION_TOPOLOGY_ID,
    station_name: 'Edge Station #1',
    description: 'Single-station topology for edge gateway (mock data)',
    gateway_id: 'gw-edge-001',
    flow_json: flow,
    created_at: now,
    updated_at: now,
  }
}

function readMock(): StationTopology {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StationTopology
      if (parsed?.station_id && parsed?.flow_json) return parsed
    }
  } catch {
    /* use default */
  }
  const initial = buildDefaultTopology()
  writeMock(initial)
  return initial
}

function writeMock(data: StationTopology) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data))
}

function delay<T>(data: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/** 是否使用本地模拟（未接真实后端前默认 true） */
export function useStationTopologyMock(): boolean {
  return import.meta.env.VITE_STATION_TOPOLOGY_MOCK !== 'false'
}

export async function mockGetStationTopology(): Promise<StationTopology> {
  return delay(readMock())
}

export async function mockSaveStationTopology(
  payload: Partial<StationTopology> & { flow_json: StationTopology['flow_json'] },
): Promise<StationTopology> {
  const current = readMock()
  const updated: StationTopology = {
    ...current,
    ...payload,
    station_id: current.station_id,
    updated_at: new Date().toISOString(),
  }
  writeMock(updated)
  return delay(updated)
}

export function mockResetStationTopology(): StationTopology {
  const initial = buildDefaultTopology()
  writeMock(initial)
  return initial
}
