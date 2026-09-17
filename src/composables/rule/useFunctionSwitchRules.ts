import { ref, type ComputedRef, type Ref } from 'vue'

interface InstanceOption {
  label: string
  value: number | string
}

interface UseFunctionSwitchRulesOptions {
  cardData: Ref<Record<string, any>>
  variableNameOptions: ComputedRef<string[]>
  instanceOptions: Ref<InstanceOption[]>
  onVarPointChange: (idx: number | string) => void
}

export function useFunctionSwitchRules(options: UseFunctionSwitchRulesOptions) {
  const operatorOptions = ref<string[]>(['==', '!=', '>', '>=', '<', '<='])
  const relationOptions = ref<string[]>(['And'])

  function clearInvalidVariableReferences() {
    const list = options.cardData.value?.config?.variables
    const validNames = new Set(
      (Array.isArray(list) ? list : []).map((v: any) => v?.name).filter(Boolean),
    )
    const rules = options.cardData.value?.config?.rule
    if (!Array.isArray(rules)) return
    for (const r of rules) {
      if (r?.type === 'alone' && r.rule) {
        if (r.rule.variables && !validNames.has(r.rule.variables)) {
          r.rule.variables = ''
        }
        if (r.rule.value && !validNames.has(r.rule.value)) {
          r.rule.value = ''
        }
      } else if (r?.type === 'default' && Array.isArray(r.rule)) {
        for (const sub of r.rule) {
          if (sub && sub.type === 'variable') {
            if (sub.variables && !validNames.has(sub.variables)) {
              sub.variables = ''
            }
            if (sub.value && !validNames.has(sub.value)) {
              sub.value = ''
            }
          }
        }
      }
    }
  }

  function onRuleValueChange(r: any, val: unknown) {
    const s = String(val ?? '').trim()
    const n = Number(s)
    r.rule.value = Number.isFinite(n) ? n : s
  }

  function onRuleSubValueChange(sub: any, val: unknown) {
    const s = String(val ?? '').trim()
    const n = Number(s)
    sub.value = Number.isFinite(n) ? n : s
  }

  function getNextOutName(): string {
    const names: string[] = (options.cardData.value?.config?.rule || []).map((r: any) => r.name)
    let max = 0
    for (const n of names) {
      const m = /^out(\d+)$/.exec(n)
      if (m) max = Math.max(max, Number(m[1]))
    }
    const next = String(max + 1).padStart(3, '0')
    return `out${next}`
  }

  function addRule() {
    const nextName = getNextOutName()
    options.cardData.value.config.rule.push({
      name: nextName,
      type: 'default',
      rule: [
        {
          type: 'variable',
          variables: options.variableNameOptions.value[0] || '',
          operator: operatorOptions.value[0],
          value: options.variableNameOptions.value[0] || '',
        },
      ],
    })
  }

  function removeRule(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    options.cardData.value.config.rule.splice(index, 1)
  }

  function adddefaultCondition(r: any) {
    if (!Array.isArray(r.rule)) r.rule = []
    r.rule.push({ type: 'relation', value: 'And' })
    r.rule.push({
      type: 'variable',
      variables: options.variableNameOptions.value[0] || '',
      value: options.variableNameOptions.value[0] || '',
      operator: operatorOptions.value[0],
    })
  }

  function removedefaultCondition(r: any, variableRuleIndex: number | string) {
    const index = Number(variableRuleIndex)
    if (!Number.isFinite(index)) return
    if (!Array.isArray(r.rule)) return
    if (index - 1 >= 0 && r.rule[index - 1] && r.rule[index - 1].type === 'relation') {
      r.rule.splice(index - 1, 1)
      r.rule.splice(index - 1, 1)
    } else {
      r.rule.splice(index, 1)
    }
  }

  function afterValidSync() {
    const names: string[] = options.cardData.value.config.rule
      .map((r: any) => r?.name)
      .filter(Boolean)
    Object.keys(options.cardData.value.config.wires).forEach((k) => {
      if (k !== 'default' && !names.includes(k)) delete options.cardData.value?.config?.wires[k]
    })
    for (const n of names) {
      if (!Array.isArray(options.cardData.value?.config.wires[n])) {
        options.cardData.value.config.wires[n] = []
      }
    }

    const vars = Array.isArray(options.cardData.value?.config?.variables)
      ? options.cardData.value.config.variables
      : []
    for (let idx = 0; idx < vars.length; idx++) {
      const v = vars[idx]
      if (!v) continue
      if (v.type === 'combined') {
        v.formula = Array.isArray(v.formula) && v.formula.length >= 3 ? v.formula : ['', '', '']
        delete v.instance
        delete v.instance_id
        delete v.instance_name
        delete v.pointType
        delete v.point
        delete v.point_id
        delete v.point_name
      } else {
        v.type = 'single'
        if (v.pointType == null) v.pointType = ''
        if (v.unit == null) v.unit = ''
        if (v.instance_id && !v.instance_name) {
          const instanceOpt = options.instanceOptions.value.find((opt) => opt.value === v.instance_id)
          if (instanceOpt) {
            v.instance_name = instanceOpt.label
          }
        }
        if (v.point_id && (!v.point_name || !v.unit)) {
          options.onVarPointChange(idx)
        }
        delete v.formula
      }
      if (Array.isArray(v.formula)) {
        v.formula = v.formula.map((x: unknown) => {
          const nx = Number(String(x))
          return String(x).trim() !== '' && Number.isFinite(nx) ? nx : x
        })
      }
    }

    const rules = options.cardData.value?.config?.rule
    if (Array.isArray(rules)) {
      for (const r of rules) {
        if (r?.type === 'alone' && r.rule) {
          const n = Number(String(r.rule.value))
          if (String(r.rule.value).trim() !== '' && Number.isFinite(n)) r.rule.value = n
        } else if (r?.type === 'default' && Array.isArray(r.rule)) {
          for (const sub of r.rule) {
            if (sub && sub.type === 'variable') {
              const n = Number(String(sub.value))
              if (String(sub.value).trim() !== '' && Number.isFinite(n)) sub.value = n
            }
          }
        }
      }
    }
  }

  return {
    operatorOptions,
    relationOptions,
    clearInvalidVariableReferences,
    onRuleValueChange,
    onRuleSubValueChange,
    addRule,
    removeRule,
    adddefaultCondition,
    removedefaultCondition,
    afterValidSync,
  }
}
