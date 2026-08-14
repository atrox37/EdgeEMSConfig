import type {
  ExecutionTreeNode,
  RuleHistoryAssignmentDetail,
  RuleHistoryCalculationDetail,
  RuleHistoryConditionDetail,
  RuleHistoryDisplayAction,
  RuleHistoryDisplayStep,
  RuleHistoryDisplayVariable,
  RuleHistoryExecutionGraph,
  RuleHistoryExecutionGraphNode,
  RuleHistoryItem,
  RuleHistoryPointSnapshot,
} from '@/types/controlRule'

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : Number(value).toFixed(2)

const formatOptionalNumber = (value: number | undefined): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  return formatNumber(value)
}

export const getHistoryDisplay = (row: RuleHistoryItem) => row.result?.display

export const getHistorySummary = (row: RuleHistoryItem): string => {
  const summary = getHistoryDisplay(row)?.summary
  if (summary) return summary
  if (row.error) return row.error
  return '-'
}

/** Direct display text — do not regex-parse trigger_reason. */
export const getTriggerReason = (row: RuleHistoryItem): string =>
  getHistoryDisplay(row)?.trigger_reason || '-'

export const getDisplayVariables = (row: RuleHistoryItem): RuleHistoryDisplayVariable[] =>
  getHistoryDisplay(row)?.variables || []

export const formatDisplayVariable = (item: RuleHistoryDisplayVariable): string => {
  const unit = item.unit ? ` ${item.unit}` : ''
  const device = item.instance_name ? `${item.instance_name}·` : ''
  const label = item.point_name || item.label || item.key
  const base = `${device}${label} = ${formatNumber(item.value)}${unit}`
  if (item.formula_resolved) {
    return `${base} ⟵ ${item.formula_resolved}`
  }
  return base
}

export const getExecutionSteps = (row: RuleHistoryItem): RuleHistoryDisplayStep[] =>
  getHistoryDisplay(row)?.execution_steps || []

export const formatExecutionStep = (step: RuleHistoryDisplayStep): string => {
  if (step.matched_label) {
    return `${step.label} (${step.matched_label})`
  }
  return step.label
}

export type RuleHistoryStepStatus = 'default' | 'error' | 'interrupt'

const getStepKind = (step: RuleHistoryDisplayStep): string => step.node_kind || step.type || ''

const isStartOrEndStep = (step: RuleHistoryDisplayStep): boolean => {
  const kind = getStepKind(step).toLowerCase()
  const label = step.label.toLowerCase()
  return kind === 'start' || kind === 'end' || label === 'start' || label === 'end'
}

export const getExecutionStepStatus = (
  step: RuleHistoryDisplayStep,
): RuleHistoryStepStatus => {
  if (isStartOrEndStep(step)) return 'default'
  if (step.success === false) return 'error'
  if (step.terminal === true && step.terminal_reason) return 'interrupt'
  return 'default'
}

export const formatExecutionStepDescription = (step: RuleHistoryDisplayStep): string => {
  const kind = getStepKind(step)
  if (kind === 'switch' && step.conditions?.length) {
    return step.conditions.map((item) => item.expression_resolved || item.expression || '-').join(' · ')
  }
  if (kind === 'change' && step.assignments?.length) {
    return step.assignments.map(formatAssignmentDetail).join(' · ')
  }
  if (kind === 'calculation' && step.calculations?.length) {
    return step.calculations.map(formatCalculationDetail).join(' · ')
  }
  if (kind === 'periodDelta') return formatPeriodDeltaDetail(step)
  if (step.terminal_reason) return step.terminal_reason
  return ''
}

export const getDisplayActions = (row: RuleHistoryItem): RuleHistoryDisplayAction[] =>
  getHistoryDisplay(row)?.actions || []

export const getExecutionGraph = (row: RuleHistoryItem): RuleHistoryExecutionGraph | null =>
  getHistoryDisplay(row)?.execution_graph || null

export const getExecutionGraphNodeStatus = (
  node: RuleHistoryExecutionGraphNode,
): RuleHistoryStepStatus => {
  if (node.terminal_kind === 'no_matching_branch') return 'interrupt'
  if (node.status === 'failed') return 'error'
  return 'default'
}

export const formatExecutionGraphNodeDescription = (
  node: RuleHistoryExecutionGraphNode,
): string => {
  if (node.type === 'switch' && node.conditions?.length) {
    return node.conditions
      .map((item) => item.expression_resolved || item.expression || '-')
      .join(' · ')
  }
  if (node.type === 'change' && node.assignments?.length) {
    return node.assignments.map(formatAssignmentDetail).join(' · ')
  }
  if (node.type === 'calculation' && node.calculations?.length) {
    return node.calculations.map(formatCalculationDetail).join(' · ')
  }
  if (node.type === 'periodDelta') {
    const period = node.period || '-'
    const input = formatPointSnapshot(node.input)
    const output = formatPointSnapshot(node.output)
    const delta = formatOptionalNumber(node.delta)
    return `${period}: ${input} → ${output}, Δ=${delta}`
  }
  return node.terminal_reason || ''
}

export const formatPointSnapshot = (point?: RuleHistoryPointSnapshot | null): string => {
  if (!point) return '-'
  const device = point.instance_name ? `${point.instance_name}·` : ''
  const name = point.point_name || '-'
  const unit = point.unit ? ` ${point.unit}` : ''
  if (point.value === undefined || point.value === null) {
    return `${device}${name}${unit}`.trim() || '-'
  }
  return `${device}${name} = ${formatOptionalNumber(point.value)}${unit}`
}

