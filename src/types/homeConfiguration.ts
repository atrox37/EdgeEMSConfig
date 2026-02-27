/**
 * 首页配置点位相关类型定义
 */

/** 计算点位单条数据 */
export interface HomepagePointItem {
  id: number
  name: string
  formula: string
  unit: string
  imgurl: string
  description: string
  created_at: string
  updated_at: string
}

/** 计算点位列表分页响应 */
export interface HomepagePointsListData {
  items: HomepagePointItem[]
  total: number
  page: number
  limit: number
  pages: number
}

/** 获取计算点位列表 API 响应 */
export interface HomepagePointsResponse {
  success: boolean
  message: string
  data: HomepagePointsListData
}

/** 修改点位请求体 */
export interface UpdateHomepagePointRequest {
  name: string
  formula: string
  unit: string
  imgurl: string
  description: string
}

/**
 * 页面可配置点位固定 ID 映射（按位置命名，不依赖名称）
 * 参照 docs/home-configuration-points-export.md，ID 1-19 对应页面固定位置
 */
export const HOMEPAGE_POINT_IDS = {
  /** Energy Dashboard：按卡片顺序 */
  ENERGY_FIRST: 1,
  ENERGY_SECOND: 2,
  ENERGY_THIRD: 3,
  ENERGY_FOURTH: 4,
  /** Station Information：按顺序 */
  STATION_FIRST: 5,
  STATION_SECOND: 6,
  STATION_THIRD: 7,
  /** Device 轮播图：按设备顺序 + 左右列（P 左 / U 右） */
  DEVICE_PV_LEFT: 8,
  DEVICE_PV_RIGHT: 9,
  DEVICE_DIESEL_LEFT: 10,
  DEVICE_DIESEL_RIGHT: 11,
  DEVICE_ESS_LEFT: 12,
  DEVICE_ESS_RIGHT: 13,
  /** Topology 拓扑图：按节点顺序 + 指标顺序 */
  TOPOLOGY_PV_FIRST: 14,
  TOPOLOGY_LOAD_FIRST: 15,
  TOPOLOGY_DIESEL_FIRST: 16,
  TOPOLOGY_DIESEL_SECOND: 17,
  TOPOLOGY_ESS_FIRST: 18,
  TOPOLOGY_ESS_SECOND: 19,
} as const

/** 点位 ID 到页面模块的映射（用于 PointConfigDialog） */
export type HomepagePointId = (typeof HOMEPAGE_POINT_IDS)[keyof typeof HOMEPAGE_POINT_IDS]
