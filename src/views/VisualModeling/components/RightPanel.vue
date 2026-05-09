<template>
  <div class="voltage-class right-panel" :class="{ 'right-panel--visible': !!selectedNode }">
    <template v-if="selectedNode">
      <!-- 头部：类型标签 + 标题 -->
      <div class="right-panel__header">
        <span class="right-panel__type-badge" :class="`right-panel__type-badge--${selectedNode.type}`">
          {{ typeLabel }}
        </span>
        <span class="right-panel__title">节点属性</span>
      </div>

      <div class="right-panel__body">
        <!-- 基础信息 -->
        <div class="right-panel__section">
          <div class="right-panel__field">
            <label class="right-panel__label">显示名称</label>
            <el-input
              v-model="form.label"
              size="small"
              @blur="applyChanges"
              @keyup.enter="applyChanges"
            />
          </div>
          <div class="right-panel__field">
            <label class="right-panel__label">描述</label>
            <el-input
              v-model="form.description"
              size="small"
              type="textarea"
              :rows="2"
              placeholder="可选描述"
              @blur="applyChanges"
            />
          </div>
          <!-- 颜色 -->
          <div class="right-panel__field">
            <label class="right-panel__label">颜色主题</label>
            <div class="right-panel__colors">
              <div
                v-for="c in colorOptions"
                :key="c.value"
                class="right-panel__color-dot"
                :class="{ active: form.color === c.value }"
                :style="{ backgroundColor: c.hex }"
                :title="c.label"
                @click="setColor(c.value)"
              />
            </div>
          </div>
        </div>

        <!-- 图标（非 group） -->
        <template v-if="selectedNode.type !== 'group'">
          <div class="right-panel__divider">外观</div>
          <div class="right-panel__section">
            <div class="right-panel__field">
              <label class="right-panel__label">图标</label>
              <el-select
                v-model="form.icon"
                size="small"
                style="width:100%"
                @change="applyChanges"
              >
                <el-option
                  v-for="ic in iconOptions"
                  :key="ic.value"
                  :value="ic.value"
                  :label="ic.label"
                >
                  <span style="display:flex;align-items:center;gap:8px">
                    <AppIcon :name="ic.value" style="width:14px;height:14px" />
                    {{ ic.label }}
                  </span>
                </el-option>
              </el-select>
            </div>
          </div>
        </template>

        <!-- 设备实例绑定（product 节点） -->
        <template v-if="selectedNode.type === 'product'">
          <div class="right-panel__divider">
            设备实例
            <el-icon v-if="instancesLoading" class="is-loading right-panel__spin"><Loading /></el-icon>
          </div>
          <div class="right-panel__section">
            <div class="right-panel__field">
              <label class="right-panel__label">绑定实例</label>
              <el-select
                v-model="form.instanceId"
                size="small"
                filterable
                clearable
                placeholder="搜索并选择实例"
                style="width:100%"
                :loading="instancesLoading"
                @change="onInstanceChange"
              >
                <el-option
                  v-for="inst in storeInstances"
                  :key="inst.instance_id"
                  :label="`${inst.instance_name}${inst.product_name ? '（'+inst.product_name+'）' : ''}`"
                  :value="inst.instance_id"
                >
                  <div style="display:flex;flex-direction:column;line-height:1.4;padding:2px 0">
                    <span style="font-size:12px;font-weight:600">{{ inst.instance_name }}</span>
                    <span style="font-size:10px;color:#909399">{{ inst.product_name }}</span>
                  </div>
                </el-option>
              </el-select>
            </div>
            <div v-if="form.instanceName" class="right-panel__info-row">
              <span class="right-panel__info-label">实例名</span>
              <span class="right-panel__info-val">{{ form.instanceName }}</span>
            </div>
            <div v-if="form.productName" class="right-panel__info-row">
              <span class="right-panel__info-label">产品</span>
              <span class="right-panel__info-val">{{ form.productName }}</span>
            </div>
          </div>

          <!-- 属性列表 -->
          <div class="right-panel__divider">
            属性
            <span class="right-panel__divider-count">{{ propCount }}</span>
            <el-icon v-if="propsLoading" class="is-loading right-panel__spin"><Loading /></el-icon>
          </div>
          <div v-if="propCount === 0" class="right-panel__no-props">
            {{ form.instanceId ? '暂无属性' : '绑定实例后显示属性' }}
          </div>
          <div v-else class="right-panel__props">
            <div v-for="[k, v] in propEntries" :key="k" class="right-panel__prop-row">
              <span class="right-panel__prop-key">{{ k }}</span>
              <span class="right-panel__prop-val">{{ v }}</span>
            </div>
          </div>
        </template>

        <!-- 节点 ID -->
        <div class="right-panel__field right-panel__field--id">
          <label class="right-panel__label">节点 ID</label>
          <el-input :model-value="selectedNode.id" size="small" readonly />
        </div>
      </div>

      <div class="right-panel__footer">
        <el-button
          type="danger"
          size="small"
          plain
          @click="emit('delete-node', selectedNode.id)"
        >
          <AppIcon name="i-tabler-trash" style="margin-right:4px" />
          删除节点
        </el-button>
      </div>
    </template>

    <div v-else class="right-panel__placeholder">
      <AppIcon name="i-tabler-click" class="right-panel__placeholder-icon" />
      <span>点击节点<br>查看 / 编辑属性</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AppIcon from '@/components/AppIcon.vue'
