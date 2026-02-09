<template>
  <div class="voltage-class action-change-value-form">
    <el-form ref="formRef" label-width="90px" :model="cardData">
      <!-- 基础设置 -->
      <div class="section basic-section">
        <div class="section__header">
          <span class="section__title">Basic Settings</span>
        </div>
        <div class="section__body section__body--basic">
          <el-form-item label="label:" prop="label" class="basic-item basic-item--label">
            <el-input v-model="cardData.label" />
          </el-form-item>
          <el-form-item label="description:" prop="description" class="basic-item basic-item--description">
            <el-input v-model="cardData.description" style="width: 100% !important" />
          </el-form-item>
        </div>
      </div>

      <div class="main-section" :class="{
        'collapse-variable': collapsedSection === 'variable',
        'collapse-rule': collapsedSection === 'rule',
      }">
        <!-- 变量设置（完全对齐 FunctionSwitchForm） -->
        <div class="section variable-section" :class="{ 'is-collapsed': collapsedSection === 'variable' }">
          <div class="section__header">
            <span class="section__title">
              <span class="section__title-text">Variable Settings</span>
              <span class="section__title-lines" aria-hidden="true">
                <span class="section__title-line">Variable</span>
                <span class="section__title-line">Settings</span>
              </span>
            </span>
            <el-button class="section__add-btn" type="primary" @click="addVariable">
              <el-icon>
                <Plus />
              </el-icon>
            </el-button>
          </div>
          <div class="section__body variable">
            <div v-for="(v, idx) in cardData.config.variables" :key="`var-${idx}-${v.name}`" class="variable-row">
              <el-form-item :label="v.name + ':'" class="variable-row__item">
                <div class="variable-row__mode">
                  <el-radio-group v-model="v.type" @change="onVariableTypeChange(v)">
                    <el-radio label="single">single</el-radio>
                    <el-radio label="combined">combined</el-radio>
                  </el-radio-group>
                </div>

                <!-- single 模式：先 instance -> pointType -> point -->
                <div v-if="v.type !== 'combined'" class="variable-row__controls">
                  <el-select v-model="v.instance_id" placeholder="instance" class="flex-item variable-row__select"
                    filterable @change="() => onVarInstanceChange(idx)">
                    <el-option v-for="opt in instanceOptions" :key="opt.value" :label="opt.label"
                      :value="opt.value as any" />
                  </el-select>
                  <el-select v-model="v.pointType" placeholder="point type" class="flex-item variable-row__select"
                    :disabled="!v.instance_id" @change="() => onVarPointTypeChange(idx)">
                    <el-option label="measurement" value="measurement" />
                    <el-option label="property" value="property" />
                    <el-option label="action" value="action" />
                  </el-select>
                  <el-select v-model="v.point_id" placeholder="point" class="flex-item variable-row__select" filterable
                    :disabled="!v.instance_id || !v.pointType" @change="() => onVarPointChange(idx)">
                    <el-option v-for="opt in getVarPointOptions(idx)" :key="opt.value" :label="opt.label"
                      :value="opt.value" />
                  </el-select>
                </div>

                <!-- combined：公式编辑器 -->
                <div v-else class="variable-row__combined">
                  <div class="combined-row">
                    <el-select v-model="v.formula[0]" class="variable-row__select" placeholder="variable or number"
                      filterable allow-create default-first-option reserve-keyword
                      @change="(val: any) => onCombinedOperandChange(v, 0, val)">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <el-tooltip :content="opt.tooltip || opt.label" placement="right" :show-after="200"
                          :teleported="true" popper-class="option-tooltip-popper">
                          <div class="option-tooltip-row" :title="opt.tooltip || opt.label">
                            {{ opt.label }}
                          </div>
                        </el-tooltip>
                      </el-option>
                    </el-select>
                    <el-select v-model="v.formula[1]" class="variable-row__select" placeholder="op">
                      <el-option v-for="op in arithmeticOperatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select v-model="v.formula[2]" class="variable-row__select" placeholder="variable or number"
                      filterable allow-create default-first-option reserve-keyword
                      @change="(val: any) => onCombinedOperandChange(v, 2, val)">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <el-tooltip :content="opt.tooltip || opt.label" placement="right" :show-after="200"
                          :teleported="true" popper-class="option-tooltip-popper">
                          <div class="option-tooltip-row" :title="opt.tooltip || opt.label">
                            {{ opt.label }}
                          </div>
                        </el-tooltip>
                      </el-option>
                    </el-select>
                  </div>

                  <div v-for="pairIdx in getCombinedExtraPairCount(v)" :key="`pair-${idx}-${pairIdx}`"
                    class="combined-row">
                    <el-select v-model="v.formula[3 + (pairIdx - 1) * 2]" class="variable-row__select" placeholder="op">
                      <el-option v-for="op in arithmeticOperatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select v-model="v.formula[3 + (pairIdx - 1) * 2 + 1]" class="variable-row__select"
                      placeholder="variable or number" filterable allow-create default-first-option reserve-keyword
                      @change="
                        (val: any) =>
                          onCombinedExtraOperandChange(v, 3 + (pairIdx - 1) * 2 + 1, val)
                      ">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <el-tooltip :content="opt.tooltip || opt.label" placement="right" :show-after="200"
                          :teleported="true" popper-class="option-tooltip-popper">
                          <div class="option-tooltip-row" :title="opt.tooltip || opt.label">
                            {{ opt.label }}
                          </div>
                        </el-tooltip>
                      </el-option>
                    </el-select>
                    <el-button class="combined-row__delete" link
                      @click="removeCombinedRow(v, pairIdx - 1)">
                      <el-icon class="combined-row__delete-icon">
                        <CircleClose />
                      </el-icon>
                    </el-button>
                  </div>

                  <div class="variable-row__combined-add">
                    <el-button type="primary" link @click="addCombinedRow(v)">
                      <el-icon class="combined-row__add-icon">
                        <CirclePlus />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-button class="variable-row__delete" style="width: 32px !important"
                @click="removeVariable(idx)">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <div class="collapse-center" :class="{
          'collapse-center--left': collapsedSection === 'rule',
          'collapse-center--right': collapsedSection === 'variable',
        }">
          <el-button class="collapse-center__btn" type="primary" link @click="toggleCenterCollapse">
            <el-icon v-if="collapsedSection === 'variable'">
              <ArrowRightBold />
            </el-icon>
            <el-icon v-else>
              <ArrowLeftBold />
            </el-icon>
          </el-button>
        </div>

        <!-- 规则设置（简化：Variables = value） -->
        <div class="section rule-section" :class="{ 'is-collapsed': collapsedSection === 'rule' }">
          <div class="section__header">
            <span class="section__title">
              <span class="section__title-text">Rule Settings</span>
              <span class="section__title-lines" aria-hidden="true">
                <span class="section__title-line">Rule</span>
                <span class="section__title-line">Settings</span>
              </span>
            </span>
            <el-button class="section__add-btn" type="primary" @click="addRuleRow">
              <el-icon>
                <Plus />
              </el-icon>
            </el-button>
          </div>
          <div class="section__body rule simple">
            <div v-for="(r, rIdx) in cardData.config.rule" :key="`rule-${rIdx}`" class="rule-row-simple">
              <el-select v-model="r.Variables" class="rule-row__select" placeholder="Variables" filterable>
                <el-option v-for="opt in singleVariableOptions" :key="opt.value" :label="opt.label" :value="opt.value">
                  <el-tooltip :content="opt.tooltip || opt.label" placement="right" :show-after="200" :teleported="true"
                    popper-class="option-tooltip-popper">
                    <div class="option-tooltip-row" :title="opt.tooltip || opt.label">
                      {{ opt.label }}
                    </div>
                  </el-tooltip>
                </el-option>
              </el-select>
              <span class="rule-row__eq">=</span>
              <el-select v-model="r.value" class="rule-row__select" placeholder="value" filterable allow-create
                default-first-option reserve-keyword @change="(val: any) => onRuleSimpleValueChange(r, val)">
                <el-option v-for="opt in variableOptions" :key="opt.value" :label="opt.label" :value="opt.value">
                  <el-tooltip :content="opt.tooltip || opt.label" placement="right" :show-after="200" :teleported="true"
                    popper-class="option-tooltip-popper">
                    <div class="option-tooltip-row" :title="opt.tooltip || opt.label">
                      {{ opt.label }}
                    </div>
                  </el-tooltip>
                </el-option>
              </el-select>
              <el-button class="rule-row__delete" style="width: 32px !important"
                @click="removeRuleRow(rIdx)">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <div class="collapse-hint">
        <el-icon class="collapse-hint__icon">
          <InfoFilled />
        </el-icon>
        <span class="collapse-hint__text">
          Tip: Click
          <el-icon class="collapse-hint__arrow">
            <ArrowRightBold />
          </el-icon>
          /
          <el-icon class="collapse-hint__arrow">
            <ArrowLeftBold />
          </el-icon>
          to toggle Variable/Rule.
        </span>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Plus,
  Delete,
  CircleClose,
  CirclePlus,
  ArrowLeftBold,
  ArrowRightBold,
  InfoFilled,
} from '@element-plus/icons-vue'
import { getInstancePoints, getAllInstances, getInstancesByIds } from '@/api/devicesManagement'

