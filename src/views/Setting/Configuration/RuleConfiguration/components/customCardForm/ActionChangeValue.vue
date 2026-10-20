<template>
  <div class="voltage-class rule-card-form action-change-value-form">
    <el-form ref="formRef" label-width="90px" :model="cardData">
      <RuleCardBasicSection :card-data="cardData" />

      <div
        class="main-section"
        :class="{
          'collapse-variable': collapsedSection === 'variable',
          'collapse-rule': collapsedSection === 'rule',
        }"
      >
        <RuleCardVariableSection
          :card-data="cardData"
          :collapsed="collapsedSection === 'variable'"
          include-action-point-type
          :instance-options="instanceOptions"
          :arithmetic-operator-options="arithmeticOperatorOptions"
          :get-var-point-options="getVarPointOptions"
          :get-variable-options-excluding="getVariableOptionsExcluding"
          :get-combined-extra-pair-count="getCombinedExtraPairCount"
          @add-variable="addVariable"
          @remove-variable="removeVariable"
          @variable-type-change="onVariableTypeChange"
          @var-instance-change="onVarInstanceChange"
          @var-point-type-change="onVarPointTypeChange"
          @var-point-change="onVarPointChange"
          @add-combined-row="addCombinedRow"
          @remove-combined-row="(variable, pairIndex) => removeCombinedRow(variable, pairIndex)"
          @combined-operand-change="onCombinedOperandChange"
          @combined-extra-operand-change="onCombinedExtraOperandChange"
          @expand="toggleCollapsedSection"
        />

        <ActionChangeValueRuleSection
          :card-data="cardData"
          :collapsed="collapsedSection === 'rule'"
          :single-variable-options="singleVariableOptions"
          :variable-options="variableOptions"
          @add-rule="addRuleRow"
          @remove-rule="removeRuleRow"
          @rule-value-change="onRuleSimpleValueChange"
          @expand="toggleCollapsedSection"
        />
      </div>

      <RuleCardCollapseHint />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useActionChangeValueRules } from '@/composables/rule/useActionChangeValueRules'
import { useFunctionSwitchVariables } from '@/composables/rule/useFunctionSwitchVariables'
import { useRuleCardFormLayout } from '@/composables/rule/useRuleCardFormLayout'
import RuleCardBasicSection from './sections/RuleCardBasicSection.vue'
import RuleCardCollapseHint from './sections/RuleCardCollapseHint.vue'
import RuleCardVariableSection from './sections/RuleCardVariableSection.vue'
import ActionChangeValueRuleSection from './sections/ActionChangeValueRuleSection.vue'

const formRef = ref()
const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})

watch(
  () => props.cardData,
  (value) => {
    if (!value) return
    cardData.value = value
    cardData.value.config = cardData.value.config || {}
    if (!Array.isArray(cardData.value.config.variables)) cardData.value.config.variables = []
    if (!Array.isArray(cardData.value.config.rule)) cardData.value.config.rule = []
  },
  { immediate: true },
)

const { collapsedSection, toggleCollapsedSection } = useRuleCardFormLayout()

const rulesBridge = {
  clearInvalidVariableReferences: (() => {}) as () => void,
}

const {
  instanceOptions,
  arithmeticOperatorOptions,
  getVarPointOptions,
  normalizeVariables,
  bootstrapVariables,
  onVarInstanceChange,
  onVarPointTypeChange,
  onVarPointChange,
  variableOptions,
  singleVariableOptions,
  variableNameOptions,
  addVariable,
  removeVariable,
  onVariableTypeChange,
  addCombinedRow,
  removeCombinedRow,
  getCombinedExtraPairCount,
  getVariableOptionsExcluding,
  onCombinedOperandChange,
  onCombinedExtraOperandChange,
} = useFunctionSwitchVariables({
  cardData,
  includeActionPointType: true,
  onVariablesChanged: () => rulesBridge.clearInvalidVariableReferences(),
})

const {
  addRuleRow,
  removeRuleRow,
  onRuleSimpleValueChange,
  normalizeRules,
  clearInvalidVariableReferences,
} = useActionChangeValueRules({
  cardData,
  variableNameOptions,
})

rulesBridge.clearInvalidVariableReferences = clearInvalidVariableReferences

function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as { validate?: (cb: (valid: boolean) => void) => void } | undefined
    if (form && typeof form.validate === 'function') {
      form.validate((valid: boolean) => {
        resolve({ valid: !!valid, data: cardData.value })
      })
    } else {
      resolve({ valid: true, data: cardData.value })
    }
  })
}

defineExpose({ validateForm })

onMounted(() => {
  void bootstrapVariables().then(() => normalizeRules())
})

watch(
  () => cardData.value?.config?.variables,
  () => {
    normalizeVariables()
    normalizeRules()
  },
  { deep: true },
)
</script>

<style lang="scss">
@use '@/assets/styles/components/rule-card-form' as rcf;

.voltage-class.rule-card-form.action-change-value-form {
  @include rcf.rule-card-form-host('action-change');
}
</style>
