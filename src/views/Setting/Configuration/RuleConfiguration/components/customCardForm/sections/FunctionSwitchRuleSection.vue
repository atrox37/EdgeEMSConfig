<template>
  <div class="section rule-section" :class="{ 'is-collapsed': collapsed }">
    <div class="section__header">
      <span class="section__title">
        <span class="section__title-text">Rule Settings</span>
        <span class="section__title-lines" aria-hidden="true">
          <span class="section__title-line">Rule</span>
          <span class="section__title-line">Settings</span>
        </span>
      </span>
      <el-button class="section__add-btn" type="primary" title="Add rule" @click="emit('add-rule')">
        <AppIcon name="i-tabler-plus" className="section__add-btn-icon" />
      </el-button>
    </div>
    <div class="section__body rule">
      <article
        v-for="(rule, ruleIndex) in cardData.config.rule"
        :key="`rule-${ruleIndex}-${rule.name}`"
        class="rule-card"
      >
        <div v-if="rule.type === 'alone'" class="rule-card__condition-row">
          <span class="rule-card__name">{{ rule.name }}:</span>
          <div class="field-grid field-grid--rule-default">
            <span class="field-grid__lead-spacer" aria-hidden="true" />
            <el-select
              v-model="rule.rule.variables"
              :fit-input-width="true"
              class="field-grid__control"
              placeholder="Variable"
              filterable
            >
              <el-option
                v-for="opt in variableOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value as string | number"
              >
                <div class="option-remind-row" :title="opt.tooltip || opt.label">
                  {{ opt.label }}
                </div>
              </el-option>
            </el-select>
            <el-select
              v-model="rule.rule.operator"
              :fit-input-width="true"
              class="field-grid__control"
              placeholder="Operator"
            >
              <el-option v-for="op in operatorOptions" :key="op" :label="op" :value="op" />
            </el-select>
            <el-select
              v-model="rule.rule.value"
              :fit-input-width="true"
              class="field-grid__control"
              placeholder="Value"
              filterable
              allow-create
              default-first-option
              reserve-keyword
              @change="(val: unknown) => emit('rule-value-change', rule, val)"
            >
              <el-option
                v-for="opt in variableOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value as string | number"
              >
                <div class="option-remind-row" :title="opt.tooltip || opt.label">
                  {{ opt.label }}
                </div>
              </el-option>
            </el-select>
            <el-button
              class="rule-card__rule-delete"
              style="width: 32px !important"
              title="Remove rule"
              @click="emit('remove-rule', ruleIndex)"
            >
              <AppIcon name="i-tabler-trash" className="variable-row__delete-icon" />
            </el-button>
          </div>
        </div>

        <div v-else-if="rule.type === 'default'" class="rule-card__default">
          <template v-for="(sub, subIndex) in rule.rule" :key="`sub-${subIndex}`">
            <template v-if="sub.type === 'variable'">
              <span
                v-if="isFirstVariableCondition(rule.rule, Number(subIndex))"
                class="rule-card__name"
              >
                {{ rule.name }}:
              </span>
              <span v-else class="rule-card__tree-cell" aria-hidden="true" />

              <span
                v-if="isFirstVariableCondition(rule.rule, Number(subIndex))"
                class="field-grid__lead-spacer"
                aria-hidden="true"
              />
              <el-select
                v-else-if="
                  rule.rule[Number(subIndex) - 1] &&
                  rule.rule[Number(subIndex) - 1].type === 'relation'
                "
                v-model="rule.rule[Number(subIndex) - 1].value"
                :fit-input-width="true"
                class="field-grid__control"
                placeholder="Relation"
              >
                <el-option v-for="rel in relationOptions" :key="rel" :label="rel" :value="rel" />
              </el-select>
              <span v-else class="field-grid__lead-spacer" aria-hidden="true" />

              <el-select
                v-model="sub.variables"
                :fit-input-width="true"
                class="field-grid__control"
                placeholder="Variable"
                filterable
              >
                <el-option
                  v-for="opt in variableOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value as string | number"
                >
                  <div class="option-remind-row" :title="opt.tooltip || opt.label">
                    {{ opt.label }}
                  </div>
                </el-option>
              </el-select>
              <el-select
                v-model="sub.operator"
                :fit-input-width="true"
                class="field-grid__control"
                placeholder="Operator"
              >
                <el-option v-for="op in operatorOptions" :key="op" :label="op" :value="op" />
              </el-select>
              <el-select
                v-model="sub.value"
                :fit-input-width="true"
                class="field-grid__control"
                placeholder="Value"
                filterable
                allow-create
                default-first-option
                reserve-keyword
                @change="(val: unknown) => emit('rule-sub-value-change', sub, val)"
              >
                <el-option
                  v-for="opt in variableOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value as string | number"
                >
                  <div class="option-remind-row" :title="opt.tooltip || opt.label">
                    {{ opt.label }}
                  </div>
                </el-option>
              </el-select>

              <el-button
                v-if="isFirstVariableCondition(rule.rule, Number(subIndex))"
                class="rule-card__rule-delete"
                style="width: 32px !important"
                title="Remove rule"
                @click="emit('remove-rule', ruleIndex)"
              >
                <AppIcon name="i-tabler-trash" className="variable-row__delete-icon" />
              </el-button>
              <RuleFormMiniActionBtn
                v-else
                kind="delete"
                size="sm"
                title="Remove condition"
                @click="emit('remove-default-condition', rule, subIndex)"
              />
            </template>
          </template>

          <span class="rule-card__tree-cell" aria-hidden="true" />
          <RuleFormMiniActionBtn
            kind="add"
            size="sm"
            title="Add condition"
            @click="emit('add-default-condition', rule)"
          />
        </div>

        <div v-else class="rule-card__custom">
          <header class="rule-card__header">
            <span class="rule-card__name">{{ rule.name }}:</span>
            <el-button
              class="rule-card__rule-delete"
              style="width: 32px !important"
              title="Remove rule"
              @click="emit('remove-rule', ruleIndex)"
            >
              <AppIcon name="i-tabler-trash" className="variable-row__delete-icon" />
            </el-button>
          </header>
          <el-input v-model="rule.rule" type="textarea" :rows="2" placeholder="Custom rule expression" />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import RuleFormMiniActionBtn from '@/components/common/RuleFormMiniActionBtn.vue'

defineProps<{
  cardData: { config: { rule: any[] } }
  collapsed?: boolean
  variableOptions: Array<{ label: string; value: string | number; tooltip?: string }>
  operatorOptions: string[]
  relationOptions: string[]
}>()

const emit = defineEmits<{
  'add-rule': []
  'remove-rule': [index: number]
  'rule-value-change': [rule: any, value: unknown]
  'rule-sub-value-change': [sub: any, value: unknown]
  'add-default-condition': [rule: any]
  'remove-default-condition': [rule: any, index: number | string]
}>()

function isFirstVariableCondition(rules: any[], index: number): boolean {
  return rules.findIndex((item) => item.type === 'variable') === index
}
</script>

