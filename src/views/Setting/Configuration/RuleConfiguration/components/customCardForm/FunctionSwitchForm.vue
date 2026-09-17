<template>
  <div class="voltage-class rule-card-form function-switch-form">
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
        />

        <RuleCardCollapseCenter
          :collapsed-section="collapsedSection"
          @toggle="toggleCenterCollapse"
        />

        <FunctionSwitchRuleSection
          :card-data="cardData"
          :collapsed="collapsedSection === 'rule'"
          :variable-options="variableOptions"
          :operator-options="operatorOptions"
          :relation-options="relationOptions"
          @add-rule="addRule"
          @remove-rule="removeRule"
          @rule-value-change="onRuleValueChange"
          @rule-sub-value-change="onRuleSubValueChange"
          @add-default-condition="adddefaultCondition"
          @remove-default-condition="removedefaultCondition"
        />
      </div>

      <RuleCardCollapseHint />
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useFunctionSwitchRules } from '@/composables/rule/useFunctionSwitchRules'
import { useFunctionSwitchVariables } from '@/composables/rule/useFunctionSwitchVariables'
import { useRuleCardFormLayout } from '@/composables/rule/useRuleCardFormLayout'
import RuleCardBasicSection from './sections/RuleCardBasicSection.vue'
import RuleCardCollapseCenter from './sections/RuleCardCollapseCenter.vue'
import RuleCardCollapseHint from './sections/RuleCardCollapseHint.vue'
import RuleCardVariableSection from './sections/RuleCardVariableSection.vue'
import FunctionSwitchRuleSection from './sections/FunctionSwitchRuleSection.vue'

const formRef = ref()
const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})

watch(
  () => props.cardData,
  (value) => {
    if (!value) return
    cardData.value = value
  },
  { immediate: true },
)

const { collapsedSection, toggleCenterCollapse } = useRuleCardFormLayout()

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
  onVariablesChanged: () => rulesBridge.clearInvalidVariableReferences(),
})

const {
  operatorOptions,
  relationOptions,
  onRuleValueChange,
  onRuleSubValueChange,
  addRule,
  removeRule,
  adddefaultCondition,
  removedefaultCondition,
  afterValidSync,
  clearInvalidVariableReferences,
} = useFunctionSwitchRules({
  cardData,
  variableNameOptions: computed(() => variableOptions.value.map((opt) => opt.value)),
  instanceOptions,
  onVarPointChange,
})

rulesBridge.clearInvalidVariableReferences = clearInvalidVariableReferences

function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as { validate?: (cb: (valid: boolean) => void) => void } | undefined
    if (form && typeof form.validate === 'function') {
      form.validate((valid: boolean) => {
        if (valid) afterValidSync()
        resolve({ valid: !!valid, data: cardData.value })
      })
    } else {
      afterValidSync()
      resolve({ valid: true, data: cardData.value })
    }
  })
}

defineExpose({ validateForm })

onMounted(() => {
  void bootstrapVariables()
})

watch(
  () => cardData.value?.config?.variables,
  () => {
    normalizeVariables()
  },
  { deep: true },
)
</script>

<style lang="scss">
@use '@/assets/styles/components/rule-card-form' as rcf;

.voltage-class.rule-card-form.function-switch-form {
  @include rcf.rule-card-form-host('function-switch');
}
</style>
