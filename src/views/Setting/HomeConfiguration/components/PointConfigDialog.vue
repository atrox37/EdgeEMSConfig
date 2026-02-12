<template>
    <el-dialog
        v-model="visible"
        :title="dialogTitle"
        width="80%"
        :close-on-click-modal="false"
        destroy-on-close
        class="point-config-dialog"
        style="height: 70%;min-height: 550px;"
    >
        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="content-form">
            <el-form-item label="Name:" prop="name">
                <el-input v-model="form.name" placeholder="Enter name" />
            </el-form-item>

            <el-form-item label="Formula:" required class="formula-item">
                <LightCollapseCard v-model="isFormulaOpen" title="Formula Builder" class="formula-card" auto-height>
                    <div class="formula-scroll">
                        <div class="formula-lines">
                        <div v-for="(line, idx) in form.formulaLines" :key="line.id" class="formula-line">
                            <div class="formula-line__operator">
                                <el-select v-if="idx > 0" v-model="line.operator" placeholder="op"
                                    class="operator-select">
                                    <el-option v-for="op in operatorOptions" :key="op.value" :label="op.label"
                                        :value="op.value" />
                                </el-select>
                                <div v-else class="operator-spacer" />
                            </div>

                            <div class="formula-line__inputs">
                                <el-select v-model="line.type" placeholder="type" class="input-item">
                                    <el-option v-for="item in typeOptions" :key="item.value" :label="item.label"
                                        :value="item.value" />
                                </el-select>

                                <template v-if="line.type === 'Channel'">
                                    <el-select v-model="line.comsrv.channelId" placeholder="channel" class="input-item"
                                        filterable clearable
                                        @change="() => onChannelChange(line)">
                                        <el-option v-for="item in comsrvChannelOptions" :key="item.value"
                                            :label="item.label" :value="item.value" />
                                    </el-select>
                                    <el-select v-model="line.comsrv.dataType" placeholder="data type"
                                        class="input-item"
                                        :disabled="!line.comsrv.channelId"
                                        @change="() => onChannelDataTypeChange(line)">
                                        <el-option v-for="item in comsrvDataTypeOptions" :key="item.value"
                                            :label="item.label" :value="item.value" />
                                    </el-select>
                                    <el-select v-model="line.comsrv.pointId" placeholder="point" class="input-item"
                                        filterable clearable
                                        :disabled="!line.comsrv.channelId || !line.comsrv.dataType">
                                        <el-option v-for="item in getComsrvPointOptionsForLine(line)" :key="item.value"
                                            :label="item.label" :value="item.value" />
                                    </el-select>
                                </template>

                                <template v-else-if="line.type === 'Instance'">
                                    <el-select v-model="line.instance.instanceId" placeholder="instance"
                                        class="input-item" filterable clearable
                                        @change="() => onInstanceChange(line)">
                                        <el-option v-for="item in instanceOptions" :key="item.value" :label="item.label"
                                            :value="item.value" />
                                    </el-select>
                                    <el-select v-model="line.instance.dataType" placeholder="data type"
                                        class="input-item"
                                        :disabled="!line.instance.instanceId"
                                        @change="() => onInstanceDataTypeChange(line)">
                                        <el-option v-for="item in instanceDataTypeOptions" :key="item.value"
                                            :label="item.label" :value="item.value" />
                                    </el-select>
                                    <el-select v-model="line.instance.pointId" placeholder="instance point"
                                        class="input-item" filterable clearable
                                        :disabled="!line.instance.instanceId || !line.instance.dataType">
                                        <el-option v-for="item in getInstancePointOptionsForLine(line)" :key="item.value"
                                            :label="item.label" :value="item.value" />
                                    </el-select>
                                </template>

                                <template v-else>
                                    <el-input-number v-model="line.numberValue" :min="-999999999" :max="999999999"
                                        :step="1" :controls="false" align="left" class="input-item" />
                                </template>
                            </div>

                            <div class="formula-line__actions">
                                <el-button class="icon-btn" type="danger" link @click="removeLine(idx)">
                                    <el-icon class="icon-btn__delete">
                                        <CircleClose />
                                    </el-icon>
                                </el-button>
                            </div>
                        </div>

                        <div class="formula-add">
                            <el-button class="icon-btn" type="primary" link @click="addLine">
                                <el-icon class="icon-btn__add">
                                    <CirclePlus />
                                </el-icon>
                            </el-button>
                        </div>
                        </div>
                    </div>
                </LightCollapseCard>
            </el-form-item>

            <el-form-item v-if="showIconSelector" label="Icon:" prop="icon">
                <div class="icon-picker">
                    <div class="icon-picker__grid">
                        <button
                            v-for="opt in iconOptions"
                            :key="opt.name"
                            type="button"
                            class="icon-picker__item"
                            :class="{ 'is-active': form.icon === opt.name }"
                            @click="handleIconPick(opt.name)"
                        >
                            <img :src="opt.url" class="icon-picker__img" :alt="opt.name" />
                        </button>
                    </div>
                </div>
            </el-form-item>

            <el-form-item label="Unit:" prop="unit">
                <el-input v-model="form.unit" placeholder="e.g. kW / kWh / %" />
            </el-form-item>

            <el-form-item label="Description:" prop="description">
                <el-input v-model="form.description" 
                    placeholder="Enter description (optional)" />
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="visible = false">Cancel</el-button>
            <el-button type="primary" @click="handleSave">Save</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { CircleClose, CirclePlus } from '@element-plus/icons-vue'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import type { FormRules } from 'element-plus'
