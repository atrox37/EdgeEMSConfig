<template>
  <div class="voltage-class function-switch-form">
    <el-form ref="formRef" label-width="60px" :model="cardData">
      <!-- 第一部分：基础设置 -->
      <div class="section basic-section">
        <div class="section__header">
          <span class="section__title">Basic Settings</span>
        </div>
        <div class="section__body" style="flex-direction: row">
          <el-form-item label="label:" prop="label" style="margin-bottom: 0">
            <el-input v-model="cardData.label" />
          </el-form-item>
          <el-form-item
            label="description:"
            prop="description"
            style="margin-bottom: 0; width: 100% !important"
            label-width="120px"
          >
            <el-input v-model="cardData.description" style="width: 100% !important" />
          </el-form-item>
        </div>
      </div>
      <div class="main-section">
        <!-- 第二部分：变量设置 -->
        <div class="section variable-section">
          <div class="section__header">
            <span class="section__title">Variable Settings</span>
            <el-button class="section__add-btn" type="primary" link @click="addVariable">
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
          <div class="section__body variable">
            <div
              v-for="(v, idx) in cardData.config.variables"
              :key="`var-${idx}-${v.name}`"
              class="variable-row"
            >
              <el-form-item :label="v.name + ':'" class="variable-row__item">
                <div class="variable-row__mode">
                  <el-radio-group v-model="v.type" @change="onVariableTypeChange(v, idx)">
                    <el-radio label="single">single</el-radio>
                    <el-radio label="combined">combined</el-radio>
                  </el-radio-group>
                </div>

                <!-- single 模式：沿用原三选框 -->
                <div v-if="v.type !== 'combined'" class="variable-row__controls">
                  <el-select
                    v-model="v.protocol"
                    placeholder="protocol"
                    class="variable-row__select"
                    filterable
                  >
                    <el-option
                      v-for="opt in protocolOptions"
                      :key="opt"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>
                  <el-select
                    v-model="v.instance"
                    placeholder="instance"
                    class="variable-row__select"
                    filterable
                  >
                    <el-option
                      v-for="opt in instanceOptions"
                      :key="opt"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>
                  <el-select
                    v-model="v.point"
                    placeholder="point"
                    class="variable-row__select"
                    filterable
                  >
                    <el-option v-for="opt in pointOptions" :key="opt" :label="opt" :value="opt" />
                  </el-select>
                </div>

                <!-- combined 模式：公式编辑器 -->
                <div v-else class="variable-row__combined">
                  <div class="combined-row">
                    <el-select
                      v-model="v.formula[0]"
                      class="variable-row__select"
                      placeholder="variable or number"
                      filterable
                      allow-create
                      default-first-option
                      reserve-keyword
                    >
                      <el-option
                        v-for="name in getVariableNameOptionsExcluding(idx)"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                    <el-select v-model="v.formula[1]" class="variable-row__select" placeholder="op">
                      <el-option
                        v-for="op in arithmeticOperatorOptions"
                        :key="op"
                        :label="op"
                        :value="op"
                      />
                    </el-select>
                    <el-select
                      v-model="v.formula[2]"
                      class="variable-row__select"
                      placeholder="variable or number"
                      filterable
                      allow-create
                      default-first-option
                      reserve-keyword
                    >
                      <el-option
                        v-for="name in getVariableNameOptionsExcluding(idx)"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                  </div>

                  <!-- 追加的 (op, operand) 对 -->
                  <div
                    v-for="pairIdx in getCombinedExtraPairCount(v)"
                    :key="`pair-${idx}-${pairIdx}`"
                    class="combined-row"
                  >
                    <el-select
                      v-model="v.formula[3 + (pairIdx - 1) * 2]"
                      class="variable-row__select"
                      placeholder="op"
                    >
                      <el-option
                        v-for="op in arithmeticOperatorOptions"
                        :key="op"
                        :label="op"
                        :value="op"
                      />
                    </el-select>
                    <el-select
                      v-model="v.formula[3 + (pairIdx - 1) * 2 + 1]"
                      class="variable-row__select"
                      placeholder="variable or number"
                      filterable
                      allow-create
                      default-first-option
                      reserve-keyword
                    >
                      <el-option
                        v-for="name in getVariableNameOptionsExcluding(idx)"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                    <el-button
                      class="combined-row__delete"
                      type="warning"
                      link
                      @click="removeCombinedRow(v, pairIdx - 1)"
                    >
                      <el-icon style="color: red"><CircleClose /></el-icon>
                    </el-button>
                  </div>

                  <div class="variable-row__combined-add">
                    <el-button type="primary" link @click="addCombinedRow(v)">
                      <el-icon style="color: green"><CirclePlus /></el-icon>
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              <el-button
                class="variable-row__delete"
                style="width: 32px !important"
                type="warning"
                @click="removeVariable(idx)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 第三部分：规则配置 -->
        <div class="section rule-section">
          <div class="section__header">
            <span class="section__title">Rule Settings</span>
            <el-button class="section__add-btn" type="primary" link @click="addRule">
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
          <div class="section__body rule">
            <div
              v-for="(r, rIdx) in cardData.config.rule"
              :key="`rule-${rIdx}-${r.name}`"
              class="rule-row"
            >
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
                    <el-select
                      v-model="r.rule.variables"
                      class="rule-row__select"
                      placeholder="variable"
                      filterable
                    >
                      <el-option v-for="v in variableNameOptions" :key="v" :label="v" :value="v" />
                    </el-select>
                    <el-select
                      v-model="r.rule.operator"
                      class="rule-row__select"
                      placeholder="operator"
                    >
                      <el-option v-for="op in operatorOptions" :key="op" :label="op" :value="op" />
                    </el-select>
                    <el-select
                      v-model="r.rule.value"
                      class="rule-row__select"
                      placeholder="value"
                      filterable
                      allow-create
                      default-first-option
                      reserve-keyword
                    >
                      <el-option v-for="v in variableNameOptions" :key="v" :label="v" :value="v" />
                    </el-select>
                  </div>

                  <!-- default 类型：多行，每行三选择框；第二行开始前置 relation 选择器，可删除 -->
                  <div v-else-if="r.type === 'default'" class="rule-row__default">
                    <div v-for="(sub, i) in r.rule" :key="`sub-${i}`">
                      <template v-if="sub.type === 'variable'">
                        <div class="default-cond-row">
                          <!-- 从第二个条件开始在行首显示 relation 选择器（绑定前一项） -->
                          <el-select
                            v-if="i > 0 && r.rule[i - 1] && r.rule[i - 1].type === 'relation'"
                            v-model="r.rule[i - 1].value"
                            class="default-cond-row__relation"
                            placeholder="relation"
                          >
                            <el-option
                              v-for="rel in relationOptions"
                              :key="rel"
                              :label="rel"
                              :value="rel"
                            />
                          </el-select>

                          <el-select
                            :style="i == 0 ? 'margin-left: 108px;' : ''"
                            v-model="sub.variables"
                            class="rule-row__select"
                            placeholder="variable"
                            filterable
                          >
                            <el-option
                              v-for="vn in variableNameOptions"
                              :key="vn"
                              :label="vn"
                              :value="vn"
                            />
                          </el-select>
                          <el-select
                            v-model="sub.operator"
                            class="rule-row__select"
                            placeholder="operator"
                          >
                            <el-option
                              v-for="op in operatorOptions"
                              :key="op"
                              :label="op"
                              :value="op"
                            />
                          </el-select>
                          <el-select
                            v-model="sub.value"
                            class="rule-row__select"
                            placeholder="value"
                            filterable
                            allow-create
                            default-first-option
                            reserve-keyword
                          >
                            <el-option
                              v-for="v in variableNameOptions"
                              :key="v"
                              :label="v"
                              :value="v"
                            />
                          </el-select>

                          <!-- 从第二个条件开始提供删除按钮（需同时移除其前置 relation） -->
                          <el-button
                            v-if="i > 0"
                            class="default-cond-row__delete"
                            type="warning"
                            link
                            @click="removedefaultCondition(r, i)"
                          >
                            <el-icon style="color: red"><CircleClose /></el-icon>
                          </el-button>
                        </div>
                      </template>
                    </div>
                    <div class="rule-row__default-add">
                      <el-button type="primary" link @click="adddefaultCondition(r)">
                        <el-icon style="color: green"><CirclePlus /></el-icon>
                      </el-button>
                    </div>
                  </div>

                  <!-- custom 类型：自定义输入框 -->
                  <div v-else class="rule-row__body">
                    <el-input
                      v-model="r.rule"
                      type="textarea"
                      :rows="2"
                      placeholder="自定义规则表达式"
                    />
                  </div>
                </el-form-item>
                <el-button
                  class="rule-row__delete"
                  style="width: 32px !important"
                  type="warning"
                  @click="removeRule(rIdx)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Delete, CircleClose, CirclePlus } from '@element-plus/icons-vue'

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

