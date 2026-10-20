<template>
  <div
    class="section variable-section"
    :class="{ 'is-collapsed': collapsed }"
    :role="collapsed ? 'button' : undefined"
    :tabindex="collapsed ? 0 : undefined"
    :aria-label="collapsed ? 'Show Variable Settings' : undefined"
    :title="collapsed ? 'Show Variable Settings' : undefined"
    @click="expandCollapsed"
    @keydown.enter.prevent="expandCollapsed"
    @keydown.space.prevent="expandCollapsed"
  >
    <div class="section__header">
      <span class="section__title">
        <span class="section__title-text">Variable Settings</span>
        <span class="section__title-lines" aria-hidden="true">
          <span class="section__title-line">Variable</span>
          <span class="section__title-line">Settings</span>
        </span>
      </span>
      <span class="section__expand-hint" aria-hidden="true">
        <AppIcon name="i-tabler-chevron-left" className="section__expand-hint-icon" />
      </span>
      <el-button
        class="section__add-btn"
        type="primary"
        title="Add variable"
        @click="emit('add-variable')"
      >
        <AppIcon name="i-tabler-plus" className="section__add-btn-icon" />
      </el-button>
    </div>
    <div class="section__body variable">
      <article
        v-for="(variable, idx) in cardData.config.variables"
        :key="`var-${idx}-${variable.name}`"
        class="variable-card"
      >
        <header class="variable-card__header">
          <span class="variable-card__name">{{ variable.name }}:</span>
          <el-radio-group
            v-model="variable.type"
            class="variable-card__mode"
            @change="emit('variable-type-change', variable)"
          >
            <el-radio label="single">Single</el-radio>
            <el-radio label="combined">Combined</el-radio>
          </el-radio-group>
          <el-button
            class="rule-card__rule-delete"
            style="width: 32px !important"
            title="Remove variable"
            @click="emit('remove-variable', idx)"
          >
            <AppIcon name="i-tabler-trash" className="variable-row__delete-icon" />
          </el-button>
        </header>

        <div v-if="variable.type !== 'combined'" class="field-grid">
          <el-select
            v-model="variable.instance_id"
            :fit-input-width="true"
            placeholder="Select instance"
            class="field-grid__control"
            filterable
            @change="emit('var-instance-change', idx)"
          >
            <el-option
              v-for="opt in instanceOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-select
            v-model="variable.pointType"
            :fit-input-width="true"
            placeholder="Point type"
            class="field-grid__control"
            :disabled="!variable.instance_id"
            @change="emit('var-point-type-change', idx)"
          >
            <el-option label="measurement" value="measurement" />
            <el-option label="property" value="property" />
            <el-option v-if="includeActionPointType" label="action" value="action" />
          </el-select>
          <el-select
            v-model="variable.point_id"
            :fit-input-width="true"
            placeholder="Select point"
            class="field-grid__control"
            filterable
            :disabled="!variable.instance_id || !variable.pointType"
            @change="emit('var-point-change', idx)"
          >
            <el-option
              v-for="opt in getVarPointOptions(idx)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <span class="field-grid__action-spacer" aria-hidden="true" />
        </div>

        <div v-else class="variable-card__combined-grid">
          <el-select
            v-model="variable.formula[0]"
            :fit-input-width="true"
            class="field-grid__control"
            placeholder="Variable or number"
            filterable
            allow-create
            default-first-option
            reserve-keyword
            @change="(val: unknown) => emit('combined-operand-change', variable, 0, val)"
          >
            <el-option
              v-for="opt in getVariableOptionsExcluding(idx)"
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
            v-model="variable.formula[1]"
            :fit-input-width="true"
            class="field-grid__control"
            placeholder="Operator"
          >
            <el-option
              v-for="op in arithmeticOperatorOptions"
              :key="op"
              :label="op"
              :value="op"
            />
          </el-select>
          <el-select
            v-model="variable.formula[2]"
            :fit-input-width="true"
            class="field-grid__control"
            placeholder="Variable or number"
            filterable
            allow-create
            default-first-option
            reserve-keyword
            @change="(val: unknown) => emit('combined-operand-change', variable, 2, val)"
          >
            <el-option
              v-for="opt in getVariableOptionsExcluding(idx)"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value as string | number"
            >
              <div class="option-remind-row" :title="opt.tooltip || opt.label">
                {{ opt.label }}
              </div>
            </el-option>
          </el-select>
          <span class="field-grid__action-spacer" aria-hidden="true" />

          <template v-for="pairIdx in getCombinedExtraPairCount(variable)" :key="`pair-${idx}-${pairIdx}`">
            <span class="variable-card__tree-cell" aria-hidden="true" />
            <el-select
              v-model="variable.formula[3 + (pairIdx - 1) * 2]"
              :fit-input-width="true"
              class="field-grid__control"
              placeholder="Operator"
            >
              <el-option
                v-for="op in arithmeticOperatorOptions"
                :key="op"
                :label="op"
                :value="op"
              />
            </el-select>
            <el-select
              v-model="variable.formula[3 + (pairIdx - 1) * 2 + 1]"
              :fit-input-width="true"
              class="field-grid__control"
              placeholder="Variable or number"
              filterable
              allow-create
              default-first-option
              reserve-keyword
              @change="
                (val: unknown) =>
                  emit(
                    'combined-extra-operand-change',
                    variable,
                    3 + (pairIdx - 1) * 2 + 1,
                    val,
                  )
              "
            >
              <el-option
                v-for="opt in getVariableOptionsExcluding(idx)"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value as string | number"
              >
                <div class="option-remind-row" :title="opt.tooltip || opt.label">
                  {{ opt.label }}
                </div>
              </el-option>
            </el-select>
            <RuleFormMiniActionBtn
              kind="delete"
              size="sm"
              title="Remove term"
              @click="emit('remove-combined-row', variable, pairIdx - 1)"
            />
          </template>

          <span class="variable-card__tree-cell" aria-hidden="true" />
          <RuleFormMiniActionBtn
            kind="add"
            size="sm"
            title="Add term"
            @click="emit('add-combined-row', variable)"
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
  cardData: { config: { variables: any[] } }
  collapsed?: boolean
  includeActionPointType?: boolean
  instanceOptions: Array<{ label: string; value: number | string }>
  arithmeticOperatorOptions: string[]
  getVarPointOptions: (index: number) => Array<{ label: string; value: number | string }>
  getVariableOptionsExcluding: (index: number) => Array<{ label: string; value: string | number; tooltip?: string }>
  getCombinedExtraPairCount: (variable: any) => number
}>()

const emit = defineEmits<{
  'add-variable': []
  'remove-variable': [index: number]
  'variable-type-change': [variable: any]
  'var-instance-change': [index: number]
  'var-point-type-change': [index: number]
  'var-point-change': [index: number]
  'add-combined-row': [variable: any]
  'remove-combined-row': [variable: any, pairIndex: number]
  'combined-operand-change': [variable: any, index: number, value: unknown]
  'combined-extra-operand-change': [variable: any, index: number, value: unknown]
  expand: []
}>()

const expandCollapsed = () => {
  if (!props.collapsed) return
  emit('expand')
}
</script>

