// 可视化建模模块类型定义

export type ModelNodeType = 'station' | 'product' | 'group'
export type ModelEdgeType = 'hierarchy' | 'classification'

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
  /** 绑定的设备实例列表 */
  instances?: ModelInstanceBinding[]
  /** @deprecated 兼容旧数据，读取时请用 normalizeNodeInstances */
  instanceId?: number
  /** @deprecated 兼容旧数据 */
  instanceName?: string
  /** @deprecated 后续以图片展示，保留字段兼容 */
  color?: string
  /** @deprecated 后续以图片展示，保留字段兼容 */
  icon?: string
  /** 产品图片 URL（预留） */
  imageUrl?: string
  /** ESS / Generator 等纯容器节点标记 */
  isContainer?: boolean
  /** @deprecated 属性改由点位配置页维护 */
  properties?: Record<string, string | number>
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
}

/** 左侧面板可拖拽模板 */
export interface ModelNodeTemplate {
  id: string
  type: ModelNodeType
  label: string
  description: string
  productName?: string
  parentName?: string
  /** 拖入已配置实例时使用 */
  instances?: ModelInstanceBinding[]
  /** @deprecated */
  color?: string
  /** @deprecated */
  icon?: string
  instanceId?: number
  instanceName?: string
  imageUrl?: string
}
