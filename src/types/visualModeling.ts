// 可视化建模模块类型定义

import type { ProductTopologyConnectionRule } from '@/types/deviceConfiguration'

export type ModelNodeType = 'station' | 'product' | 'group'
export type ModelEdgeType = 'hierarchy' | 'classification'
export type TopologyNodeKind = 'standalone' | 'composite' | 'container'
export type TopologyHandleSide = 'top' | 'right' | 'bottom' | 'left'

/** 网页展示点位配置（运维在PCManagement中配置，由VoltageEMS apps读取） */
export interface DisplayPointConfig {
  measurementId: number
  label: string
  unit: string
  /** 可选值转换，格式: "status_map:{0:Discharge,1:Charge}" */
  transform?: string
}

/** 通道绑定配置（由实例routing自动回填） */
export interface ChannelBinding {
  channelIds: number[]
}

/** 节点绑定的设备实例（支持多个） */
export interface ModelInstanceBinding {
  instanceId: number
  instanceName: string
  productName?: string
  /** 该实例关联的通信通道ID列表（由PCManagement从routing接口自动填充） */
  channelIds?: number[]
  /** Overview页面展示的测量点配置 */
  overviewPoints?: DisplayPointConfig[]
}

/** 节点携带的数据（与设备实例对齐） */
export interface ModelNodeData {
  label: string
  description?: string
  productName?: string
  /** 产品父级名称，来自物模型产品定义 */
  parentName?: string
  /** 当前节点绑定的唯一设备实例；null 表示尚未绑定。 */
  instanceId?: number | null
  /** @deprecated 后续以图片展示，保留字段兼容 */
  color?: string
  /** @deprecated 后续以图片展示，保留字段兼容 */
  icon?: string
  /** 产品图片 URL（预留） */
  imageUrl?: string
  /** ESS / Generator 等纯容器节点标记 */
  isContainer?: boolean
  /** 拓扑节点展示类型；用于区分 Standalone / Composite / Container。 */
  topologyType?: TopologyNodeKind
  /** Instance product types permitted by this component, supplied by product topology.components. */
  selectableProductTypes?: string[]
  /** @deprecated 属性改由点位配置页维护 */
  properties?: Record<string, string | number>
  width?: number
  height?: number
  /** 节点展开状态，仅用于画布交互布局 */
  uiExpanded?: boolean
}

export interface ModelFlowNode {
  id: string
  type: ModelNodeType
  position: { x: number; y: number }
  data: ModelNodeData
  parentNode?: string
  extent?: 'parent'
  style?: Record<string, string | number>
  zIndex?: number
}

export interface ModelFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle: TopologyHandleSide
  targetHandle: TopologyHandleSide
  label?: string
  type: 'deletable-smoothstep'
  style?: Record<string, string | number>
  markerEnd?: any
}

export interface ModelFlowData {
  nodes: ModelFlowNode[]
  edges: ModelFlowEdge[]
  /** 固定在画布左上角的绑定，不属于拓扑节点或连线。 */
  fixedBindings?: {
    stationInstanceId: number | null
    environmentInstanceId: number | null
  }
}

export interface VisualModel {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  flowJson: ModelFlowData
}

/** 左侧面板可拖拽模板 */
export interface ModelNodeTemplate {
  id: string
  type: ModelNodeType
  label: string
  description: string
  productName?: string
  parentName?: string
  /** @deprecated */
  color?: string
  /** @deprecated */
  icon?: string
  instanceId?: number
  imageUrl?: string
  topologyType?: TopologyNodeKind
  /** 拓扑连线规则，来自产品 topology.connections。 */
  connections?: ProductTopologyConnectionRule[]
}