import { getAllChannels, getPointsTables } from '@/api/channelsManagement'
import { getAllInstances, getInstancePoints } from '@/api/devicesManagement'
import type { PointInfoResponse, PointType } from '@/types/channelConfiguration'
import type { InstancePointList } from '@/types/deviceConfiguration'
import { AVAILABLE_ICONS } from '../iconOptions'
export type FormulaType = 'Channel' | 'Instance' | 'Number'
export type ChannelDataType = 'Telemetry' | 'Signal' | 'Control' | 'Adjustment'
export type InstanceDataType = 'Property' | 'Measurement' | 'Action'

export interface PointConfigPayload {
    cardId: string
    name: string
    unit: string
    description: string
    /** Icon name from available icons, e.g. "icon-pv-energy" */
    icon?: string
    /** example: "comsrv:6:T:1+inst:6:M:2+12" */
    formula: string
}

interface DialogCardInfo {
    id: string
    module: string
    context?: string
    label: string
    unit: string
    icon?: string
    formula?: string
    description?: string
}

const props = withDefaults(
    defineProps<{
        modelValue: boolean
        card: DialogCardInfo | null
    }>(),
    {
        modelValue: false,
        card: null,
    },
)

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'updateBasic', payload: { id: string; label: string; unit: string; icon?: string }): void
    (e: 'save', payload: PointConfigPayload): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v),
})

const dialogTitle = computed(() => {
    return 'Point Configuration'
})

const showIconSelector = computed(() => {
    const module = props.card?.module ?? ''
    return module === 'Energy Dashboard' || module === 'Station Information'
})

const typeOptions: Array<{ label: string; value: FormulaType }> = [
    { label: 'Channel', value: 'Channel' },
    { label: 'Instance', value: 'Instance' },
    { label: 'Number', value: 'Number' },
]

const comsrvDataTypeOptions: Array<{ label: string; value: ChannelDataType; code: string }> = [
    { label: 'Telemetry', value: 'Telemetry', code: 'T' },
    { label: 'Signal', value: 'Signal', code: 'S' },
    { label: 'Control', value: 'Control', code: 'C' },
    { label: 'Adjustment', value: 'Adjustment', code: 'A' },
]

const instanceDataTypeOptions: Array<{ label: string; value: InstanceDataType; code: string }> = [
    { label: 'Property', value: 'Property', code: 'P' },
    { label: 'Measurement', value: 'Measurement', code: 'M' },
    { label: 'Action', value: 'Action', code: 'A' },
]

// 通道/实例选项（从 API 获取）
const comsrvChannelOptions = ref<Array<{ label: string; value: number }>>([])
const instanceOptions = ref<Array<{ label: string; value: number }>>([])
const channelPointsCache = ref<Record<number, PointInfoResponse>>({})
const instancePointsCache = ref<Record<number, InstancePointList>>({})

async function fetchChannels() {
    try {
        const res = await getAllChannels()
        const list = Array.isArray(res?.data?.list) ? res.data.list : Array.isArray(res?.data) ? res.data : []
        comsrvChannelOptions.value = (list as any[])
            .map((it: any) => ({ label: String(it?.name ?? ''), value: Number(it?.id ?? 0) }))
            .filter((x) => Number.isFinite(x.value) && x.value > 0 && x.label)
    } catch {
        comsrvChannelOptions.value = []
    }
}

async function fetchInstances() {
    try {
        const res = await getAllInstances()
        const list = Array.isArray(res?.data?.list) ? res.data.list : []
        instanceOptions.value = (list as any[])
            .map((it: any) => ({
                label: String(it?.name ?? it?.instance_name ?? ''),
                value: Number(it?.id ?? it?.instance_id ?? 0),
            }))
            .filter((x) => Number.isFinite(x.value) && x.value > 0 && x.label)
    } catch {
        instanceOptions.value = []
    }
}

