import { ref, computed, type Ref } from 'vue'
import { getInstancePoints, getAllInstances, getInstancesByIds } from '@/api/devicesManagement'

export interface VariableOption {
  label: string
  value: string
  tooltip: string
}

export interface FunctionSwitchPointOption {
  label: string
  value: number | string
  unit?: string
  raw?: unknown
}

interface UseFunctionSwitchVariablesOptions {
  cardData: Ref<Record<string, any>>
  onVariablesChanged?: () => void
  /** ActionChangeValue 卡片支持 action 点位类型 */
  includeActionPointType?: boolean
}

function buildActionPointOptions(data: unknown): FunctionSwitchPointOption[] {
  const raw = (
    Array.isArray((data as { actions?: unknown[] })?.actions)
      ? (data as { actions: unknown[] }).actions
      : Object.values((data as { actions?: Record<string, unknown> })?.actions || {})
  ) as Array<Record<string, unknown>>
  return raw
    .filter((a) => a && (a.action_id != null || a.id != null) && a.name != null)
    .map((a) => ({
      label: String(a.name || ''),
      value:
        typeof a.action_id !== 'undefined'
          ? Number.isFinite(Number(a.action_id))
            ? Number(a.action_id)
            : String(a.action_id)
          : Number.isFinite(Number(a.id))
            ? Number(a.id)
            : String(a.id),
      unit: String(a.unit || ''),
      raw: a,
    }))
}

function buildPointOptionsFromData(
  data: unknown,
  pointType: 'property' | 'measurement' | 'action',
): FunctionSwitchPointOption[] {
  if (pointType === 'action') {
    return buildActionPointOptions(data)
  }
  if (pointType === 'property') {
    const props = Object.values((data as { properties?: Record<string, unknown> })?.properties || {})
    return props
      .filter((p: any) => p && p.property_id && p.name != null)
      .map((p: any) => ({
        label: String(p.name || ''),
        value: Number(p.property_id),
        unit: p.unit || '',
        raw: p,
      }))
  }
  const measurements = Object.values(
    (data as { elements?: Record<string, unknown>; measurements?: Record<string, unknown> })
      ?.elements ||
      (data as { measurements?: Record<string, unknown> })?.measurements ||
      {},
  )
  return measurements
    .filter((m: any) => m && m.measurement_id && m.name != null)
    .map((m: any) => ({
      label: String(m.name || ''),
      value: Number(m.measurement_id),
      unit: m.unit || '',
      raw: m,
    }))
}