// 选项（占位数据，可按需替换为真实字典）
const protocolOptions = ref<string[]>(['modsrv', 'opcua', 'mqtt'])
const instanceOptions = ref<string[]>(['pv1', 'ess1', 'dg1'])
const pointOptions = ref<string[]>(['p1', 'p2', 'p3'])
const operatorOptions = ref<string[]>(['==', '!=', '>', '>=', '<', '<='])
const relationOptions = ref<string[]>(['&&', '||'])
const arithmeticOperatorOptions = ref<string[]>(['+', '-', '*', '/'])
// const ruleTypeOptions = ref<string[]>(['alone', 'default', 'custom'])
const ruleTypeOptions = ref<string[]>(['default', 'custom'])

const variableNameOptions = computed(() => {
  const list = cardData.value?.config?.variables
  const arr = Array.isArray(list) ? list : []
  return arr.map((v: any) => v?.name).filter(Boolean)
})

// 取消监听，改为在 validateForm 中统一同步 wires

// 变量设置：新增 / 删除
function addVariable() {
  const nextIdx = getNextVariableIndex()
  cardData.value.config.variables.push({
    name: `X${nextIdx}`,
    type: 'single',
    protocol: '',
    instance: '',
    point: '',
  })
}
function removeVariable(idx: number) {
  const vars = cardData.value.config.variables
  if (!Array.isArray(vars)) return
  const removed = vars[idx]
  vars.splice(idx, 1)
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
function removeRule(idx: number) {
  cardData.value.config.rule.splice(idx, 1)
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

// 当类型切换时，初始化对应结构
function onRuleTypeChange(r: any) {
  if (r.type === 'alone') {
    r.rule = {
      variables: variableNameOptions.value[0] || '',
      operator: operatorOptions.value[0],
      value: variableNameOptions.value[0] || '',
    }
  } else if (r.type === 'default') {
    r.rule = [
      {
        type: 'variable',
        variables: variableNameOptions.value[0] || '',
        value: variableNameOptions.value[0] || '',
        operator: operatorOptions.value[0],
      },
    ]
  } else if (r.type === 'custom') {
    r.rule = ''
  }
}

// default：添加 / 删除条件
function adddefaultCondition(r: any) {
  if (!Array.isArray(r.rule)) r.rule = []
  r.rule.push({ type: 'relation', value: '&&' })
  r.rule.push({
    type: 'variable',
    variables: variableNameOptions.value[0] || '',
    value: variableNameOptions.value[0] || '',
    operator: operatorOptions.value[0],
  })
}
function removedefaultCondition(r: any, variableRuleIndex: number) {
  if (!Array.isArray(r.rule)) return
  // 先移除前置 relation（如果存在）
  if (
    variableRuleIndex - 1 >= 0 &&
    r.rule[variableRuleIndex - 1] &&
    r.rule[variableRuleIndex - 1].type === 'relation'
  ) {
    r.rule.splice(variableRuleIndex - 1, 1)
    r.rule.splice(variableRuleIndex - 1, 1) // 删除后，原变量项索引前移一位
  } else {
    r.rule.splice(variableRuleIndex, 1)
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
  for (const v of vars) {
    if (!v) continue
    if (v.type === 'combined') {
      // 仅保留 type/name/formula（保留已填值，如缺失则补齐前三项）
      v.formula = Array.isArray(v.formula) && v.formula.length >= 3 ? v.formula : ['', '', '']
      delete v.protocol
      delete v.instance
      delete v.point
    } else {
      // single：仅保留 type/name/protocol/instance/point（保留用户输入）
      v.type = 'single'
      if (v.protocol == null) v.protocol = ''
      if (v.instance == null) v.instance = ''
      if (v.point == null) v.point = ''
      delete v.formula
    }
  }
}
// variable: 类型切换
function onVariableTypeChange(v: any, idx: number) {
  if (v.type === 'combined') {
    // 初始化 formula 结构
    if (!Array.isArray(v.formula)) v.formula = ['', '', '']
    // 清空 single 相关字段，仅保留 type/name/formula
    v.protocol = ''
    v.instance = ''
    v.point = ''
  } else {
    // single 模式仅保留 type/name/protocol/instance/point
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
function getVariableNameOptionsExcluding(selfIdx: number) {
  const list = Array.isArray(cardData.value?.config?.variables)
    ? cardData.value.config.variables
    : []
  return list
    .map((it: any, i: number) => (i === selfIdx ? '' : it?.name))
    .filter((x: string) => !!x)
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
</script>

<style lang="scss" scoped>
.voltage-class,
.function-switch-form {
  .main-section {
    display: flex;
    gap: 10px;
  }
  .section {
    &.variable-section {
      padding-right: 10px;
      width: 50%;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    &.rule-section {
      width: calc(50% - 10px);
    }
    &.basic-section {
      width: 100%;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .section__header {
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .section__title {
        font-weight: 700;
        color: #fff;
        font-size: 18px;
      }

      .section__add-btn {
        padding: 0 4px;
      }
    }

    .section__body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      &.variable,
      &.rule {
        height: 400px;
        overflow-y: auto;
      }
    }
  }

  .variable-row__controls,
  .combined-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .variable-row__select {
    width: 164px;
  }
  .variable-row__delete {
    padding: 0 4px;
  }

  .rule-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    // padding: 12px;
    &:last-child {
      padding-bottom: 0;
      border-bottom: none;
    }
  }
  .rule-row__head,
  .variable-row {
    display: flex;
    // align-items: center;
    justify-content: space-between;
  }
  .rule-row__name,
  .variable-row__item {
    margin-bottom: 0;
    align-items: flex-start;
  }
  .rule-row__type {
    width: 240px;
    .rule-row__delete {
      padding: 0 4px;
    }
    // margin-left: 12px;
  }
  .rule-row__body {
    display: flex;
    align-items: center;
    gap: 8px;
    // margin-left: 136px;
  }

  .rule-row__select {
    width: 120px;
  }
  .rule-row__default,
  .variable-row__combined {
    display: flex;
    flex-direction: column;
    gap: 8px;
    & > div {
      // margin-left: 136px;
    }
  }
  .default-cond-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .default-cond-row__relation {
    width: 100px !important;
  }
  .default-cond-row__delete {
    padding: 0 4px;
  }
  .rule-row__default-add {
    // display: flex;
    // justify-content: flex-end;
    // margin-right: 38px;
  }
}

// // 统一输入组件宽度
// .voltage-class .function-switch-form :deep(.el-input),
// .voltage-class .function-switch-form :deep(.el-select) {
//   width: 120px;
// }
</style>
