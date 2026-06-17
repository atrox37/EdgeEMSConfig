import type { ModelFlowData } from '@/types/visualModeling'

/** 边端单站点拓扑（与后端契约一致） */
export interface StationTopology {
  station_id: string
  station_name: string
  description: string | null
  gateway_id?: string | null
  flow_json: ModelFlowData
  /** 未配置时后端返回 null */
  created_at: string | null
  updated_at: string | null
}

export interface StationTopologySavePayload {
  station_name?: string
  description?: string
  gateway_id?: string
  flow_json: ModelFlowData
}

export interface StationTopologyResponse {
  topology: StationTopology
}

// ── channel-bindings 接口类型 ──────────────────────────────────────────────

/** 单个实例的通道绑定（channel-bindings 接口返回） */
export interface InstanceChannelBinding {
  instanceId: number
  instanceName: string
  /** 当前实际路由的通道 ID 列表（实时查路由表，非 flow_json 快照） */
  channelIds: number[]
}

/** 单个节点的绑定信息 */
export interface NodeChannelBinding {
  nodeId: string
  productName: string
  instances: InstanceChannelBinding[]
}

/** GET /api/station/topology/channel-bindings 响应 data 字段 */
export interface ChannelBindingsData {
  bindings: NodeChannelBinding[]
}

// ── channel-summary 接口类型 ───────────────────────────────────────────────

/** GET /api/instances/{id}/channel-summary 响应 data 字段 */
export interface InstanceChannelSummary {
  instanceId: number
  instanceName: string
  channelIds: number[]
  /** channelNames[i] 对应 channelIds[i]，未配置名称时为 null */
  channelNames: (string | null)[]
  routingCount: number
}
