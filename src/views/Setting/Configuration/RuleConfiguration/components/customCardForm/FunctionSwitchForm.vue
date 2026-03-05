<template>
  <div class="voltage-class function-switch-form">
    <el-form ref="formRef" label-width="90px" :model="cardData">
      <!-- 第一部分：基础设置 -->
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
        <!-- 第二部分：变量设置 -->
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
                  <el-select v-model="v.instance_id" :fit-input-width="true" placeholder="instance" class="flex-item variable-row__select"
                    filterable @change="() => onVarInstanceChange(idx)">
                    <el-option v-for="opt in instanceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                  <el-select v-model="v.pointType" :fit-input-width="true" placeholder="point type" class="flex-item variable-row__select"
                    :disabled="!v.instance_id" @change="() => onVarPointTypeChange(idx)">
                    <el-option label="measurement" value="measurement" />
                    <el-option label="property" value="property" />
                  </el-select>
                  <el-select v-model="v.point_id" :fit-input-width="true" placeholder="point" class="flex-item variable-row__select" filterable
                    :disabled="!v.instance_id || !v.pointType" @change="() => onVarPointChange(idx)">
                    <el-option v-for="opt in getVarPointOptions(idx)" :key="opt.value" :label="opt.label"
                      :value="opt.value" />
                  </el-select>
                </div>

                <!-- combined 模式：公式编辑器 -->
                <div v-else class="variable-row__combined">
                  <div class="combined-row">
                    <el-select v-model="v.formula[0]" :fit-input-width="true" class="variable-row__select" placeholder="variable or number"
                      filterable allow-create default-first-option reserve-keyword
                      @change="(val: any) => onCombinedOperandChange(v, 0, val)">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <div class="option-remind-row" :title="opt.tooltip || opt.label">
                          {{ opt.label }}
                        </div>
                      </el-option>
                    </el-select>
                    <el-select v-model="v.formula[1]" :fit-input-width="true" class="variable-row__select" placeholder="op">
                      <el-option v-for="op in arithmeticOperatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select v-model="v.formula[2]" :fit-input-width="true" class="variable-row__select" placeholder="variable or number"
                      filterable allow-create default-first-option reserve-keyword
                      @change="(val: any) => onCombinedOperandChange(v, 2, val)">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <div class="option-remind-row" :title="opt.tooltip || opt.label">
                          {{ opt.label }}
                        </div>
                      </el-option>
                    </el-select>
                  </div>

                  <!-- 追加的 (op, operand) 对 -->
                  <div v-for="pairIdx in getCombinedExtraPairCount(v)" :key="`pair-${idx}-${pairIdx}`"
                    class="combined-row">
                    <el-select v-model="v.formula[3 + (pairIdx - 1) * 2]" :fit-input-width="true" class="variable-row__select" placeholder="op">
                      <el-option v-for="op in arithmeticOperatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select v-model="v.formula[3 + (pairIdx - 1) * 2 + 1]" :fit-input-width="true" class="variable-row__select"
                      placeholder="variable or number" filterable allow-create default-first-option reserve-keyword
                      @change="
                        (val: any) =>
                          onCombinedExtraOperandChange(v, 3 + (pairIdx - 1) * 2 + 1, val)
                      ">
                      <el-option v-for="opt in getVariableOptionsExcluding(idx)" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <div class="option-remind-row" :title="opt.tooltip || opt.label">
                          {{ opt.label }}
                        </div>
                      </el-option>
                    </el-select>
                    <el-button class="combined-row__delete" link
                      @click="removeCombinedRow(v, pairIdx - 1)">
                      <el-icon style="color: red">
                        <CircleClose />
                      </el-icon>
                    </el-button>
                  </div>

                  <div class="variable-row__combined-add">
                    <el-button type="primary" link @click="addCombinedRow(v)">
                      <el-icon style="color: green">
                        <CirclePlus />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-button class="variable-row__delete" @click="removeVariable(idx)">
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

        <!-- 第三部分：规则配置 -->
        <div class="section rule-section" :class="{ 'is-collapsed': collapsedSection === 'rule' }">
          <div class="section__header">
            <span class="section__title">
              <span class="section__title-text">Rule Settings</span>
              <span class="section__title-lines" aria-hidden="true">
                <span class="section__title-line">Rule</span>
                <span class="section__title-line">Settings</span>
              </span>
            </span>
            <el-button class="section__add-btn" type="primary" @click="addRule">
              <el-icon>
                <Plus />
              </el-icon>
            </el-button>
          </div>
          <div class="section__body rule">
            <div v-for="(r, rIdx) in cardData.config.rule" :key="`rule-${rIdx}-${r.name}`" class="rule-row">
              <!-- 顶层规则项头部：名称 + 类型选择 + 删除 -->
              <div class="rule-row__head">
                <el-form-item :label="r.name + ':'" class="rule-row__name">
                  <!-- <el-radio-group
                  v-model="r.type"
                  class="rule-row__type"
                  @change="onRuleTypeChange(r)"
                >
                  <el-radio v-for="t in ruleTypeOptions" :key="t" :label="t">{{ t }}</el-radio>
                </el-radio-group> -->
                  <!-- alone 类型：三个选择框 -->
                  <div v-if="r.type === 'alone'" class="rule-row__body">
                    <span class="rule-row__relation-spacer" aria-hidden="true"></span>
                    <el-select v-model="r.rule.variables" :fit-input-width="true" class="rule-row__select rule-row__select--var"
                      placeholder="variable" filterable>
                      <el-option v-for="opt in singleVariableOptions" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <div class="option-remind-row" :title="opt.tooltip || opt.label">
                          {{ opt.label }}
                        </div>
                      </el-option>
                    </el-select>
                    <el-select v-model="r.rule.operator" :fit-input-width="true" class="rule-row__select rule-row__select--op"
                      placeholder="operator">
                      <el-option v-for="op in operatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select v-model="r.rule.value" :fit-input-width="true" class="rule-row__select rule-row__select--val" placeholder="value"
                      filterable allow-create default-first-option reserve-keyword
                      @change="(val: any) => onRuleValueChange(r, val)">
                      <el-option v-for="opt in variableOptions" :key="opt.value" :label="opt.label"
                        :value="opt.value as any">
                        <div class="option-remind-row" :title="opt.tooltip || opt.label">
                          {{ opt.label }}
                        </div>
                      </el-option>
                    </el-select>
                    <span class="rule-row__delete-spacer" aria-hidden="true"></span>
                  </div>

                  <!-- default 类型：多行，每行三选择框；第二行开始前置 relation 选择器，可删除 -->
                  <div v-else-if="r.type === 'default'" class="rule-row__default">
                    <div v-for="(sub, i) in r.rule" :key="`sub-${i}`">
                      <template v-if="sub.type === 'variable'">
                        <div class="default-cond-row">
                          <!-- 从第二个条件开始在行首显示 relation 选择器（绑定前一项） -->
                          <el-select v-if="
                            Number(i) > 0 &&
                            r.rule[Number(i) - 1] &&
                            r.rule[Number(i) - 1].type === 'relation'
                          " v-model="r.rule[Number(i) - 1].value" :fit-input-width="true"
                            class="default-cond-row__relation rule-row__select--relation" placeholder="relation">
                            <el-option v-for="rel in relationOptions" :key="rel" :label="rel" :value="rel" />
                          </el-select>
                          <span v-else class="default-cond-row__relation-spacer rule-row__select--relation"
                            aria-hidden="true"></span>

                          <el-select v-model="sub.variables" :fit-input-width="true" class="rule-row__select rule-row__select--var"
                            placeholder="variable" filterable>
                            <el-option v-for="opt in singleVariableOptions" :key="opt.value" :label="opt.label"
                              :value="opt.value as any">
                              <div class="option-remind-row" :title="opt.tooltip || opt.label">
                                {{ opt.label }}
                              </div>
                            </el-option>
                          </el-select>
                          <el-select v-model="sub.operator" :fit-input-width="true" class="rule-row__select rule-row__select--op"
                            placeholder="operator">
                            <el-option v-for="op in operatorOptions" :key="op" :label="op" :value="op" />
                          </el-select>
                          <el-select v-model="sub.value" :fit-input-width="true" class="rule-row__select rule-row__select--val"
                            placeholder="value" filterable allow-create default-first-option reserve-keyword
                            @change="(val: any) => onRuleSubValueChange(sub, val)">
                            <el-option v-for="opt in variableOptions" :key="opt.value" :label="opt.label"
                              :value="opt.value as any">
                              <div class="option-remind-row" :title="opt.tooltip || opt.label">
                                {{ opt.label }}
                              </div>
                            </el-option>
                          </el-select>

                          <!-- 从第二个条件开始提供删除按钮（需同时移除其前置 relation） -->
                          <el-button v-if="Number(i) > 0" class="default-cond-row__delete" link
                            @click="removedefaultCondition(r, i)">
                            <el-icon style="color: red">
                              <CircleClose />
                            </el-icon>
                          </el-button>
                          <span v-else class="default-cond-row__delete-spacer" aria-hidden="true"></span>
                        </div>
                      </template>
                    </div>
                    <div class="rule-row__default-add">
                      <el-button type="primary" link @click="adddefaultCondition(r)">
                        <el-icon style="color: green">
                          <CirclePlus />
                        </el-icon>
                      </el-button>
                    </div>
                  </div>

                  <!-- custom 类型：自定义输入框 -->
                  <div v-else class="rule-row__body">
                    <el-input v-model="r.rule" type="textarea" :rows="2" placeholder="custom rule expression" />
                  </div>
                </el-form-item>
                <el-button class="rule-row__delete" @click="removeRule(rIdx)">
                  <el-icon>
                    <Delete />
                  </el-icon>
                </el-button>
              </div>
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