import type { ModelFlowNode } from '@/types/visualModeling'
import { useVisualModelingStore } from '@/stores/visualModeling'
import { getInstanceDetail } from '@/api/devicesManagement'

const props = defineProps<{
  selectedNode: ModelFlowNode | null
}>()

const emit = defineEmits<{
  (e: 'update-node', node: ModelFlowNode): void
  (e: 'delete-node', id: string): void
}>()

const store = useVisualModelingStore()
const storeInstances = computed(() => store.instances)
const instancesLoading = computed(() => store.instancesLoading)
const propsLoading = ref(false)

const form = ref({
  label: '',
  description: '',
  color: 'default',
  icon: 'i-tabler-cpu',
  instanceId: undefined as number | undefined,
  instanceName: '',
  productName: '',
  properties: {} as Record<string, string | number>,
})

const colorOptions = [
  { value: 'default', hex: '#607d8b', label: '默认灰' },
  { value: 'blue',   hex: '#4a90d9', label: '蓝色' },
  { value: 'green',  hex: '#43a047', label: '绿色' },
  { value: 'orange', hex: '#ef6c00', label: '橙色' },
  { value: 'purple', hex: '#8e24aa', label: '紫色' },
  { value: 'teal',   hex: '#00897b', label: '青色' },
  { value: 'red',    hex: '#e53935', label: '红色' },
]

const iconOptions = [
  { value: 'i-tabler-cpu',                      label: '处理器/网关' },
  { value: 'i-tabler-bolt',                     label: '电力/能源' },
  { value: 'i-tabler-solar-panel',              label: '光伏' },
  { value: 'i-tabler-battery-charging',         label: '电池/储能' },
  { value: 'i-tabler-wind',                     label: '风能' },
  { value: 'i-tabler-temperature',              label: '温度/环境' },
  { value: 'i-tabler-settings',                 label: '控制器' },
  { value: 'i-tabler-server',                   label: '服务器' },
  { value: 'i-tabler-plug',                     label: '负载/用电' },
  { value: 'i-tabler-device-desktop-analytics', label: '监控设备' },
  { value: 'i-tabler-building-factory-2',       label: '工厂/站点' },
  { value: 'i-tabler-layout-grid',              label: '组合' },
]

const typeLabel = computed(() => {
  const m: Record<string, string> = { station: '站点', product: '设备', group: '组合' }
  return m[props.selectedNode?.type ?? ''] ?? '节点'
})

const propEntries = computed(() =>
  Object.entries(form.value.properties) as [string, string | number][],
)
const propCount = computed(() => propEntries.value.length)

watch(
  () => props.selectedNode,
  async (node) => {
    if (!node) return
    form.value.label       = node.data.label       ?? ''
    form.value.description = node.data.description ?? ''
    form.value.color       = node.data.color       ?? 'default'
    form.value.icon        = node.data.icon        ?? 'i-tabler-cpu'
    form.value.instanceId  = node.data.instanceId
    form.value.instanceName= node.data.instanceName ?? ''
    form.value.productName = node.data.productName  ?? ''
    form.value.properties  = node.data.properties ? { ...node.data.properties } : {}

    // 已绑定实例但无属性时自动拉取
    if (node.type === 'product' && node.data.instanceId && Object.keys(form.value.properties).length === 0) {
      await fetchInstanceProps(node.data.instanceId)
    }
    // 确保实例列表已加载
    if (node.type === 'product') store.loadInstances()
  },
  { immediate: true },
)

