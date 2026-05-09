<template>
  <el-dialog
    v-model="visible"
    title="节点配置"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form :model="form" label-width="90px" label-position="left" size="default">

      <!-- 节点类型 -->
      <el-form-item label="节点类型">
        <el-tag :type="tagType" size="small">{{ typeLabel }}</el-tag>
      </el-form-item>

      <!-- 显示名称 -->
      <el-form-item label="显示名称" required>
        <el-input v-model="form.label" placeholder="节点显示名称" maxlength="50" />
      </el-form-item>

      <!-- product 节点：绑定实例 -->
      <template v-if="nodeType === 'product'">
        <el-divider content-position="left"><span style="font-size:12px">绑定设备实例</span></el-divider>

        <el-form-item label="选择实例">
          <el-select
            v-model="form.instanceId"
            filterable
            clearable
            placeholder="搜索并选择实例"
            style="width:100%"
            :loading="instancesLoading"
            @change="onInstanceChange"
          >
            <template #prefix>
              <AppIcon name="i-tabler-cpu" style="width:14px;height:14px" />
            </template>
            <el-option
              v-for="inst in instances"
              :key="inst.instance_id"
              :label="`${inst.instance_name}（${inst.product_name}）`"
              :value="inst.instance_id"
            >
              <div style="display:flex;flex-direction:column;line-height:1.4;padding:2px 0">
                <span style="font-size:13px;font-weight:600">{{ inst.instance_name }}</span>
                <span style="font-size:11px;color:#909399">{{ inst.product_name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.instanceName" label="实例名称">
          <el-input :model-value="form.instanceName" readonly />
        </el-form-item>

        <el-form-item v-if="form.productName" label="产品名称">
          <el-input :model-value="form.productName" readonly />
        </el-form-item>

        <!-- 属性展示 -->
        <el-form-item label="实例属性">
          <div class="node-config__props-box">
            <div v-if="propsLoading" class="node-config__props-status">
              <el-icon class="is-loading"><Loading /></el-icon> 加载属性中...
            </div>
            <div v-else-if="propEntries.length === 0" class="node-config__props-status">
              暂无属性
            </div>
            <div v-else class="node-config__props-list">
              <div
                v-for="[k, v] in propEntries"
                :key="k"
                class="node-config__prop-row"
              >
                <span class="node-config__prop-key">{{ k }}</span>
                <span class="node-config__prop-val">{{ v }}</span>
              </div>
            </div>
          </div>
        </el-form-item>
      </template>

      <!-- group 节点：尺寸 -->
      <template v-if="nodeType === 'group'">
        <el-divider content-position="left"><span style="font-size:12px">容器尺寸</span></el-divider>
        <el-form-item label="宽度 (px)">
          <el-input-number v-model="form.width" :min="160" :max="900" :step="20" style="width:100%" />
        </el-form-item>
        <el-form-item label="高度 (px)">
          <el-input-number v-model="form.height" :min="120" :max="700" :step="20" style="width:100%" />
        </el-form-item>
      </template>

      <!-- 颜色主题 -->
      <el-divider content-position="left"><span style="font-size:12px">外观</span></el-divider>
      <el-form-item label="颜色主题">
        <div class="node-config__colors">
          <div
            v-for="c in colorOptions"
            :key="c.value"
            class="node-config__color-dot"
            :class="{ active: form.color === c.value }"
            :style="{ backgroundColor: c.hex }"
            :title="c.label"
            @click="form.color = c.value"
          />
        </div>
      </el-form-item>

      <el-form-item label="图标">
        <el-select v-model="form.icon" style="width:100%">
          <el-option
            v-for="ic in iconOptions"
            :key="ic.value"
            :label="ic.label"
            :value="ic.value"
          >
            <span style="display:flex;align-items:center;gap:8px">
              <AppIcon :name="ic.value" style="width:14px;height:14px" />
              {{ ic.label }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 描述 -->
      <el-form-item label="描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="可选描述"
        />
      </el-form-item>

    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import AppIcon from '@/components/AppIcon.vue'
import { getInstanceDetail } from '@/api/devicesManagement'
import type { ModelFlowNode } from '@/types/visualModeling'
import { useVisualModelingStore } from '@/stores/visualModeling'

const props = defineProps<{
  node: ModelFlowNode | null
}>()
const emit = defineEmits<{
  (e: 'confirm', data: Partial<ModelFlowNode['data']> & { width?: number; height?: number }): void
}>()

const visible = defineModel<boolean>('visible', { default: false })

const store = useVisualModelingStore()

// ---- form ----
const form = reactive({
  label: '',
  description: '',
  color: 'default',
  icon: 'i-tabler-cpu',
  instanceId: undefined as number | undefined,
  instanceName: '',
  productName: '',
  properties: {} as Record<string, string | number>,
  width: 380,
  height: 260,
})

// 使用 store 共享实例列表，避免重复请求
const instances = computed(() => store.instances)
const instancesLoading = computed(() => store.instancesLoading)
const propsLoading = ref(false)

const nodeType = computed(() => props.node?.type ?? 'product')
const typeLabel = computed(() => ({ station: '站点', product: '设备', group: '组合' })[nodeType.value] ?? '节点')
const tagType = computed((): 'info' | 'success' | 'warning' =>
  ({ station: 'info', product: 'success', group: 'warning' } as const)[nodeType.value] ?? 'info',
)
const propEntries = computed(() => Object.entries(form.properties) as [string, string | number][])

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

// ---- 实例选择回调 ----
async function onInstanceChange(instanceId: number | undefined) {
  if (!instanceId) {
    form.instanceName = ''
    form.productName = ''
    form.properties = {}
    return
  }
  const inst = instances.value.find((i: any) => i.instance_id === instanceId)
  if (inst) {
    form.instanceName = inst.instance_name
    form.productName = inst.product_name
    // 如果显示名称还是默认/空，自动填入实例名
    if (!form.label || form.label === '设备节点') {
      form.label = inst.instance_name
    }
  }
  // 拉取详细属性
  propsLoading.value = true
  try {
    const res = await getInstanceDetail(instanceId)
    form.properties = res?.data?.instance?.properties ?? {}
  } catch {
    form.properties = {}
  } finally {
    propsLoading.value = false
  }
}

// ---- 初始化表单 ----
watch(
  () => props.node,
  async (node) => {
    if (!node) return
    form.label = node.data.label ?? ''
    form.description = node.data.description ?? ''
    form.color = node.data.color ?? 'default'
    form.icon = node.data.icon ?? 'i-tabler-cpu'
    form.instanceId = node.data.instanceId
    form.instanceName = node.data.instanceName ?? ''
    form.productName = node.data.productName ?? ''
    form.properties = node.data.properties ? { ...node.data.properties } : {}
    form.width = (node.data.width as number) ?? 280
    form.height = (node.data.height as number) ?? 200

    // 如果已绑定实例但无属性，自动拉取
    if (node.data.instanceId && Object.keys(form.properties).length === 0) {
      propsLoading.value = true
      try {
        const res = await getInstanceDetail(node.data.instanceId)
        form.properties = res?.data?.instance?.properties ?? {}
      } catch {
        form.properties = {}
      } finally {
        propsLoading.value = false
      }
    }
  },
  { immediate: true },
)

function handleConfirm() {
  if (!form.label.trim()) {
    ElMessage.warning('请填写节点显示名称')
    return
  }
  emit('confirm', {
    label: form.label.trim(),
    description: form.description.trim(),
    color: form.color,
    icon: form.icon,
    instanceId: form.instanceId,
    instanceName: form.instanceName,
    productName: form.productName,
    properties: { ...form.properties },
    width: form.width,
    height: form.height,
  })
  visible.value = false
}

onMounted(() => {
  // 若 store 中实例已加载则直接使用，否则触发加载
  store.loadInstances()
})
</script>

<style lang="scss" scoped>
.node-config {
  &__colors {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.15s;

    &:hover,
    &.active {
      border-color: #0f1f3d;
      transform: scale(1.2);
    }
  }

  &__props-box {
    width: 100%;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 6px;
    background: #f8fafc;
    min-height: 48px;
    max-height: 180px;
    overflow-y: auto;
  }

  &__props-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px;
    font-size: 12px;
    color: #909399;
  }

  &__props-list {
    padding: 6px 10px;
  }

  &__prop-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px dashed rgba(0,0,0,0.07);
    font-size: 12px;

    &:last-child { border-bottom: none; }
  }

  &__prop-key {
    color: #607080;
    font-weight: 500;
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
}
</style>