// props: 从父级接收并直接绑定（引用相同对象，便于双向同步）
const props = defineProps<{ cardData: any }>()
const cardData = ref<any>({})
watch(
  () => props.cardData,
  (v) => {
    if (!v) return
    // 引用同一对象，内部修改将同步到父级
    cardData.value = v
  },
  { immediate: true },
)

const collapsedSection = ref<'variable' | 'rule' | null>(null)
const isCompact = ref(false)
const toggleCenterCollapse = () => {
  if (!isCompact.value) return
  collapsedSection.value = collapsedSection.value === 'rule' ? 'variable' : 'rule'
}
let collapseMediaQuery: MediaQueryList | null = null
const handleCollapseMediaChange = (e: MediaQueryList | MediaQueryListEvent) => {
  isCompact.value = e.matches
  collapsedSection.value = e.matches ? 'rule' : null
}

// 选项（协议固定，实例/点位从接口获取）
const instanceOptions = ref<Array<{ label: string; value: number | string; d: any }>>([])
const varPointOptions = ref<
  Record<number, Array<{ label: string; value: number; unit?: string; raw?: any }>>
>({})
// 缓存每个变量索引对应实例的点位数据，避免切换类型时重复请求
const instancePointsCache = ref<Record<number, any>>({})
function getVarPointOptions(idx: number | string) {
  const index = Number(idx)
  return varPointOptions.value[index] || []
}
function buildPointOptionsFromData(
  data: any,
  pointType: 'property' | 'measurement',
): Array<{ label: string; value: number; unit?: string; raw?: any }> {
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
}
async function preloadVarOptions() {
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
          varPointOptions.value[idx] = buildPointOptionsFromData(
            pointsData,
            v.pointType === 'property' ? 'property' : 'measurement',
          )

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
        try {
          if (!Number.isFinite(instanceId) || instanceId <= 0) continue
          const res = await getInstancePoints(instanceId)
          const data = res?.data || {}
          instancePointsCache.value[idx] = data
          varPointOptions.value[idx] = buildPointOptionsFromData(
            data,
            v.pointType === 'property' ? 'property' : 'measurement',
          )
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
  const v = cardData.value.config.variables[index]
  // 用户切换实例：清空已选点位及相关信息
  v.point_id = undefined
  v.point_name = ''
  v.unit = ''
  // 清空第三下拉
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
  if (!Number.isFinite(instanceId) || instanceId <= 0) return
  // 不预选 pointType，等待用户选择 pointType 后再加载具体列表
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    instancePointsCache.value[index] = data
    if (v.pointType === 'property' || v.pointType === 'measurement') {
      varPointOptions.value[index] = buildPointOptionsFromData(
        data,
        v.pointType === 'property' ? 'property' : 'measurement',
      )
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
  // 切换类型：不发请求，优先使用缓存
  v.point_id = undefined
  v.point_name = ''
  v.unit = ''
  varPointOptions.value[index] = []
  const instanceId = Number(v.instance_id)
  if (!v.pointType) return
  // 优先使用缓存
  const cached = instancePointsCache.value[index]
  if (cached) {
    varPointOptions.value[index] = buildPointOptionsFromData(
      cached,
      v.pointType === 'property' ? 'property' : 'measurement',
    )
    return
  }
  // 兜底：若无缓存但已选实例，补一次请求
  if (!Number.isFinite(instanceId) || instanceId <= 0) return
  try {
    const res = await getInstancePoints(instanceId)
    const data = res?.data || {}
    instancePointsCache.value[index] = data
    varPointOptions.value[index] = buildPointOptionsFromData(
      data,
      v.pointType === 'property' ? 'property' : 'measurement',
    )
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
      const allPoints = buildPointOptionsFromData(
        cached,
        v.pointType === 'property' ? 'property' : 'measurement',
      )
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
const operatorOptions = ref<string[]>(['==', '!=', '>', '>=', '<', '<='])
const relationOptions = ref<string[]>(['And'])
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

// 取消监听，改为在 validateForm 中统一同步 wires

// 变量设置：新增 / 删除
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
  // 清理所有规则中对已删除变量名的引用
  clearInvalidVariableReferences()
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

// 移除无效的变量引用：当规则里引用了已不存在的变量名时，将其置空
function clearInvalidVariableReferences() {
  const list = cardData.value?.config?.variables
  const validNames = new Set(
    (Array.isArray(list) ? list : []).map((v: any) => v?.name).filter(Boolean),
  )
  const rules = cardData.value?.config?.rule
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

function onCombinedOperandChange(v: any, index: number, val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  // 仅当为数值时才保留数值；否则需要为已有变量名，若既非变量名又非数值则置空
  const isVar = variableNameOptions.value.includes(s)
  v.formula[index] = Number.isFinite(n) ? n : isVar ? s : ''
}
function onCombinedExtraOperandChange(v: any, index: number, val: any) {
  onCombinedOperandChange(v, index, val)
}
function onRuleValueChange(r: any, val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  r.rule.value = Number.isFinite(n) ? n : s
}
function onRuleSubValueChange(sub: any, val: any) {
  const s = String(val ?? '').trim()
  const n = Number(s)
  sub.value = Number.isFinite(n) ? n : s
}

// 规则配置：新增 / 删除顶层规则项
function addRule() {
  const nextName = getNextOutName()
  cardData.value.config.rule.push({
    name: nextName,
    type: 'default',
    rule: [
      {
        type: 'variable',
        variables: variableNameOptions.value[0] || '',
        operator: operatorOptions.value[0],
        value: variableNameOptions.value[0] || '',
      },
    ],
  })
}
function removeRule(idx: number | string) {
  const index = Number(idx)
  if (!Number.isFinite(index)) return
  cardData.value.config.rule.splice(index, 1)
}
function getNextOutName(): string {
  const names: string[] = (cardData.value?.config?.rule || []).map((r: any) => r.name)
  let max = 0
  for (const n of names) {
    const m = /^out(\d+)$/.exec(n)
    if (m) max = Math.max(max, Number(m[1]))
  }
  const next = String(max + 1).padStart(3, '0')
  return `out${next}`
}


// default：添加 / 删除条件
function adddefaultCondition(r: any) {
  if (!Array.isArray(r.rule)) r.rule = []
  r.rule.push({ type: 'relation', value: 'And' })
  r.rule.push({
    type: 'variable',
    variables: variableNameOptions.value[0] || '',
    value: variableNameOptions.value[0] || '',
    operator: operatorOptions.value[0],
  })
}
function removedefaultCondition(r: any, variableRuleIndex: number | string) {
  const index = Number(variableRuleIndex)
  if (!Number.isFinite(index)) return
  if (!Array.isArray(r.rule)) return
  // 先移除前置 relation（如果存在）
  if (
    index - 1 >= 0 &&
    r.rule[index - 1] &&
    r.rule[index - 1].type === 'relation'
  ) {
    r.rule.splice(index - 1, 1)
    r.rule.splice(index - 1, 1) // 删除后，原变量项索引前移一位
  } else {
    r.rule.splice(index, 1)
  }
}
function afterValidSync() {
  const names: string[] = cardData.value.config.rule.map((r: any) => r?.name).filter(Boolean)
  Object.keys(cardData.value.config.wires).forEach((k) => {
    if (k !== 'default' && !names.includes(k)) delete cardData.value?.config?.wires[k]
  })
  for (const n of names) {
    if (!Array.isArray(cardData.value?.config.wires[n])) cardData.value.config.wires[n] = []
  }

  // 变量规范化：
  const vars = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
    : []
  for (let idx = 0; idx < vars.length; idx++) {
    const v = vars[idx]
    if (!v) continue
    if (v.type === 'combined') {
      // 仅保留 type/name/formula（保留已填值，如缺失则补齐前三项）
      v.formula = Array.isArray(v.formula) && v.formula.length >= 3 ? v.formula : ['', '', '']
      delete v.instance
      delete v.instance_id
      delete v.instance_name
      delete v.pointType
      delete v.point
      delete v.point_id
      delete v.point_name
    } else {
      // single：保留 type/name/instance_id/instance_name/pointType/point_id/point_name/unit
      v.type = 'single'
      if (v.pointType == null) v.pointType = ''
      if (v.unit == null) v.unit = ''
      // 确保 instance_name 存在
      if (v.instance_id && !v.instance_name) {
        const instanceOpt = instanceOptions.value.find((opt) => opt.value === v.instance_id)
        if (instanceOpt) {
          v.instance_name = instanceOpt.label
        }
      }
      // 确保 point_name 和 unit 存在
      if (v.point_id && (!v.point_name || !v.unit)) {
        onVarPointChange(idx)
      }
      delete v.formula
    }
    // 导出前数值归一化：formula 中可转为数值的字符串统一转 number
    if (Array.isArray(v.formula)) {
      v.formula = v.formula.map((x: any) => {
        const nx = Number(String(x))
        return String(x).trim() !== '' && Number.isFinite(nx) ? nx : x
      })
    }
  }

  // 规则值归一化：value 尝试数值化，variables 不动
  const rules = cardData.value?.config?.rule
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
// variable: 类型切换
function onVariableTypeChange(v: any) {
  if (v.type === 'combined') {
    // 初始化 formula 结构
    if (!Array.isArray(v.formula)) v.formula = ['', '', '']
    // 清空 single 相关字段，仅保留 type/name/formula
    v.instance_id = undefined
    v.instance_name = ''
    v.pointType = 'measurement'
    v.point_id = undefined
    v.point_name = ''
  } else {
    // single 模式仅保留 type/name/instance_id/pointType/point_id
    v.formula = []
  }
}

// variable: 追加一行 (op, operand)
function addCombinedRow(v: any) {
  if (!Array.isArray(v.formula)) v.formula = ['', '', '']
  v.formula.push('')
  v.formula.push('')
}

// variable: 删除指定的 (op, operand) 行（不动首行的三元素）
function removeCombinedRow(v: any, pairIndex: number) {
  if (!Array.isArray(v.formula)) return
  const start = 3 + pairIndex * 2
  if (start <= v.formula.length - 2) {
    v.formula.splice(start, 2)
  }
}

// variable: 额外的 (op, operand) 对数量
function getCombinedExtraPairCount(v: any) {
  if (!Array.isArray(v.formula) || v.formula.length <= 3) return 0
  return Math.floor((v.formula.length - 3) / 2)
}

// 变量名选项（排除自己）
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
// 使用 el-form 内置校验
function validateForm(): Promise<{ valid: boolean; data: any }> {
  return new Promise((resolve) => {
    const form = formRef.value as any
    if (form && typeof form.validate === 'function') {
      form.validate((valid: boolean) => {
        if (valid) afterValidSync()
        console.log(cardData.value)

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
  collapseMediaQuery = window.matchMedia('(max-width: 1400px)')
  handleCollapseMediaChange(collapseMediaQuery)
  if (collapseMediaQuery.addEventListener) {
    collapseMediaQuery.addEventListener('change', handleCollapseMediaChange)
  } else {
    collapseMediaQuery.addListener(handleCollapseMediaChange as any)
  }
  fetchInstances().then(() => {
    normalizeVariables()
    preloadVarOptions()
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
.voltage-class,
.function-switch-form {

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

    &.variable-section {
      padding-right: 10px;
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }

    &.rule-section {
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
    }

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
    gap: 8px;
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
  }

  .variable-row__combined-add {
    display: flex;
    justify-content: flex-start;
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
    width: 32px !important;
  }

  .rule-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    // padding-bottom: 20px;
    // border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }
  }

  @media (max-width: 1400px) {
    .main-section {
      gap: 0;
    }

    .collapse-hint {
      display: flex;
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
    }

    .main-section.collapse-rule .rule-section {
      border-left: 2px solid rgba(255, 255, 255, 0.9);
    }

    .main-section.collapse-variable .variable-section {
      border-right: none;
    }

    .main-section.collapse-rule .variable-section,
    .main-section.collapse-variable .rule-section {
      flex: 1 1 auto;
      min-width: 0;
      padding-right: 0;
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

    :deep(.el-form-item) {
      width: calc(100% - 40px);
    }
  }

  .rule-row__name,
  .variable-row__item {
    margin-bottom: 0;
    align-items: flex-start;
    flex: 1 1 0;
  }

  .rule-row__name :deep(.el-form-item__content) {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  }

  .rule-row__type {
    width: 240px;
  }

  .rule-row__delete {
    padding: 0 4px;
    width: 32px;
  }

  .rule-row__body {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-start;
    flex: 1 1 0;
    min-width: 0;
    width: 100%;

  }

  .rule-row__select {
    min-width: 0;
  }

  .rule-row__select--relation {
    flex: 1 1 0;
    min-width: 0;
  }

  .rule-row__select--var {
    flex: 1 1 0;
    min-width: 0;
  }

  .rule-row__select--op {
    flex: 1 1 0;
    min-width: 0;
  }

  .rule-row__select--val {
    flex: 1 1 0;
    min-width: 0;
  }

  .rule-row__relation-spacer {
    flex: 1 1 0;
    min-width: 0;
  }

  .rule-row__delete-spacer {
    // flex: 0 0 32px;
    height: 32px;
    width: 32px;
  }

  :deep(.el-input),
  :deep(.el-select) {
    max-width: 100%;
  }

  .rule-row__default,
  .variable-row__combined {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .default-cond-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .default-cond-row__relation {
    flex: 1 1 0;
    min-width: 0;
  }

  .default-cond-row__relation-spacer {
    flex: 1 1 0;
    min-width: 0;
  }

  .default-cond-row__delete {
    padding: 4px !important;
  }

  .default-cond-row__delete-spacer {
    flex: 0 0 32px;
    height: 32px;
  }

  .rule-row__default-add {
    min-height: 20px;
  }

  .collapse-hint {
    margin-top: 8px;
    height: 24px;
    font-size: 12px;
    display: none;
    align-items: center;
    gap: 6px;
    padding-left: 10px;
    color: $text-color-white-60;
  }

  @media (max-width: 1400px) {
    .collapse-hint {
      display: flex;
    }
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

  .option-remind-row {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

}

// // 统一输入组件宽度
// .voltage-class .function-switch-form :deep(.el-input),
// .voltage-class .function-switch-form :deep(.el-select) {
//   width: 120px;
// }</style>