async function ensureChannelPoints(channelId: number) {
    if (!channelId || channelPointsCache.value[channelId]) return
    try {
        const res = await getPointsTables(channelId, undefined, { skipGlobalLoading: true })
        if (res?.success && res.data) {
            channelPointsCache.value[channelId] = res.data as PointInfoResponse
        } else if (res && ((res as any).telemetry || (res as any).signal || (res as any).control || (res as any).adjustment)) {
            channelPointsCache.value[channelId] = res as unknown as PointInfoResponse
        }
    } catch {
        /* ignore */
    }
}

async function ensureInstancePoints(instanceId: number) {
    if (!instanceId || instancePointsCache.value[instanceId]) return
    try {
        const res = await getInstancePoints(instanceId)
        const data = res?.data
        if (data) instancePointsCache.value[instanceId] = data
    } catch {
        /* ignore */
    }
}

function getComsrvPointOptionsForLine(line: FormulaLine): Array<{ label: string; value: number }> {
    const chId = Number(line.comsrv?.channelId ?? 0)
    const typeCode = getChannelTypeCode(line.comsrv?.dataType ?? 'Telemetry')
    const cache = channelPointsCache.value[chId]
    if (!chId || !cache) return []
    let list: any[] = []
    const tp = typeCode as PointType
    if (tp === 'T') list = cache.telemetry || []
    else if (tp === 'S') list = cache.signal || []
    else if (tp === 'C') list = cache.control || []
    else if (tp === 'A') list = cache.adjustment || []
    return (list || []).map((p) => ({
        label: p.signal_name || `#${p.point_id}`,
        value: p.point_id,
    }))
}

function getInstancePointOptionsForLine(line: FormulaLine): Array<{ label: string; value: number }> {
    const instanceId = Number(line.instance?.instanceId ?? 0)
    const dt = line.instance?.dataType ?? 'Property'
    const cache = instancePointsCache.value[instanceId]
    if (!instanceId || !cache) return []
    if (dt === 'Property') {
        const props = Object.values((cache as any)?.properties || {}) as any[]
        return props
            .filter((p) => p && p.property_id != null && p.name != null)
            .map((p) => ({ label: String(p.name || ''), value: Number(p.property_id) }))
    }
    if (dt === 'Measurement') {
        const arr = Object.values((cache as any)?.measurements || {}) as any[]
        const elems = (cache as any)?.elements ? Object.values((cache as any).elements) : arr
        const list = (elems?.length ? elems : arr) as any[]
        return list
            .filter((m) => m && m.measurement_id != null && m.name != null)
            .map((m) => ({ label: String(m.name || ''), value: Number(m.measurement_id) }))
    }
    if (dt === 'Action') {
        const actions = Object.values((cache as any)?.actions || {}) as any[]
        return actions
            .filter((a) => a && a.action_id != null && a.name != null)
            .map((a) => ({ label: String(a.name || ''), value: Number(a.action_id) }))
    }
    return []
}

function onChannelChange(line: FormulaLine) {
    line.comsrv.pointId = null
    const chId = Number(line.comsrv.channelId ?? 0)
    if (chId > 0) ensureChannelPoints(chId)
}

function onChannelDataTypeChange(line: FormulaLine) {
    line.comsrv.pointId = null
}

function onInstanceChange(line: FormulaLine) {
    line.instance.pointId = null
    const instId = Number(line.instance.instanceId ?? 0)
    if (instId > 0) ensureInstancePoints(instId)
}

function onInstanceDataTypeChange(line: FormulaLine) {
    line.instance.pointId = null
}

const formRef = ref()
const basicSnapshot = ref<{ id: string; label: string; unit: string; icon: string } | null>(null)
const hasCommitted = ref(false)
const initializedCardId = ref<string | null>(null)

type OperatorType = '+' | '-' | '×' | '÷'

interface FormulaLine {
    id: string
    operator: OperatorType
    type: FormulaType
    comsrv: {
        channelId: number | null
        dataType: ChannelDataType
        pointId: number | null
    }
    instance: {
        instanceId: number | null
        dataType: InstanceDataType
        pointId: number | null
    }
    numberValue: number
}

const iconOptions = AVAILABLE_ICONS

const operatorOptions: Array<{ label: string; value: OperatorType }> = [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '×', value: '×' },
    { label: '÷', value: '÷' },
]

const isFormulaOpen = ref(true)

