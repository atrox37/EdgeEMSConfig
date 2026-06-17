import { Request, type RequestConfig } from '@/utils/request'
import type { ApiResponse } from '@/types/user'
import type {
  StationTopology,
  StationTopologySavePayload,
  ChannelBindingsData,
  InstanceChannelSummary,
} from '@/types/stationTopology'
import {
  mockGetStationTopology,
  mockSaveStationTopology,
  useStationTopologyMock,
} from '@/mock/stationTopologyMock'

/** 获取当前站点拓扑，未配置时返回空 nodes/edges，不返回 404 */
export async function getStationTopology(
  config?: RequestConfig,
): Promise<ApiResponse<StationTopology>> {
  if (useStationTopologyMock()) {
    const topology = await mockGetStationTopology()
    return { success: true, code: 0, message: 'ok (mock)', data: topology }
  }
  return Request.get('/modApi/api/station/topology', undefined, config)
}

/** 保存站点拓扑（Upsert，覆盖整条记录） */
export async function saveStationTopology(
  payload: StationTopologySavePayload,
): Promise<ApiResponse<StationTopology>> {
  if (useStationTopologyMock()) {
    const topology = await mockSaveStationTopology({
      station_name: payload.station_name,
      description: payload.description,
      flow_json: payload.flow_json,
    })
    return { success: true, code: 0, message: 'ok (mock)', data: topology }
  }
  return Request.put('/modApi/api/station/topology', payload)
}

/**
 * 获取拓扑节点的实时通道绑定。
 * 后端从 measurement_routing 表实时计算，路由变更后自动反映，
 * 无需重新保存拓扑。flow_json 中的 channelIds 字段可不传。
 */
export async function getChannelBindings(
  config?: RequestConfig,
): Promise<ApiResponse<ChannelBindingsData>> {
  return Request.get('/modApi/api/station/topology/channel-bindings', undefined, config)
}

/**
 * 获取单个实例的通道汇总（PCManagement 右侧面板绑定实例后回填用）。
 * 数据源为 SQLite measurement_routing 表，实例无路由时返回空数组。
 */
export async function getInstanceChannelSummary(
  instanceId: number,
  config?: RequestConfig,
): Promise<ApiResponse<InstanceChannelSummary>> {
  return Request.get(`/modApi/api/instances/${instanceId}/channel-summary`, undefined, config)
}
