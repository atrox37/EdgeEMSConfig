// 可视化建模模块类型定义

export type ModelNodeType = 'station' | 'product' | 'group'
export type ModelEdgeType = 'hierarchy' | 'classification'

/** 节点携带的数据（与设备实例对齐） */
export interface ModelNodeData {
  label: string
  description?: string
  // ---- 实例绑定 ----
  instanceId?: number
  instanceName?: string
  productName?: string
  /** 实例属性 key-value，来自 DeviceInstanceDetail.properties */
  properties?: Record<string, string | number>
  // ---- 视觉 ----
  color?: string
  icon?: string
  // ---- group 节点专用 ----
  width?: number
  height?: number
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
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type?: string
  style?: Record<string, string | number>
  markerEnd?: any
}

export interface ModelFlowData {
  nodes: ModelFlowNode[]
  edges: ModelFlowEdge[]
}

export interface VisualModel {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  flowJson: ModelFlowData
  thumbnail?: string   // base64 PNG 缩略图，保存时自动生成
}

/** 左侧面板可拖拽模板（含可选实例字段） */
export interface ModelNodeTemplate {
  id: string
  type: ModelNodeType
  label: string
  description: string
  color: string
  icon: string
  productName?: string
  instanceId?: number
  instanceName?: string
}