function createFormulaLine(): FormulaLine {
    return {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        operator: '+',
        type: 'Channel',
        comsrv: {
            channelId: null,
            dataType: 'Telemetry',
            pointId: null,
        },
        instance: {
            instanceId: null,
            dataType: 'Property',
            pointId: null,
        },
        numberValue: 0,
    }
}

const form = reactive({
    cardId: '',
    name: '',
    icon: '',
    unit: '',
    description: '',
    formulaLines: [createFormulaLine()] as FormulaLine[],
})

const buildBasicSnapshot = (card: DialogCardInfo | null) => {
    if (!card) return null
    return {
        id: card.id,
        label: card.label ?? '',
        unit: card.unit ?? '',
        icon: card.icon ?? '',
    }
}

function initializeFormFromCard(card: DialogCardInfo | null) {
    if (!card) return
    form.cardId = card.id
    form.name = card.label
    form.icon = card.icon ?? ''
    form.unit = card.unit
    form.description = card.description ?? ''
    form.formulaLines = card.formula ? parseFormulaString(card.formula) : [createFormulaLine()]
    form.formulaLines.forEach((line) => {
        const chId = Number(line.comsrv?.channelId ?? 0)
        const instId = Number(line.instance?.instanceId ?? 0)
        if (line.type === 'Channel' && chId > 0) ensureChannelPoints(chId)
        if (line.type === 'Instance' && instId > 0) ensureInstancePoints(instId)
    })
    initializedCardId.value = card.id
}

watch(
    () => visible.value,
    (isOpen, wasOpen) => {
        if (isOpen && !wasOpen) {
            basicSnapshot.value = buildBasicSnapshot(props.card)
            hasCommitted.value = false
            initializeFormFromCard(props.card)
            return
        }
        if (!isOpen && wasOpen) {
            if (!hasCommitted.value && basicSnapshot.value) {
                emit('updateBasic', {
                    id: basicSnapshot.value.id,
                    label: basicSnapshot.value.label,
                    unit: basicSnapshot.value.unit,
                    icon: basicSnapshot.value.icon,
                })
            }
            hasCommitted.value = false
            initializedCardId.value = null
        }
    },
)

function parseOperator(op: string): OperatorType {
    if (op === '*') return '×'
    if (op === '/') return '÷'
    if (op === '+' || op === '-') return op
    return '+'
}

function codeToChannelDataType(code: string): ChannelDataType {
    const map: Record<string, ChannelDataType> = { T: 'Telemetry', S: 'Signal', C: 'Control', A: 'Adjustment' }
    return map[code] ?? 'Telemetry'
}

function codeToInstanceDataType(code: string): InstanceDataType {
    const map: Record<string, InstanceDataType> = { P: 'Property', M: 'Measurement', A: 'Action' }
    return map[code] ?? 'Property'
}

function parseFormulaString(formula: string): FormulaLine[] {
    if (!formula || typeof formula !== 'string') return [createFormulaLine()]
    const re = /([+*\/-])?(?:comsrv:(\d+):([TSCA]):(\d+)|inst:(\d+):([PMA]):(\d+)|(-?\d+))/g
    const lines: FormulaLine[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(formula)) !== null) {
        const op = m[1] ? parseOperator(m[1]) : '+'
        const chId = m[2]
        const chType = m[3]
        const chPointId = m[4]
        const instId = m[5]
        const instType = m[6]
        const instPointId = m[7]
        const numVal = m[8]
        const line = createFormulaLine()
        line.operator = op
        if (chId != null && chType && chPointId != null) {
            line.type = 'Channel'
            line.comsrv.channelId = Number(chId)
            line.comsrv.dataType = codeToChannelDataType(chType)
            line.comsrv.pointId = Number(chPointId)
        } else if (instId != null && instType && instPointId != null) {
            line.type = 'Instance'
            line.instance.instanceId = Number(instId)
            line.instance.dataType = codeToInstanceDataType(instType)
            line.instance.pointId = Number(instPointId)
        } else if (numVal != null) {
            line.type = 'Number'
            line.numberValue = Number(numVal)
        }
        lines.push(line)
    }
    if (lines.length === 0) return [createFormulaLine()]
    return lines
}

watch(
    () => [visible.value, props.card?.id] as const,
    ([isOpen, cardId]) => {
        if (!isOpen || !cardId) return
        if (initializedCardId.value === cardId) return
        initializeFormFromCard(props.card)
    },
    { immediate: true },
)

onMounted(() => {
    fetchChannels()
    fetchInstances()
})

watch(
    () => [form.cardId, form.name, form.icon, form.unit] as const,
    ([id, name, icon, unit]) => {
        if (!id) return
        emit('updateBasic', {
            id,
            label: String(name ?? ''),
            unit: String(unit ?? ''),
            icon: String(icon ?? ''),
        })
    },
)

