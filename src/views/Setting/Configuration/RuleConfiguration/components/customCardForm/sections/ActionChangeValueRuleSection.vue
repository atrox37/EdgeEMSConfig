<template>
  <div
    class="section rule-section"
    :class="{ 'is-collapsed': collapsed }"
    :role="collapsed ? 'button' : undefined"
    :tabindex="collapsed ? 0 : undefined"
    :aria-label="collapsed ? 'Show Rule Settings' : undefined"
    :title="collapsed ? 'Show Rule Settings' : undefined"
    @click="expandCollapsed"
    @keydown.enter.prevent="expandCollapsed"
    @keydown.space.prevent="expandCollapsed"
  >
    <div class="section__header">
      <span class="section__title">
        <span class="section__title-text">Rule Settings</span>
        <span class="section__title-lines" aria-hidden="true">
          <span class="section__title-line">Rule</span>
          <span class="section__title-line">Settings</span>
        </span>
      </span>
      <span class="section__expand-hint" aria-hidden="true">
        <AppIcon name="i-tabler-chevron-right" className="section__expand-hint-icon" />
      </span>
      <el-button class="section__add-btn" type="primary" title="Add rule" @click="emit('add-rule')">
        <AppIcon name="i-tabler-plus" className="section__add-btn-icon" />
      </el-button>
    </div>
    <div class="section__body rule simple">
      <article
        v-for="(rule, ruleIndex) in cardData.config.rule"
        :key="`rule-${ruleIndex}`"
        class="rule-card rule-card--simple"
      >
        <div class="field-grid field-grid--rule-simple">
          <el-select
            v-model="rule.Variables"
            :fit-input-width="true"
            class="field-grid__control"
            placeholder="Variable"
            filterable
          >
            <el-option
              v-for="opt in singleVariableOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            >
              <div class="option-remind-row" :title="opt.tooltip || opt.label">
                {{ opt.label }}
              </div>
            </el-option>
          </el-select>
          <span class="field-grid__eq">=</span>
          <el-select
            v-model="rule.value"
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
              :value="opt.value"
            >
              <div class="option-remind-row" :title="opt.tooltip || opt.label">
                {{ opt.label }}
              </div>
            </el-option>
          </el-select>
          <RuleFormMiniActionBtn
            kind="delete"
            title="Remove rule"
            @click="emit('remove-rule', ruleIndex)"
          />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import RuleFormMiniActionBtn from '@/components/common/RuleFormMiniActionBtn.vue'

const props = defineProps<{
  cardData: { config: { rule: any[] } }
  collapsed?: boolean
  singleVariableOptions: Array<{ label: string; value: string; tooltip?: string }>
  variableOptions: Array<{ label: string; value: string | number; tooltip?: string }>
}>()

const emit = defineEmits<{
  'add-rule': []
  'remove-rule': [index: number]
  'rule-value-change': [rule: any, value: unknown]
  expand: []
}>()

const expandCollapsed = () => {
  if (!props.collapsed) return
  emit('expand')
}
</script>

