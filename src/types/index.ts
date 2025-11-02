// 规则链相关类型定义

export interface RuleChain {
  id: string
  name: string
  description: string
  isRoot: boolean
  createdAt: string
  updatedAt: string
}

export interface RuleCard {
  id: string
  cardId?: string
  type:
    | 'filter'
    | 'attributes'
    | 'transform'
    | 'action'
    | 'external'
    | 'flow'
    | 'function-switch'
    | 'action-changeValue'
    | 'start'
    | 'end'
  description: string
  // 可选的展示与配置字段，供编辑对话框与节点显示使用
  label?: string
  config?: Record<string, any>
}

export interface Edge {
  id: string
  type: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  data: {
    color?: string
    strokeWidth?: number
    dash?: string
    animated?: boolean
    curved?: boolean
    [key: string]: any
  }
  label: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export interface Node {
  id: string
  type: string
  position: { x: number; y: number }
  data: RuleCard
  [key: string]: any
}

export interface TooltipContent {
  title: string
  description: string
  examples?: string[]
}