export function useFunctionSwitchVariables(options: UseFunctionSwitchVariablesOptions) {
  const instanceOptions = ref<Array<{ label: string; value: number | string; d: unknown }>>([])
  const varPointOptions = ref<Record<number, FunctionSwitchPointOption[]>>({})
  const instancePointsCache = ref<Record<number, unknown>>({})
  const arithmeticOperatorOptions = ref<string[]>(['+', '-', '*', '/'])

  function getVarPointOptions(idx: number | string) {
    const index = Number(idx)
    return varPointOptions.value[index] || []
  }

  function resolveVariablePointType(pointType: string): 'property' | 'measurement' | 'action' {
    if (options.includeActionPointType && pointType === 'action') return 'action'
    return pointType === 'property' ? 'property' : 'measurement'
  }

  function buildPointOptionsForVariable(data: unknown, pointType: string) {
    return buildPointOptionsFromData(data, resolveVariablePointType(pointType))
  }

  async function fetchInstances() {
    try {
      const res = await getAllInstances()
      const list = Array.isArray(res?.data?.list) ? res.data.list : []
      instanceOptions.value = list
        .map((it: any) => ({
          label: String(it?.name || ''),
          value: Number(it?.id),
          d: it,
        }))
        .filter((opt) => !!opt.label && (Number.isFinite(Number(opt.value)) || String(opt.value)))
    } catch {
      instanceOptions.value = []
    }
  }

  function onVarPointChange(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    const v = options.cardData.value.config.variables[index]
    const pointId = v.point_id
    if (pointId == null || pointId === '') {
      v.point_id = undefined
      v.point_name = ''
      v.unit = ''
      return
    }
    const pointOpts = varPointOptions.value[index] || []
    const pointOpt = pointOpts.find((opt) => opt.value === pointId)
    if (pointOpt) {
      v.point_name = pointOpt.label || ''
      v.unit = pointOpt.unit || ''
      return
    }
    const cached = instancePointsCache.value[index]
    if (cached && v.pointType) {
      const allPoints = buildPointOptionsForVariable(cached, v.pointType)
      const found = allPoints.find((opt) => opt.value === pointId)
      if (found) {
        v.point_name = found.label || ''
        v.unit = found.unit || ''
      } else {
        v.point_name = String(pointId)
        v.unit = ''
      }
    } else {
      v.point_name = String(pointId)
      v.unit = ''
    }
  }

  function normalizeVariables() {
    const vars = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    for (let idx = 0; idx < vars.length; idx++) {
      const v = vars[idx]
      if (!v) continue
      if (v.type === 'combined') {
        if (!Array.isArray(v.formula) || v.formula.length < 3) v.formula = ['', '', '']
        v.instance_id = undefined
        v.instance_name = ''
        v.pointType = ''
        v.point_id = undefined
        v.point_name = ''
        v.unit = v.unit || ''
      } else {
        if (v.pointType == null) v.pointType = ''
        if (v.unit == null) v.unit = ''
        if (!Array.isArray(v.formula)) v.formula = []
        if (v.instance_id != null && Number.isFinite(v.instance_id) && v.instance_id > 0) {
          const instanceOpt = instanceOptions.value.find((opt) => opt.value === v.instance_id)
          if (instanceOpt) {
            v.instance_name = instanceOpt.label
          }
        }
        if (v.point_id != null && (!v.point_name || !v.unit)) {
          onVarPointChange(idx)
        }
      }
    }
  }

  async function preloadVarOptions() {
    const vars = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    const instanceIdsToFetch = new Set<number>()
    const varIndexMap = new Map<number, number[]>()

    for (let idx = 0; idx < vars.length; idx++) {
      const v = vars[idx]
      if (!v || v.type === 'combined' || !v.instance_id || !v.pointType) continue
      const instanceId = Number(v.instance_id)
      if (!Number.isFinite(instanceId) || instanceId <= 0) continue
      instanceIdsToFetch.add(instanceId)
      if (!varIndexMap.has(instanceId)) {
        varIndexMap.set(instanceId, [])
      }
      varIndexMap.get(instanceId)!.push(idx)
    }

    if (instanceIdsToFetch.size > 0) {
      try {
        const idsArray = Array.from(instanceIdsToFetch)
        const res = await getInstancesByIds(idsArray)
        const instancesList = Array.isArray(res?.data?.list) ? res.data.list : []

        for (const instance of instancesList) {
          const instanceId = Number(instance?.instance_id)
          if (!Number.isFinite(instanceId) || instanceId <= 0) continue

          const pointsData = instance?.points || {}
          const varIndexes = varIndexMap.get(instanceId) || []

          for (const idx of varIndexes) {
            const v = vars[idx]
            if (!v || v.type === 'combined' || !v.instance_id || !v.pointType) continue

            instancePointsCache.value[idx] = pointsData
            varPointOptions.value[idx] = buildPointOptionsForVariable(pointsData, v.pointType)

            if (!v.instance_name) {
              v.instance_name = instance?.instance_name || ''
            }
            if (v.point_id && (!v.point_name || !v.unit)) {
              onVarPointChange(idx)
            }
          }
        }
      } catch {
        for (let idx = 0; idx < vars.length; idx++) {
          const v = vars[idx]
          if (!v || v.type === 'combined' || !v.instance_id || !v.pointType) continue
          const instanceId = v.instance_id
          try {
            if (!Number.isFinite(instanceId) || instanceId <= 0) continue
            const res = await getInstancePoints(instanceId)
            const data = res?.data || {}
            instancePointsCache.value[idx] = data
            varPointOptions.value[idx] = buildPointOptionsForVariable(data, v.pointType)
            if (!v.instance_name) {
              const instanceOpt = instanceOptions.value.find((opt) => opt.value === instanceId)
              if (instanceOpt) {
                v.instance_name = instanceOpt.label
              }
            }
            if (v.point_id && (!v.point_name || !v.unit)) {
              onVarPointChange(idx)
            }
          } catch {
            delete instancePointsCache.value[idx]
            varPointOptions.value[idx] = []
          }
        }
      }
    }
  }

  async function onVarInstanceChange(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    const v = options.cardData.value.config.variables[index]
    v.point_id = undefined
    v.point_name = ''
    v.unit = ''
    varPointOptions.value[index] = []
    const instanceId = Number(v.instance_id)
    if (Number.isFinite(instanceId) && instanceId > 0) {
      const instanceOpt = instanceOptions.value.find((opt) => opt.value === instanceId)
      v.instance_name = instanceOpt?.label || ''
    } else {
      v.instance_id = undefined
      v.instance_name = ''
    }
    if (!Number.isFinite(instanceId) || instanceId <= 0) return
    try {
      const res = await getInstancePoints(instanceId)
      const data = res?.data || {}
      instancePointsCache.value[index] = data
      if (v.pointType) {
        varPointOptions.value[index] = buildPointOptionsForVariable(data, v.pointType)
      }
    } catch {
      delete instancePointsCache.value[index]
      varPointOptions.value[index] = []
    }
  }

  async function onVarPointTypeChange(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    const v = options.cardData.value.config.variables[index]
    v.point_id = undefined
    v.point_name = ''
    v.unit = ''
    varPointOptions.value[index] = []
    const instanceId = Number(v.instance_id)
    if (!v.pointType) return
    const cached = instancePointsCache.value[index]
    if (cached) {
      varPointOptions.value[index] = buildPointOptionsForVariable(cached, v.pointType)
      return
    }
    if (!Number.isFinite(instanceId) || instanceId <= 0) return
    try {
      const res = await getInstancePoints(instanceId)
      const data = res?.data || {}
      instancePointsCache.value[index] = data
      varPointOptions.value[index] = buildPointOptionsForVariable(data, v.pointType)
    } catch {
      delete instancePointsCache.value[index]
      varPointOptions.value[index] = []
    }
  }

  const variablesByName = computed<Record<string, any>>(() => {
    const list = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    return list.reduce((acc: Record<string, any>, v: any) => {
      const name = v?.name
      if (name) acc[name] = v
      return acc
    }, {})
  })

  function formatSingleVariable(v: any): string {
    const instance = v.instance_name || v.instance_id || '-'
    const pointType = v.pointType || '-'
    const point = v.point_name || v.point_id || '-'
    return `${instance}/${pointType}/${point}`
  }

  function formatOperand(raw: unknown, visited: Set<string>): string {
    if (raw == null || raw === '') return ''
    const text = String(raw)
    const n = Number(text)
    if (text.trim() !== '' && Number.isFinite(n)) return text
    const def = variablesByName.value[text]
    if (def) return buildVariableTooltip(def, visited)
    return text
  }

  function buildVariableTooltip(v: any, visited: Set<string> = new Set()): string {
    if (!v?.name) return ''
    if (visited.has(v.name)) return v.name
    visited.add(v.name)
    if (v.type === 'combined') {
      const formula = Array.isArray(v.formula) ? v.formula : []
      if (!formula.length) return v.name
      return formula
        .map((item: unknown, idx: number) => {
          if (idx % 2 === 1) return String(item ?? '')
          return formatOperand(item, visited)
        })
        .filter((x: string) => x !== '')
        .join(' ')
    }
    return formatSingleVariable(v)
  }

  function buildVariableOptions(onlySingle: boolean): VariableOption[] {
    const list = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    return list
      .filter((v: any) => v?.name && (!onlySingle || v.type !== 'combined'))
      .map((v: any) => ({
        label: v.name,
        value: v.name,
        tooltip: buildVariableTooltip(v),
      }))
  }

  const variableOptions = computed<VariableOption[]>(() => buildVariableOptions(false))
  const singleVariableOptions = computed<VariableOption[]>(() => buildVariableOptions(true))
  const variableNameOptions = computed(() =>
    variableOptions.value.map((opt: VariableOption) => opt.value),
  )

  function getNextVariableIndex(): number {
    const list = options.cardData.value?.config?.variables
    const names: string[] = (Array.isArray(list) ? list : []).map((v: any) => v?.name).filter(Boolean)
    let max = 0
    for (const n of names) {
      const m = /^X(\d+)$/.exec(n)
      if (m) max = Math.max(max, Number(m[1]))
    }
    return max + 1
  }

  function addVariable() {
    const nextIdx = getNextVariableIndex()
    options.cardData.value.config.variables.push({
      name: `X${nextIdx}`,
      type: 'single',
      instance_id: undefined,
      instance_name: '',
      pointType: '',
      point_id: undefined,
      point_name: '',
      unit: '',
    })
  }

  function removeVariable(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    const vars = options.cardData.value.config.variables
    if (!Array.isArray(vars)) return
    vars.splice(index, 1)
    options.onVariablesChanged?.()
  }

  function onVariableTypeChange(v: any) {
    if (v.type === 'combined') {
      if (!Array.isArray(v.formula)) v.formula = ['', '', '']
      v.instance_id = undefined
      v.instance_name = ''
      v.pointType = options.includeActionPointType ? '' : 'measurement'
      v.point_id = undefined
      v.point_name = ''
    } else {
      v.formula = []
    }
  }

  function addCombinedRow(v: any) {
    if (!Array.isArray(v.formula)) v.formula = ['', '', '']
    v.formula.push('')
    v.formula.push('')
  }

  function removeCombinedRow(v: any, pairIndex: number) {
    if (!Array.isArray(v.formula)) return
    const start = 3 + pairIndex * 2
    if (start <= v.formula.length - 2) {
      v.formula.splice(start, 2)
    }
  }

  function getCombinedExtraPairCount(v: any) {
    if (!Array.isArray(v.formula) || v.formula.length <= 3) return 0
    return Math.floor((v.formula.length - 3) / 2)
  }

  function getVariableOptionsExcluding(selfIdx: number | string) {
    const index = Number(selfIdx)
    const list = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    const selfName = list[index]?.name
    return variableOptions.value.filter((opt) => opt.value !== selfName)
  }

  function onCombinedOperandChange(v: any, index: number, val: unknown) {
    const s = String(val ?? '').trim()
    const n = Number(s)
    const isVar = variableNameOptions.value.includes(s)
    v.formula[index] = Number.isFinite(n) ? n : isVar ? s : ''
  }

  function onCombinedExtraOperandChange(v: any, index: number, val: unknown) {
    onCombinedOperandChange(v, index, val)
  }

  async function bootstrapVariables() {
    await fetchInstances()
    normalizeVariables()
    await preloadVarOptions()
  }

  return {
    instanceOptions,
    arithmeticOperatorOptions,
    getVarPointOptions,
    fetchInstances,
    normalizeVariables,
    preloadVarOptions,
    bootstrapVariables,
    onVarInstanceChange,
    onVarPointTypeChange,
    onVarPointChange,
    variableOptions,
    singleVariableOptions,
    variableNameOptions,
    variablesByName,
    addVariable,
    removeVariable,
    onVariableTypeChange,
    addCombinedRow,
    removeCombinedRow,
    getCombinedExtraPairCount,
    getVariableOptionsExcluding,
    onCombinedOperandChange,
    onCombinedExtraOperandChange,
  }
}

export type FunctionSwitchVariablesApi = ReturnType<typeof useFunctionSwitchVariables>
