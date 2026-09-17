import type { ComputedRef, Ref } from 'vue'

interface UseActionChangeValueRulesOptions {
  cardData: Ref<Record<string, any>>
  variableNameOptions: ComputedRef<string[]>
}

export function useActionChangeValueRules(options: UseActionChangeValueRulesOptions) {
  function clearInvalidVariableReferences() {
    const validNames = new Set(options.variableNameOptions.value)
    const rules = options.cardData.value?.config?.rule
    if (!Array.isArray(rules)) return
    for (const r of rules) {
      if (r?.Variables && !validNames.has(r.Variables)) {
        r.Variables = ''
      }
      const rawValue = r?.value
      if (typeof rawValue === 'string' && rawValue && !validNames.has(rawValue)) {
        const n = Number(rawValue)
        if (!Number.isFinite(n)) {
          r.value = ''
        }
      }
    }
  }

  function addRuleRow() {
    if (!Array.isArray(options.cardData.value.config.rule)) {
      options.cardData.value.config.rule = []
    }
    options.cardData.value.config.rule.push({ Variables: '', value: '' })
  }

  function removeRuleRow(idx: number | string) {
    const index = Number(idx)
    if (!Number.isFinite(index)) return
    options.cardData.value.config.rule.splice(index, 1)
  }

  function onRuleSimpleValueChange(r: Record<string, unknown>, val: unknown) {
    const s = String(val ?? '').trim()
    const n = Number(s)
    r.value = Number.isFinite(n) ? n : s
  }

  function normalizeRules() {
    const rules = options.cardData.value?.config?.rule
    if (!Array.isArray(rules)) return
    for (const r of rules) {
      const n = Number(String(r?.value))
      if (String(r?.value ?? '').trim() !== '' && Number.isFinite(n)) {
        r.value = n
      }
    }
  }

  return {
    clearInvalidVariableReferences,
    addRuleRow,
    removeRuleRow,
    onRuleSimpleValueChange,
    normalizeRules,
  }
}