export const formatConditionDetail = (item: RuleHistoryConditionDetail): string => {
  const expr = item.expression_resolved || item.expression || '-'
  return `${item.port}: ${expr} → ${item.result ? 'true' : 'false'}`
}

export const formatAssignmentDetail = (item: RuleHistoryAssignmentDetail): string => {
  const target = formatPointSnapshot(
    item.target
      ? {
          ...item.target,
          value: item.written_value ?? item.target.value,
        }
      : null,
  )
  const status = item.success === false ? ' (failed)' : ''
  if (item.value_source === 'variable' && item.source_variable) {
    return `${target} ← ${formatDisplayVariable(item.source_variable)}${status}`
  }
  if (item.raw_value !== undefined) {
    return `${target} ← literal ${formatOptionalNumber(item.raw_value)}${status}`
  }
  return `${target}${status}`
}

export const formatCalculationDetail = (item: RuleHistoryCalculationDetail): string => {
  const output = item.output_variable || 'output'
  const formula = item.formula_resolved || item.formula || '-'
  const result = formatOptionalNumber(item.result)
  const status = item.success === false ? ' (failed)' : ''
  return `${output} = ${formula} → ${result}${status}`
}

export const formatPeriodDeltaDetail = (step: RuleHistoryDisplayStep): string => {
  const period = step.period || '-'
  const input = formatPointSnapshot(step.input)
  const output = formatPointSnapshot(step.output)
  const delta = formatOptionalNumber(step.delta)
  const status = step.success === false ? ' (failed)' : ''
  return `${period}: ${input} → ${output}, Δ=${delta}${status}`
}

/**
 * success=true is normal even when a switch branch did nothing.
 * Only real engine errors (row.error) mark the row as failed.
 */
export const isHistorySuccess = (row: RuleHistoryItem): boolean => {
  if (row.error) return false
  return row.result?.success !== false
}

/** Split engine error blob joined by "; " into individual messages. */
export const getHistoryErrors = (row: RuleHistoryItem): string[] => {
  if (!row.error) return []
  return row.error
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

const isBranchEnd = (step: RuleHistoryDisplayStep): boolean => {
  if (step.terminal === true) return true
  const kind = step.node_kind || step.type
  return kind === 'end'
}

const isFanOutParent = (step: RuleHistoryDisplayStep): boolean => {
  const kind = step.node_kind || step.type
  return kind === 'switch' || kind === 'function-switch' || kind === 'start'
}

/**
 * Split flat DFS-ordered steps into linear branch paths.
 * After a terminal leaf, keep the shared prefix through the nearest switch/start
 * (or the leaf's parent when fan-out is from a regular node).
 */
export const splitExecutionPaths = (
  steps: RuleHistoryDisplayStep[],
): RuleHistoryDisplayStep[][] => {
  if (!steps.length) return []

  const paths: RuleHistoryDisplayStep[][] = []
  let current: RuleHistoryDisplayStep[] = []

  for (const step of steps) {
    current.push(step)
    if (!isBranchEnd(step)) continue

    paths.push([...current])
    current.pop()

    let keepUntil = -1
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (isFanOutParent(current[i])) {
        keepUntil = i
        break
      }
    }
    if (keepUntil >= 0) {
      current = current.slice(0, keepUntil + 1)
    }
  }

  if (current.length) {
    paths.push(current)
  }
  return paths
}

const mergePathsToTree = (paths: RuleHistoryDisplayStep[][]): ExecutionTreeNode[] => {
  const root: ExecutionTreeNode = {
    step: { node_id: '__root__', label: 'root' },
    children: [],
  }

  for (const path of paths) {
    let parent = root
    for (const step of path) {
      let child = parent.children.find((node) => node.step.node_id === step.node_id)
      if (!child) {
        child = { step, children: [] }
        parent.children.push(child)
      } else {
        child.step = step
      }
      parent = child
    }
  }

  return root.children
}

/**
 * Rebuild a forest from flat DFS-ordered execution_steps.
 * Supports fan-out: one port / node with multiple downstream branches.
 */
export const buildExecutionTree = (steps: RuleHistoryDisplayStep[]): ExecutionTreeNode[] =>
  mergePathsToTree(splitExecutionPaths(steps))

export const getExecutionTree = (row: RuleHistoryItem): ExecutionTreeNode[] =>
  buildExecutionTree(getExecutionSteps(row))

export interface FlatExecutionTreeItem {
  node: ExecutionTreeNode
  depth: number
  branchIndex: number
  siblingCount: number
}

/** Depth-first flatten for indented tree rendering. */
export const flattenExecutionTree = (
  nodes: ExecutionTreeNode[],
  depth = 0,
): FlatExecutionTreeItem[] => {
  const rows: FlatExecutionTreeItem[] = []
  nodes.forEach((node, index) => {
    rows.push({
      node,
      depth,
      branchIndex: index,
      siblingCount: nodes.length,
    })
    if (node.children.length) {
      rows.push(...flattenExecutionTree(node.children, depth + 1))
    }
  })
  return rows
}

export const getFlattenedExecutionTree = (row: RuleHistoryItem): FlatExecutionTreeItem[] =>
  flattenExecutionTree(getExecutionTree(row))

/** Unique node ids from execution_path — use as a Set for multi-path highlight. */
export const getExecutedNodeIdSet = (row: RuleHistoryItem): Set<string> => {
  const path = row.result?.execution_path || []
  const fromSteps = getExecutionSteps(row).map((step) => step.node_id)
  return new Set([...path, ...fromSteps].filter(Boolean))
}
