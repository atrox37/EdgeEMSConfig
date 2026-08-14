export interface PaginatedList<T> {
  list: T[]
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/** 触发历史可读化展示（后端执行时快照） */
export interface RuleHistoryDisplayVariable {
  key: string
  label: string
  value: number
  unit?: string
  instance_id?: number
  instance_name?: string
  point_id?: number
  point_name?: string
  /** Expanded formula text for combined variables; null for plain point vars */
  formula_resolved?: string | null
}

export type RuleHistoryNodeKind =
  | 'switch'
  | 'change'
  | 'calculation'
  | 'periodDelta'
  | 'start'
  | 'end'

export interface RuleHistoryConditionDetail {
  port: string
  expression: string
  expression_resolved?: string
  result: boolean
}

export interface RuleHistoryPointSnapshot {
  instance_name?: string
  point_name?: string
  unit?: string
  value?: number
}

export interface RuleHistoryAssignmentDetail {
  target?: RuleHistoryPointSnapshot
  raw_value?: number
  value_source?: 'literal' | 'variable'
  source_variable?: RuleHistoryDisplayVariable | null
  written_value?: number
  success?: boolean
}

export interface RuleHistoryCalculationDetail {
  output_variable?: string
  formula?: string
  formula_resolved?: string
  result?: number
  success?: boolean
}

export interface RuleHistoryDisplayStep {
  node_id: string
  label: string
  type?: string
  node_kind?: RuleHistoryNodeKind
  matched_port?: string
  matched_label?: string
  conditions?: RuleHistoryConditionDetail[]
  assignments?: RuleHistoryAssignmentDetail[]
  calculations?: RuleHistoryCalculationDetail[]
  period?: string
  input?: RuleHistoryPointSnapshot
  output?: RuleHistoryPointSnapshot
  delta?: number
  success?: boolean
  /** True when this node ends the current branch ("this branch stops here") */
  terminal?: boolean
  /** Present only when terminal=true */
  terminal_reason?: string
}

export interface RuleHistoryDisplayAction {
  description: string
  success?: boolean
  point_name?: string
  target_name?: string
  unit?: string
  value?: number
}

export type RuleHistoryExecutionNodeType =
  | 'start'
  | 'end'
  | 'switch'
  | 'change'
  | 'calculation'
  | 'periodDelta'
  | 'unknown'

export type RuleHistoryExecutionNodeStatus = 'executed' | 'skipped' | 'failed'

export interface RuleHistoryExecutionGraphNode {
  id: string
  type: RuleHistoryExecutionNodeType
  label: string
  status: RuleHistoryExecutionNodeStatus
  terminal?: boolean
  terminal_kind?: string
  terminal_reason?: string
  conditions?: RuleHistoryConditionDetail[]
  assignments?: RuleHistoryAssignmentDetail[]
  calculations?: RuleHistoryCalculationDetail[]
  period?: string
  input?: RuleHistoryPointSnapshot
  output?: RuleHistoryPointSnapshot
  delta?: number
}

export interface RuleHistoryExecutionGraphEdge {
  source: string
  target: string
  port?: string
  label?: string
}

export interface RuleHistoryExecutionGraph {
  nodes: RuleHistoryExecutionGraphNode[]
  edges: RuleHistoryExecutionGraphEdge[]
}

export interface RuleHistoryDisplay {
  summary?: string
  trigger_reason?: string
  variables?: RuleHistoryDisplayVariable[]
  execution_steps?: RuleHistoryDisplayStep[]
  actions?: RuleHistoryDisplayAction[]
  execution_graph?: RuleHistoryExecutionGraph
}

export interface RuleExecutionResult {
  success?: boolean
  display?: RuleHistoryDisplay
  actions_executed?: unknown[]
  execution_graph?: RuleHistoryExecutionGraph
  /** May contain multiple branch paths (fan-out); treat as a set of visited nodes */
  execution_path?: string[]
}

export interface RuleHistoryItem {
  id: number
  rule_id: number
  triggered_at: string | number
  /** Real engine errors only; multiple errors joined with "; " */
  error: string | null
  result: RuleExecutionResult | null
  rule_name?: string
}

/** Tree node for multi-branch execution visualization */
export interface ExecutionTreeNode {
  step: RuleHistoryDisplayStep
  children: ExecutionTreeNode[]
}