async function onInstanceChange(instanceId: number | undefined) {
  if (!instanceId) {
    form.value.instanceName = ''
    form.value.productName  = ''
    form.value.properties   = {}
    applyChanges()
    return
  }
  const inst = storeInstances.value.find((i: any) => i.instance_id === instanceId)
  if (inst) {
    form.value.instanceName = inst.instance_name
    form.value.productName  = inst.product_name
    if (!form.value.label || form.value.label === '设备节点') {
      form.value.label = inst.instance_name
    }
  }
  await fetchInstanceProps(instanceId)
  applyChanges()
}

async function fetchInstanceProps(instanceId: number) {
  propsLoading.value = true
  try {
    const res = await getInstanceDetail(instanceId)
    form.value.properties = res?.data?.instance?.properties ?? {}
  } catch {
    form.value.properties = {}
  } finally {
    propsLoading.value = false
  }
}

function setColor(color: string) {
  form.value.color = color
  applyChanges()
}

function applyChanges() {
  if (!props.selectedNode) return
  const updated: ModelFlowNode = {
    ...props.selectedNode,
    data: {
      ...props.selectedNode.data,
      label:        form.value.label,
      description:  form.value.description,
      color:        form.value.color,
      icon:         form.value.icon,
      instanceId:   form.value.instanceId,
      instanceName: form.value.instanceName,
      productName:  form.value.productName,
      properties:   { ...form.value.properties },
    },
  }
  emit('update-node', updated)
}
</script>

<style lang="scss" scoped>
.voltage-class {
  .right-panel {
    width: 0;
    overflow: hidden;
    transition: width 0.25s ease;
    background: rgba(255, 255, 255, 0.97);
    border-left: 1px solid rgba(15, 31, 61, 0.08);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;

    &--visible { width: 240px; }

    &__header {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 9px 12px 7px;
      border-bottom: 1px solid rgba(15, 31, 61, 0.08);
      flex-shrink: 0;
    }

    &__type-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      color: #fff;
      &--station { background: #283593; }
      &--product { background: #4a90d9; }
      &--group   { background: #8e24aa; }
    }

    &__title {
      font-size: 13px;
      font-weight: 700;
      color: #0f1f3d;
      flex: 1;
    }

    &__spin {
      font-size: 12px;
      color: #909399;
      margin-left: 4px;
    }

    &__body {
      flex: 1;
      overflow-y: auto;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &__divider {
      font-size: 11px;
      font-weight: 700;
      color: #7f8c9a;
      padding: 4px 0 2px;
      border-bottom: 1px solid rgba(15, 31, 61, 0.08);
      display: flex;
      align-items: center;
      gap: 5px;
    }

    &__divider-count {
      background: #e3f0ff;
      color: #4a90d9;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 8px;
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &--id { margin-top: 4px; }
    }

    &__label {
      font-size: 11px;
      font-weight: 600;
      color: #607080;
    }

    &__colors {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    &__color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.15s;

      &:hover, &.active {
        border-color: #0f1f3d;
        transform: scale(1.2);
      }
    }

    &__info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 12px;
      padding: 2px 0;
      border-bottom: 1px dashed rgba(0,0,0,0.07);

      &:last-child { border-bottom: none; }
    }

    &__info-label {
      color: #7f8c9a;
      font-weight: 500;
      flex-shrink: 0;
    }

    &__info-val {
      color: #1a2438;
      font-weight: 600;
      text-align: right;
      word-break: break-all;
      max-width: 140px;
    }

    &__no-props {
      font-size: 11px;
      color: #b0b8c4;
      text-align: center;
      padding: 6px 0;
    }

    &__props {
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 5px;
      padding: 4px 8px;
      max-height: 160px;
      overflow-y: auto;
    }

    &__prop-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      padding: 3px 0;
      border-bottom: 1px dashed rgba(0,0,0,0.07);

      &:last-child { border-bottom: none; }
    }

    &__prop-key {
      color: #607080;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__prop-val {
      color: #1a2438;
      font-weight: 600;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
    }

    &__footer {
      padding: 10px 12px;
      border-top: 1px solid rgba(15, 31, 61, 0.08);
      flex-shrink: 0;
      .el-button { width: 100%; }
    }

    &__placeholder {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #b0b8c4;
      font-size: 12px;
      text-align: center;
      line-height: 1.6;
      width: 240px;

      &-icon {
        :deep(svg) { width: 32px; height: 32px; color: #b0b8c4 !important; }
      }
    }
  }
}
</style>
