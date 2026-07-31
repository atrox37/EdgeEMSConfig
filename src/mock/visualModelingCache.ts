import type { DeviceInstanceBasic, ProductListItem } from '@/types/deviceConfiguration'
import type { NodeChannelBinding, StationTopology } from '@/types/stationTopology'
import { mockGetStationTopology, mockSaveStationTopology } from './stationTopologyMock'

/** Visual Modeling 调试阶段仅使用前端缓存，不访问后端。 */
export const VISUAL_MODELING_CACHE_ONLY = true

const INSTANCES_STORAGE_KEY = 'visual_modeling_instances_v1'

export const FRONTEND_MODELING_PRODUCTS: ProductListItem[] = [
  { parent_name: null, product_name: 'Station' },
  { parent_name: null, product_name: 'Environment' },
  { parent_name: null, product_name: 'PV Group' },
  { parent_name: null, product_name: 'AC Inverter' },
  { parent_name: null, product_name: 'Diesel' },
  { parent_name: null, product_name: 'Battery' },
  { parent_name: null, product_name: 'PCS' },
  { parent_name: null, product_name: 'Hybrid Inverter' },
  { parent_name: null, product_name: 'Load' },
  { parent_name: null, product_name: 'Three Phase Load' },
  { parent_name: null, product_name: 'EV Charging Load' },
  { parent_name: null, product_name: 'HVAC Load' },
  { parent_name: null, product_name: 'Distribution Board' },
  { parent_name: null, product_name: 'Meter' },
]

const DEFAULT_MODELING_INSTANCES: DeviceInstanceBasic[] = [
  ...Array.from({ length: 5 }, (_, index) => ({
    instance_id: index + 1,
    instance_name: `Station_${String(index + 1).padStart(2, '0')}`,
    product_name: 'Station',
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    instance_id: index + 11,
    instance_name: `Environment_${String(index + 1).padStart(2, '0')}`,
    product_name: 'Environment',
  })),
  { instance_id: 21, instance_name: 'PV Group_01', product_name: 'PV Group' },
  { instance_id: 22, instance_name: 'AC Inverter_01', product_name: 'AC Inverter' },
  { instance_id: 23, instance_name: 'Diesel_01', product_name: 'Diesel' },
  { instance_id: 24, instance_name: 'Battery_01', product_name: 'Battery' },
  { instance_id: 25, instance_name: 'PCS_01', product_name: 'PCS' },
  { instance_id: 26, instance_name: 'Hybrid Inverter_01', product_name: 'Hybrid Inverter' },
  { instance_id: 27, instance_name: 'Load_01', product_name: 'Load' },
  { instance_id: 28, instance_name: 'Three Phase Load_01', product_name: 'Three Phase Load' },
  { instance_id: 29, instance_name: 'EV Charging Load_01', product_name: 'EV Charging Load' },
  { instance_id: 30, instance_name: 'HVAC Load_01', product_name: 'HVAC Load' },
  { instance_id: 31, instance_name: 'Distribution Board_01', product_name: 'Distribution Board' },
  { instance_id: 32, instance_name: 'Meter_01', product_name: 'Meter' },
]

function readInstances(): DeviceInstanceBasic[] {
  try {
    const raw = localStorage.getItem(INSTANCES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DeviceInstanceBasic[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* fall through to defaults */
  }
  localStorage.setItem(INSTANCES_STORAGE_KEY, JSON.stringify(DEFAULT_MODELING_INSTANCES))
  return [...DEFAULT_MODELING_INSTANCES]
}

export async function getFrontendTopology(): Promise<StationTopology> {
  return mockGetStationTopology()
}

export async function saveFrontendTopology(
  payload: Partial<StationTopology> & { flow_json: StationTopology['flow_json'] },
): Promise<StationTopology> {
  return mockSaveStationTopology(payload)
}

export function getFrontendProducts(): ProductListItem[] {
  return FRONTEND_MODELING_PRODUCTS.map((product) => ({ ...product }))
}

export function getFrontendInstances(): DeviceInstanceBasic[] {
  return readInstances()
}

export function getFrontendChannelBindings(): NodeChannelBinding[] {
  return []
}
