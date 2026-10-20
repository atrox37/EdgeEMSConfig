// 可视化建模模块类型定义

import type { ProductTopologyConnectionRule } from '@/types/deviceConfiguration'

export type ModelNodeType = 'product'
export type TopologyHandleSide = 'top' | 'right' | 'bottom' | 'left'

/** 固定 Station / Environment 卡片绑定的实例 */
export interface ModelInstanceBinding {
  instanceId: number
  instanceName: string
  productName?: string
}

/** 节点携带的数据（与后端 flow_json 持久化字段对齐） */
export interface ModelNodeData {
  label: string
  description?: string
  productName?: string
  /** 当前节点绑定的唯一设备实例；null 表示尚未绑定。 */
  instanceId?: number | null
  /** 产品图片 URL（画布展示，不持久化） */
  imageUrl?: string
}

export interface ModelFlowNode {
  id: string
  type: ModelNodeType
  position: { x: number; y: number }
  data: ModelNodeData
  style?: Record<string, string | number>
  zIndex?: number
}

export interface ModelFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle: TopologyHandleSide
  targetHandle: TopologyHandleSide
  type: 'deletable-smoothstep'
  style?: Record<string, string | number>
  markerEnd?: unknown
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

/** 左侧面板可拖拽模板（由产品 API 生成） */
export interface ModelNodeTemplate {
  id: string
  type: ModelNodeType
  label: string
  description: string
  productName?: string
  instanceId?: number
  imageUrl?: string
  /** 拓扑连线规则，来自产品 topology.connections。 */
  connections?: ProductTopologyConnectionRule[]
}