watch(
    () => form.formulaLines.map(l => l.type),
    () => {
        // no-op placeholder for future validation/linkage
    },
)

// NOTE: formula string is still generated and will be used in payload/network requests
const formulaString = computed(() => buildFormulaString())

const rules: FormRules = {
    name: [{ required: true, message: 'Please enter a name', trigger: 'blur' }],
}

const buildPayload = (): PointConfigPayload => {
    return {
        cardId: form.cardId,
        name: form.name.trim(),
        unit: form.unit.trim(),
        description: form.description.trim(),
        icon: form.icon?.trim() || undefined,
        formula: formulaString.value,
    }
}

const addLine = () => {
    form.formulaLines.push(createFormulaLine())
}

const removeLine = (idx: number) => {
    if (idx < 0) return
    form.formulaLines.splice(idx, 1)
}

const handleIconPick = (iconName: string) => {
    form.icon = iconName
}

function opToToken(op: OperatorType): string {
    if (op === '×') return '*'
    if (op === '÷') return '/'
    return op
}

function getChannelTypeCode(v: ChannelDataType): string {
    return comsrvDataTypeOptions.find((x) => x.value === v)?.code || 'T'
}

function getInstanceTypeCode(v: InstanceDataType): string {
    return instanceDataTypeOptions.find((x) => x.value === v)?.code || 'P'
}

function buildFormulaString(): string {
    return form.formulaLines
        .map((line, idx) => {
            const prefix = idx === 0 ? '' : opToToken(line.operator)
            if (line.type === 'Number') {
                const num = Number(line.numberValue ?? 0)
                return `${prefix}${num}`
            }
            if (line.type === 'Channel') {
                const channelId = line.comsrv.channelId ?? 0
                const pointId = line.comsrv.pointId ?? 0
                const typeCode = getChannelTypeCode(line.comsrv.dataType)
                return `${prefix}comsrv:${channelId}:${typeCode}:${pointId}`
            }
            const instanceId = line.instance.instanceId ?? 0
            const pointId = line.instance.pointId ?? 0
            const typeCode = getInstanceTypeCode(line.instance.dataType)
            return `${prefix}inst:${instanceId}:${typeCode}:${pointId}`
        })
        .join('')
}

const handleSave = async () => {
    await formRef.value?.validate?.()
    if (!props.card) return
    hasCommitted.value = true
    emit('save', buildPayload())
    visible.value = false
}
</script>

<style scoped lang="scss">
.point-config-dialog {
  /* Make dialog layout predictable under fixed height */
  :deep(.el-dialog) {
    display: flex;
    flex-direction: column;
  }

  :deep(.el-dialog__body) {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
  }
  
.content-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  /* Let only the formula section grow/shrink */
  .formula-item {
    max-height: calc(100% - 224px);
    min-height: 0;
  }
  /* Make selects/inputs fill their flex cell */
  :deep(.el-select),
  :deep(.el-input-number),
  :deep(.el-input) {
    width: 100% !important;
  }
}
}


.formula-scroll {
  /* Limit max height & allow internal scrolling; height comes from flex container */
  overflow: auto;
  padding-right: $width-scrollbar;
}

.formula-lines {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.formula-line {
  display: grid;
  grid-template-columns: 88px 1fr 40px;
  gap: $spacing-sm;
  align-items: center;
}

.formula-line__operator {
  width: 88px; /* fixed, not responsive */
}

.operator-spacer {
  width: 88px;
  height: 1px;
}

.operator-select {
  width: 88px;
}

.formula-line__inputs {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
  width: 100%;
  flex-wrap: nowrap;
}

.input-item {
  flex: 1 1 0;
}

.formula-line__actions {
  display: flex;
  justify-content: flex-end;
}

.remove-btn {
  padding: 0;
  color: $danger-color;
}

.formula-add {
  margin-top: $spacing-sm;
}

.icon-btn {
  padding: 0 4px;
  flex: 0 0 auto;
}

.icon-btn__add {
  color: $success-color !important;
}

.icon-btn__delete {
  color: $danger-color !important;
}

.icon-picker {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: $spacing-sm;
}

.icon-picker__item {
  width: 100%;
  height: 48px;
  border-radius: $border-radius-base;
  border: $border-width-base solid $border-color-base;
  background: $bg-color-input;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.icon-picker__item:hover {
  border-color: $primary-color;
}

.icon-picker__item.is-active {
  border-color: $primary-color;
  box-shadow: 0 0 0 1px rgba($primary-color, 0.2);
}

.icon-picker__img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

</style>