const formRef = ref()
const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})
const collapsedSection = ref<'variable' | 'rule' | null>(null)
watch(
  () => props.cardData,
  (v) => {
    if (!v) return
    cardData.value = v
    cardData.value.config = cardData.value.config || {}
    if (!Array.isArray(cardData.value.config.variables)) cardData.value.config.variables = []
    if (!Array.isArray(cardData.value.config.rule)) cardData.value.config.rule = []
  },
  { immediate: true },
)

const isCompact = ref(false)
const toggleCenterCollapse = () => {
  if (!isCompact.value) return
  collapsedSection.value = collapsedSection.value === 'rule' ? 'variable' : 'rule'
}
// 实例/点位（与 FunctionSwitchForm 一致）
const instanceOptions = ref<Array<{ label: string; value: number | string; d: any }>>([])
const varPointOptions = ref<
  Record<number, Array<{ label: string; value: number | string; unit?: string; raw?: any }>>
>({})
function getVarPointOptions(idx: number | string) {
  const index = Number(idx)
  return varPointOptions.value[index] || []
}
// 缓存每个变量索引对应实例的点位数据，便于切换类型时直接复用
const instancePointsCache = ref<Record<number, any>>({})
function buildPointOptionsFromData(
  data: any,
  pointType: 'property' | 'measurement' | 'action',
): Array<{ label: string; value: number | string; unit?: string; raw?: any }> {
  if (pointType === 'action') {
    const raw = (
      Array.isArray((data as any)?.actions)
        ? (data as any).actions
        : Object.values((data as any)?.actions || {})
    ) as any[]
    return raw
      .filter((a: any) => a && (a.action_id != null || a.id != null) && a.name != null)
      .map((a: any) => ({
        label: String(a.name || ''),
        value:
          typeof a.action_id !== 'undefined'
            ? Number.isFinite(Number(a.action_id))
              ? Number(a.action_id)
              : String(a.action_id)
            : Number.isFinite(Number(a.id))
              ? Number(a.id)
              : String(a.id),
        unit: a.unit || '',
        raw: a,
      }))
  }
  if (pointType === 'property') {
    const props = Object.values((data as any)?.properties || {}) as any[]
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
    (data as any)?.elements || (data as any)?.measurements || {},
  ) as any[]
  return measurements
    .filter((m: any) => m && m.measurement_id && m.name != null)
    .map((m: any) => ({
      label: String(m.name || ''),
      value: Number(m.measurement_id),
      unit: m.unit || '',
      raw: m,
    }))
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
      .filter((opt: any) => !!opt.label && (Number.isFinite(opt.value) || String(opt.value)))
  } catch {
    instanceOptions.value = []
  }
}
async function onVarInstanceChange(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  const v = cardData.value.config.variables[index]
  // 重选实例时清空 point 及相关信息
  v.point_id = undefined
  v.point_name = ''
  v.unit = ''
  // 清空当前第三个下拉并获取该实例的点位
  varPointOptions.value[index] = []
  const instanceId = Number(v.instance_id)
  // 保存实例名称
  if (Number.isFinite(instanceId) && instanceId > 0) {
    const instanceOpt = instanceOptions.value.find((opt) => opt.value === instanceId)
    v.instance_name = instanceOpt?.label || ''
  } else {
    v.instance_id = undefined
    v.instance_name = ''
  }
  if (!Number.isFinite(instanceId) || instanceId <= 0) {
    delete instancePointsCache.value[index]
    return
  }
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    instancePointsCache.value[index] = data
    // 若已存在 pointType（property/measurement/action），立即据此填充第三个下拉
    if (v.pointType) {
      varPointOptions.value[index] = buildPointOptionsFromData(data, v.pointType as any)
    }
  } catch {
    delete instancePointsCache.value[index]
    varPointOptions.value[index] = []
  }
}
async function onVarPointTypeChange(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  const v = cardData.value.config.variables[index]
  v.point_id = undefined
  v.point_name = ''
  v.unit = ''
  varPointOptions.value[index] = []
  const instanceId = Number(v.instance_id)
  if (!v.pointType) return
  // 优先使用缓存
  const cached = instancePointsCache.value[index]
  if (cached) {
    varPointOptions.value[index] = buildPointOptionsFromData(cached, v.pointType as any)
    return
  }
  // 兜底：若无缓存但有实例，则请求一次
  if (!Number.isFinite(instanceId) || instanceId <= 0) return
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    instancePointsCache.value[index] = data
    varPointOptions.value[index] = buildPointOptionsFromData(data, v.pointType as any)
  } catch {
    delete instancePointsCache.value[index]
    varPointOptions.value[index] = []
  }
}
// 点位选择变化时，保存 point_name 和 unit
function onVarPointChange(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  const v = cardData.value.config.variables[index]
  const pointId = v.point_id
  if (pointId == null || pointId === '') {
    v.point_id = undefined
    v.point_name = ''
    v.unit = ''
    return
  }
  // 从选项中找到对应的点位信息
  const options = varPointOptions.value[index] || []
  const pointOpt = options.find((opt) => opt.value === pointId)
  if (pointOpt) {
    v.point_name = pointOpt.label || ''
    v.unit = pointOpt.unit || ''
  } else {
    // 如果找不到，尝试从缓存中查找
    const cached = instancePointsCache.value[index]
    if (cached && v.pointType) {
      const allPoints = buildPointOptionsFromData(cached, v.pointType as any)
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
}

function getCombinedExtraPairCount(v: any) {
  if (!Array.isArray(v.formula) || v.formula.length <= 3) return 0
  return Math.floor((v.formula.length - 3) / 2)
}
function addCombinedRow(v: any) {
  if (!Array.isArray(v.formula)) v.formula = []
  v.formula.push('')
  v.formula.push('')
}
function removeCombinedRow(v: any, pairIdx: number) {
  if (!Array.isArray(v.formula)) return
  v.formula.splice(3 + pairIdx * 2, 2)
}
function onCombinedOperandChange(v: any, index: number, val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  const isVar = variableNameOptions.value.includes(s)
  if (!Array.isArray(v.formula)) v.formula = ['', '', '']
  v.formula[index] = Number.isFinite(n) ? n : isVar ? s : ''
}
function onCombinedExtraOperandChange(v: any, index: number, val: any) {
  onCombinedOperandChange(v, index, val)
}

function onVariableTypeChange(v: any) {
  if (v.type === 'combined') {
    if (!Array.isArray(v.formula) || v.formula.length < 3) v.formula = ['', '', '']
    v.instance_id = undefined
    v.instance_name = ''
    v.pointType = ''
    v.point_id = undefined
    v.point_name = ''
  } else {
    v.formula = []
  }
}
function addVariable() {
  const nextIdx = getNextVariableIndex()
  cardData.value.config.variables.push({
    name: `X${nextIdx}`,
    type: 'single',
    instance_id: undefined,
    instance_name: '',
    pointType: '',
    point_id: undefined,
    point_name: '',
    unit: '', // 单位字段
  })
}
function removeVariable(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  const vars = cardData.value.config.variables
  if (!Array.isArray(vars)) return
  vars.splice(index, 1)
}
function getNextVariableIndex(): number {
  const list = cardData.value?.config?.variables
  const names: string[] = (Array.isArray(list) ? list : []).map((v: any) => v?.name).filter(Boolean)
  let max = 0
  for (const n of names) {
    const m = /^X(\d+)$/.exec(n)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}
// 规则：简化为 Variables = value
const arithmeticOperatorOptions = ref<string[]>(['+', '-', '*', '/'])
const variablesByName = computed<Record<string, any>>(() => {
  const list = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
    : []
  return list.reduce((acc: Record<string, any>, v: any) => {
    const name = v?.name
    if (name) acc[name] = v
    return acc
  }, {})
})
interface VariableOption {
  label: string
  value: string
  tooltip: string
}
const variableOptions = computed<VariableOption[]>(() => buildVariableOptions(false))
const singleVariableOptions = computed<VariableOption[]>(() => buildVariableOptions(true))
const variableNameOptions = computed(() =>
  variableOptions.value.map((opt: VariableOption) => opt.value),
)
function addRuleRow() {
  if (!Array.isArray(cardData.value.config.rule)) cardData.value.config.rule = []
  cardData.value.config.rule.push({ Variables: '', value: '' })
}
function removeRuleRow(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  cardData.value.config.rule.splice(index, 1)
}
function onRuleSimpleValueChange(r: any, val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  r.value = Number.isFinite(n) ? n : s
}

function normalizeVariables() {
  const vars = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
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
      v.unit = v.unit || '' // 保留单位字段
    } else {
      if (v.pointType == null) v.pointType = ''
      if (v.unit == null) v.unit = '' // 确保单位字段存在
      if (!Array.isArray(v.formula)) v.formula = []
      // 确保 instance_id 和 instance_name 存在
      if (v.instance_id != null && Number.isFinite(v.instance_id) && v.instance_id > 0) {
        const instanceOpt = instanceOptions.value.find((opt) => opt.value === v.instance_id)
        if (instanceOpt) {
          v.instance_name = instanceOpt.label
        }
      }
      // 确保 point_name 和 unit 存在
      if (v.point_id != null && (!v.point_name || !v.unit)) {
        onVarPointChange(idx)
      }
    }
  }
  // 规则：将 value 可数值化的转 number
  const rules = cardData.value?.config?.rule
  if (Array.isArray(rules)) {
    for (const r of rules) {
      const n = Number(String(r?.value))
      if (String(r?.value ?? '').trim() !== '' && Number.isFinite(n)) r.value = n
    }
  }
}

function getVariableOptionsExcluding(selfIdx: number | string) {
  const index = Number(selfIdx)
  const list = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
    : []
  const selfName = list[index]?.name
  return variableOptions.value.filter((opt) => opt.value !== selfName)
}

function buildVariableOptions(onlySingle: boolean): VariableOption[] {
  const list = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
    : []
  return list
    .filter((v: any) => v?.name && (!onlySingle || v.type !== 'combined'))
    .map((v: any) => ({
      label: v.name,
      value: v.name,
      tooltip: buildVariableTooltip(v),
    }))
}

function buildVariableTooltip(v: any, visited: Set<string> = new Set()): string {
  if (!v?.name) return ''
  if (visited.has(v.name)) return v.name
  visited.add(v.name)
  if (v.type === 'combined') {
    const formula = Array.isArray(v.formula) ? v.formula : []
    if (!formula.length) return v.name
    return formula
      .map((item: any, idx: number) => {
        if (idx % 2 === 1) return String(item ?? '')
        return formatOperand(item, visited)
      })
      .filter((x: string) => x !== '')
      .join(' ')
  }
  return formatSingleVariable(v)
}

function formatSingleVariable(v: any): string {
  const instance = v.instance_name || v.instance_id || '-'
  const pointType = v.pointType || '-'
  const point = v.point_name || v.point_id || '-'
  return `${instance}/${pointType}/${point}`
}

function formatOperand(raw: any, visited: Set<string>): string {
  if (raw == null || raw === '') return ''
  const text = String(raw)
  const n = Number(text)
  if (text.trim() !== '' && Number.isFinite(n)) return text
  const def = variablesByName.value[text]
  if (def) return buildVariableTooltip(def, visited)
  return text
}

function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as any
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

let collapseMediaQuery: MediaQueryList | null = null
const handleCollapseMediaChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isCompact.value = e.matches
  collapsedSection.value = e.matches ? 'rule' : null
}
onMounted(() => {
  collapseMediaQuery = window.matchMedia('(max-width: 1400px)')
  handleCollapseMediaChange(collapseMediaQuery)
  if (collapseMediaQuery.addEventListener) {
    collapseMediaQuery.addEventListener('change', handleCollapseMediaChange)
  } else {
    collapseMediaQuery.addListener(handleCollapseMediaChange as any)
  }
  fetchInstances().then(async () => {
    normalizeVariables()
    // 回显：批量获取实例信息以减少请求次数
    const vars = Array.isArray(cardData.value?.config?.variables)
      ? cardData.value.config.variables
      : []

    // 收集所有需要批量获取的 instance_id
    const instanceIdsToFetch = new Set<number>()
    const varIndexMap = new Map<number, number[]>() // instanceId -> [varIndexes]

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

    // 批量获取实例信息
    if (instanceIdsToFetch.size > 0) {
      try {
        const idsArray = Array.from(instanceIdsToFetch)
        const res = await getInstancesByIds(idsArray)
        const instancesList = Array.isArray(res?.data?.list) ? res.data.list : []

        // 将返回的数据缓存到 instancePointsCache 中
        for (const instance of instancesList) {
          const instanceId = Number(instance?.instance_id)
          if (!Number.isFinite(instanceId) || instanceId <= 0) continue

          const pointsData = instance?.points || {}
          const varIndexes = varIndexMap.get(instanceId) || []

          for (const idx of varIndexes) {
            const v = vars[idx]
            if (!v || v.type === 'combined' || !v.instance_id || !v.pointType) continue

            // 缓存点位数据
            instancePointsCache.value[idx] = pointsData

            // 构建点位选项
            varPointOptions.value[idx] = buildPointOptionsFromData(pointsData, v.pointType as any)

            // 回显时同步保存 instance_name
            if (!v.instance_name) {
              v.instance_name = instance?.instance_name || ''
            }

            // 回显时同步保存 point_name 和 unit
            if (v.point_id && (!v.point_name || !v.unit)) {
              onVarPointChange(idx)
            }
          }
        }
      } catch {
        // 如果批量请求失败，回退到逐个请求
        for (let idx = 0; idx < vars.length; idx++) {
          const v = vars[idx]
          if (!v || v.type === 'combined' || !v.instance_id || !v.pointType) continue
          const instanceId = v.instance_id
          if (!Number.isFinite(instanceId) || instanceId <= 0) continue
          try {
            const res = await getInstancePoints(instanceId)
            const data = res?.data || {}
            instancePointsCache.value[idx] = data
            varPointOptions.value[idx] = buildPointOptionsFromData(data, v.pointType as any)
          } catch {
            delete instancePointsCache.value[idx]
            varPointOptions.value[idx] = []
          }
        }
      }
    }
  })
})
onUnmounted(() => {
  if (!collapseMediaQuery) return
  if (collapseMediaQuery.removeEventListener) {
    collapseMediaQuery.removeEventListener('change', handleCollapseMediaChange)
  } else {
    collapseMediaQuery.removeListener(handleCollapseMediaChange as any)
  }
})
watch(
  () => cardData.value?.config?.variables,
  () => {
    normalizeVariables()
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
.voltage-class {
  &.action-change-value-form {
    width: 100%;
    height: 100%;

    .main-section {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      height: calc(100% - 120px);
      width: 100%;
    }

    .el-form {
      display: flex;
      flex-direction: column;
    }

    .section {
      margin-bottom: 24px;

      .section__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        .section__title {
          font-weight: $font-weight-semibold;
          font-size: $font-size-base;
          color: $text-color-primary;
        }
        .section__title-text {
          display: inline;
        }
        .section__title-lines {
          display: none;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        .section__title-line {
          display: block;
        }

        .section__add-btn {
          width: 32px !important;
        }
      }

      .section__body {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &.variable,
        &.rule {
          height: calc(100% - 44px);
          overflow-y: auto;
          scrollbar-gutter: stable;
        }
      }
    }
    .section__body--basic {
      display: flex;
      gap: 12px;
      flex-direction: row !important;
    }
    .basic-item {
      margin-bottom: 0;
      flex: 1 1 0;
    }
    .basic-item--label {
      flex: 1 1 0;
    }
    .basic-item--description {
      flex: 2 1 0;
    }

    .variable-section .section__header,
    .rule-section .section__header {
      padding-right: $width-scrollbar;
    }

    .variable-section {
      padding-right: 10px;
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    .rule-section {
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
    }

    .collapse-center {
      display: none;
      align-items: center;
      justify-content: center;
      width: 44px;
    }

    .collapse-center--left {
      left: 0;
    }

    .collapse-center--right {
      right: 0;
    }

    .collapse-center__btn {
      width: 26px !important;
      color: $primary-color !important;

      .el-icon {
        color: $primary-color !important;
      }
    }

    .variable-row__controls,
    .combined-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .variable-row__combined {
      width: 100%;
      margin-top: 8px;
    }

    .variable-row__combined-add {
      display: flex;
      justify-content: flex-start;
      // padding-left: 6px;
    }

    .variable-row__item :deep(.el-form-item__content) {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
    }

    .variable-row__controls :deep(.el-select),
    .combined-row :deep(.el-select),
    .combined-row :deep(.el-input) {
      flex: 1 1 0;
    }

    .variable-row__select {
      width: auto;
    }

    :deep(.el-select .el-select__selected-item) {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .variable-row__delete {
      padding: 0 4px;
      flex: 0 0 auto;
    }

    .combined-row__add-icon {
      color: $success-color !important;
    }

    .combined-row__delete-icon {
      color: $danger-color !important;
    }

    .rule-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      &:last-child {
        padding-bottom: 0;
        border-bottom: none;
      }
    }

    @media (max-width: 1400px) {
      .main-section {
        gap: 0;
      }

      .collapse-center {
        display: inline-flex;
        flex: 0 0 60px;
      }

      .main-section.collapse-rule .rule-section,
      .main-section.collapse-variable .variable-section {
        display: block;
        flex: 0 0 60px;
        padding: 0;
        opacity: 0.7;
      }

      .main-section.collapse-rule .rule-section {
        border-right: none;
      }

      .main-section.collapse-variable .variable-section {
        border-right: none;
      }

      .main-section.collapse-rule .variable-section,
      .main-section.collapse-variable .rule-section {
        flex: 1 1 auto;
        min-width: 0;
        padding-right: 0;
        opacity: 1;
      }

      .main-section.collapse-rule .rule-section .section__header,
      .main-section.collapse-variable .variable-section .section__header {
        justify-content: flex-start;
      }

      .main-section.collapse-rule .rule-section .section__title,
      .main-section.collapse-variable .variable-section .section__title {
        font-size: 12px;
        letter-spacing: 2px;
      }
      .main-section.collapse-rule .rule-section .section__title-text,
      .main-section.collapse-variable .variable-section .section__title-text {
        display: none;
      }
      .main-section.collapse-rule .rule-section .section__title-lines,
      .main-section.collapse-variable .variable-section .section__title-lines {
        display: flex;
      }

      .main-section.collapse-rule .rule-section .section__body,
      .main-section.collapse-variable .variable-section .section__body,
      .main-section.collapse-rule .rule-section .section__add-btn,
      .main-section.collapse-variable .variable-section .section__add-btn {
        display: none;
      }
    }

    .rule-row__head,
    .variable-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .rule-row__name,
    .variable-row__item {
      margin-bottom: 0;
      align-items: flex-start;
      flex: 1 1 0;
    }

    .rule-row__type {
      width: 240px;

      .rule-row__delete {
        padding: 0 4px;
      }
    }

    .rule-row__body {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .rule-row__select {
      min-width: 0;
    }

    .rule-row__default,
    .variable-row__combined {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .default-cond-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .default-cond-row__relation {
      width: 100px !important;
    }

    .rule-row-simple {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      .rule-row__select {
        flex: 1 1 0;
      }

      // .rule-row__eq {
      //   color: #fff;
      //   opacity: 0.9;
      // }
    }

    .collapse-hint {
      margin-top: 8px;
      height: 24px;
      font-size: 12px;
      display: none;
      align-items: center;
      // justify-content: center;
      gap: 6px;
      padding-left: 10px;
      color: $text-color-white-60;

    }

    .collapse-hint__icon,
    .collapse-hint__arrow {
      color: $primary-color;
    }

    .collapse-hint__icon {
      color: $warning-color;
    }

    .collapse-hint__text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .option-tooltip-row {
      display: block;
      width: 100%;
    }

    :deep(.option-tooltip-popper) {
      max-width: 360px;
      white-space: normal;
      word-break: break-word;
    }

    @media (max-width: 1400px) {
      .collapse-hint {
        display: flex;
      }
    }
  }
}
</style>