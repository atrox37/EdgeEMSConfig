<template>
  <div class="voltage-class right-panel" :class="{ 'right-panel--visible': !!selectedNode }">
    <template v-if="selectedNode">
      <div class="right-panel__header">
        <span class="right-panel__type-badge" :class="`right-panel__type-badge--${selectedNode.type}`">
          {{ typeLabel }}
        </span>
        <span class="right-panel__title">Node Configuration</span>
      </div>

      <div class="right-panel__body">
        <div class="right-panel__section">
          <div class="right-panel__field">
            <label class="right-panel__label">Display Name</label>
            <el-input
              v-model="form.label"
              size="small"
              :readonly="readonly"
              :disabled="readonly"
              @blur="applyChanges"
              @keyup.enter="applyChanges"
            />
          </div>
          <div v-if="canBindInstances" class="right-panel__field">
            <label class="right-panel__label">Description</label>
            <el-input
              v-model="form.description"
              size="small"
              type="textarea"
              :rows="2"
              placeholder="Optional description"
              :readonly="readonly"
              :disabled="readonly"
              @blur="applyChanges"
            />
          </div>
          <div v-if="form.productName" class="right-panel__info-row">
            <span class="right-panel__info-label">Product Type</span>
            <span class="right-panel__info-val">{{ form.productName }}</span>
          </div>
        </div>

        <template v-if="canBindInstances">
          <div class="right-panel__divider">
            Device Instances
            <el-icon v-if="instancesLoading" class="is-loading right-panel__spin"><Loading /></el-icon>
          </div>

          <div class="right-panel__section">
          <div class="right-panel__field">
            <label class="right-panel__label">{{ instanceBindLabel }}</label>
              <el-select
                :model-value="selectedInstanceIds[0]"
                size="small"
                filterable
                clearable
                :teleported="true"
                :fit-input-width="true"
                popper-class="visual-modeling-popper"
                :placeholder="instanceBindPlaceholder"
                style="width:100%"
                :loading="instancesLoading"
                :disabled="readonly"
                @update:model-value="onContainerInstanceSelect"
              >
                <el-option
                  v-for="inst in filteredInstances"
                  :key="inst.instance_id"
                  :label="instanceOptionLabel(inst)"
                  :value="inst.instance_id"
                />
              </el-select>
              <div v-if="form.productName && filteredInstances.length === 0" class="right-panel__hint">
                No {{ form.productName }} instances yet. Create one below.
              </div>
            </div>
            <div v-if="hasProductMismatchWarning" class="right-panel__type-warning">
              <AppIcon name="i-tabler-alert-triangle" />
              <span>Some bound instances don't match this node's product type</span>
            </div>

            <button
              v-if="!readonly"
              type="button"
              class="right-panel__create-btn"
              @click="openCreateInstance"
            >
              <AppIcon name="i-tabler-plus" />
              <span>New Instance</span>
            </button>

            <div v-if="form.instances.length" class="right-panel__instance-list">
              <div
                v-for="inst in form.instances"
                :key="inst.instanceId"
                class="right-panel__instance-item"
              >
                <div class="right-panel__instance-name">{{ inst.instanceName }}</div>
                <div v-if="instanceChannelLabel(inst)" class="right-panel__instance-channels">
                  <AppIcon name="i-tabler-antenna-bars-5" />
                  <span>{{ instanceChannelLabel(inst) }}</span>
                </div>
                <div v-else-if="inst.instanceId" class="right-panel__instance-channels right-panel__instance-channels--empty">
                  <AppIcon name="i-tabler-alert-triangle" />
                  <span>No routing channels configured</span>
                </div>
                <div class="right-panel__instance-actions">
                  <button type="button" class="right-panel__action-btn" @click="openInstanceDetail(inst.instanceId)">
                    <AppIcon name="i-tabler-file-text" />
                    <span>Detail</span>
                  </button>
                  <button type="button" class="right-panel__action-btn" @click="goPointsPage(inst)">
                    <AppIcon name="i-tabler-transform-point" />
                    <span>Points</span>
                  </button>
                  <button
                    v-if="!readonly"
                    type="button"
                    class="right-panel__action-btn right-panel__action-btn--danger"
                    @click="removeInstance(inst.instanceId)"
                  >
                    <AppIcon name="i-tabler-trash" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="right-panel__no-props">No device instances bound yet</div>
          </div>

        </template>

        <!-- Connection hint -->
        <div v-if="connectionHint" class="right-panel__connection-hint">
          <AppIcon name="i-tabler-git-branch" />
          <span>{{ connectionHint }}</span>
        </div>

        <!-- Appearance section -->
        <template v-if="!readonly">
          <div class="right-panel__divider">Appearance</div>
          <div class="right-panel__section">
            <div class="right-panel__field">
              <label class="right-panel__label">Color Theme</label>
              <div class="right-panel__colors">
                <div
                  v-for="c in COLOR_OPTIONS"
                  :key="c.value"
                  class="right-panel__color-dot"
                  :class="{ active: form.color === c.value }"
                  :style="{ backgroundColor: c.hex }"
                  :title="c.label"
                  @click="onColorChange(c.value)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="!readonly && selectedNode.type !== 'station'" class="right-panel__footer">
        <el-button
          v-if="canDetachFromContainer"
          v-permission="'engineer'"
          size="small"
          plain
          class="right-panel__detach-btn"
          @click="emit('detach-from-container', selectedNode.id)"
        >
          <AppIcon name="i-tabler-external-link" style="margin-right:4px" />
          Detach from Container
        </el-button>
        <el-button v-permission="'engineer'" type="danger" size="small" plain @click="emit('delete-node', selectedNode.id)">
          <AppIcon name="i-tabler-trash" style="margin-right:4px" />
          Delete Node
        </el-button>
      </div>
    </template>

    <div v-else class="right-panel__placeholder">
      <AppIcon name="i-tabler-click" class="right-panel__placeholder-icon" />
      <span>Click a node<br>to configure device instances</span>
    </div>

    <InstanceDetailDialog
      ref="instanceDialogRef"
      :product-options="productOptions"
      @submit="onInstanceDialogSubmit"
      @created="onInstanceCreated"
    />

    <PointsTablesDialog
      ref="pointsDialogRef"
      width="92%"
      dialog-class="dc-points-dialog--responsive"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, inject } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { getProducts, getInstanceChannelSummary } from '@/api/devicesManagement'
import InstanceDetailDialog from '@/views/Setting/Configuration/DeviceConfiguration/components/InstanceDetailDialog.vue'
import PointsTablesDialog from '@/views/Setting/Configuration/DeviceConfiguration/components/PointsTablesDialog.vue'
import type { ModelFlowNode, ModelInstanceBinding } from '@/types/visualModeling'
import { useVisualModelingStore } from '@/stores/visualModeling'
import {
  productsToModelOptions,
  DEFAULT_DEVICE_PRODUCTS,
  isBindableContainerProduct,
} from '@/constants/deviceProducts'
import { normalizeNodeInstances } from '@/utils/visualModeling'
import { MODELING_EDITOR_KEY } from '../modelingEditorContext'

const props = defineProps<{
  selectedNode: ModelFlowNode | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-node', node: ModelFlowNode): void
  (e: 'delete-node', id: string): void
  (e: 'detach-from-container', id: string): void
}>()

const store = useVisualModelingStore()
const editorCtx = inject(MODELING_EDITOR_KEY, null)
const pointsDialogRef = ref<InstanceType<typeof PointsTablesDialog> | null>(null)
const instanceDialogRef = ref<InstanceType<typeof InstanceDetailDialog> | null>(null)

const productOptions = ref<Array<{ label: string; value: string }>>([])
const instancesLoading = computed(() => store.instancesLoading)
const storeInstances = computed(() =>
  Array.isArray(store.instances) ? store.instances : [],
)

const selectedInstanceIds = ref<number[]>([])

const COLOR_OPTIONS = [
  { value: 'default', hex: '#607d8b', label: 'Default' },
  { value: 'blue',    hex: '#4a90d9', label: 'Blue' },
  { value: 'green',   hex: '#43a047', label: 'Green' },
  { value: 'orange',  hex: '#ef6c00', label: 'Orange' },
  { value: 'purple',  hex: '#8e24aa', label: 'Purple' },
  { value: 'teal',    hex: '#00897b', label: 'Teal' },
  { value: 'red',     hex: '#e53935', label: 'Red' },
]

const CONNECTION_HINTS: Record<string, string> = {
  'Station':         'Can connect to: ESS, Generator, Env, Load, EVChargingLoad, HVACLoad, Load_Three_Phase',
  'ESS':             'Can contain: Battery, PCS',
  'Generator':       'Can contain: Diesel, PV Inverter, PV DCDC, Voltage 485',
  'Battery':         'Child of ESS · or connect directly to Station',
  'PCS':             'Child of ESS · or connect directly to Station',
  'Diesel':          'Child of Generator · or connect directly to Station',
  'PVInverter':      'Child of Generator · or connect directly to Station',
  'PV DCDC':         'Child of Generator · or connect directly to Station',
  'Voltage485':      'Child of Generator · or connect directly to Station',
  'Env':             'Direct child of Station',
  'Load':            'Direct child of Station',
  'EVChargingLoad':  'Direct child of Station',
  'HVACLoad':        'Direct child of Station',
  'Load_Three_Phase':'Direct child of Station',
}

const form = ref({
  label: '',
  description: '',
  productName: '',
  parentName: '',
  color: 'default' as string,
  instances: [] as ModelInstanceBinding[],
})

const canBindInstances = computed(() => {
  const type = props.selectedNode?.type
  return type === 'product' || type === 'station' || type === 'group'
})

const canDetachFromContainer = computed(() => {
  const node = props.selectedNode
  return node?.type === 'product' && !!node.parentNode
})

const isContainerNode = computed(() => {
  const node = props.selectedNode
  if (!node || node.type !== 'group') return false
  const data = node.data as { isContainer?: boolean; productName?: string }
  return !!data.isContainer || isBindableContainerProduct(data.productName)
})

const instanceBindLabel = computed(() => 'Bind Instance')

const instanceBindPlaceholder = computed(() => 'Search and select instance')

const boundElsewhere = computed(() => {
  const nodeId = props.selectedNode?.id
  if (!nodeId || !editorCtx?.getBoundInstanceIdsExcluding) return new Set<number>()
  return editorCtx.getBoundInstanceIdsExcluding(nodeId)
})

const filteredInstances = computed(() => {
  const product = form.value.productName?.trim()
  const byProduct = !product
    ? storeInstances.value
    : storeInstances.value.filter(
        (i) => (i.product_name || '').trim() === product,
      )
  return byProduct.filter((i) => !boundElsewhere.value.has(i.instance_id))
})

function instanceOptionLabel(inst: {
  instance_id: number
  instance_name: string
  product_name?: string
}) {
  const name = inst.instance_name || `Instance #${inst.instance_id}`
  const pn = inst.product_name?.trim()
  if (pn && pn !== form.value.productName) {
    return `${name} (${pn})`
  }
  return name
}

function resolveInstanceName(instanceId: number): string {
  const fromStore = storeInstances.value.find((i) => i.instance_id === instanceId)
  if (fromStore?.instance_name) return fromStore.instance_name
  const bound = form.value.instances.find((i) => i.instanceId === instanceId)
  return bound?.instanceName || `Instance #${instanceId}`
}

const typeLabel = computed(() => {
  const m: Record<string, string> = { station: 'Station', product: 'Device', group: 'Container' }
  return m[props.selectedNode?.type ?? ''] ?? 'Node'
})

async function loadProductOptions() {
  try {
    const res = await getProducts()
    const list = res?.data?.products
    productOptions.value = productsToModelOptions(
      Array.isArray(list) && list.length ? list : DEFAULT_DEVICE_PRODUCTS,
    )
  } catch {
    productOptions.value = productsToModelOptions(DEFAULT_DEVICE_PRODUCTS)
  }
}

watch(
  () => props.selectedNode,
  (node) => {
    if (!node) return
    const normalized = normalizeNodeInstances(node.data)
    form.value.label       = node.data.label       ?? ''
    form.value.description = node.data.description ?? ''
    form.value.productName = node.data.productName  ?? ''
    form.value.parentName  = node.data.parentName   ?? ''
    form.value.color       = (node.data as any).color ?? 'default'
    form.value.instances = normalized.map((item) => ({
      ...item,
      instanceName: item.instanceName || resolveInstanceName(item.instanceId),
    }))
    let ids = form.value.instances.map((item) => item.instanceId)
    // 每个节点只允许绑定一个实例
    if (ids.length > 1) {
      ids = ids.slice(0, 1)
      form.value.instances = form.value.instances.slice(0, 1)
    }
    selectedInstanceIds.value = ids

    if (canBindInstances.value) {
      void store.loadInstances(true).then(() => {
        form.value.instances = buildInstancesFromIds(selectedInstanceIds.value)
      })
    }
  },
  { immediate: true },
)

function buildInstancesFromIds(ids: number[]): ModelInstanceBinding[] {
  return ids
    .map((id) => {
      const fromStore = storeInstances.value.find((i) => i.instance_id === id)
      const existing = form.value.instances.find((i) => i.instanceId === id)
      return {
        instanceId: id,
        instanceName:
          fromStore?.instance_name
          ?? existing?.instanceName
          ?? (id ? `Instance #${id}` : ''),
        productName: fromStore?.product_name ?? existing?.productName ?? form.value.productName,
      }
    })
    .filter((item) => item.instanceId)
}

function instanceChannelLabel(inst: ModelInstanceBinding): string | null {
  const nodeId = props.selectedNode?.id
  const ids = nodeId
    ? store.getLiveChannelIds(nodeId, inst.instanceId)
    : (inst.channelIds ?? [])
  if (!ids.length) return null
  return `Channels: ${ids.join(', ')}`
}

async function fetchAndFillChannelIds(instanceId: number): Promise<number[]> {
  const nodeId = props.selectedNode?.id
  if (nodeId) {
    const live = store.getLiveChannelIds(nodeId, instanceId)
    if (live.length) return live
  }
  try {
    const res = await getInstanceChannelSummary(instanceId)
    return res?.data?.channelIds ?? []
  } catch {
    return []
  }
}

async function buildInstancesWithChannels(ids: number[]): Promise<ModelInstanceBinding[]> {
  const base = buildInstancesFromIds(ids)
  const withChannels = await Promise.all(
    base.map(async (inst) => {
      const existing = form.value.instances.find(i => i.instanceId === inst.instanceId)
      // Only fetch if not already filled
      const channelIds = existing?.channelIds?.length
        ? existing.channelIds
        : await fetchAndFillChannelIds(inst.instanceId)
      return { ...inst, channelIds }
    })
  )
  return withChannels
}

async function onContainerInstanceSelect(val: number | undefined | null) {
  await onInstancesChange(val != null ? [Number(val)] : [])
}

async function onInstancesChange(ids: number[]) {
  if (props.readonly) return
  const taken = boundElsewhere.value
  const blocked = ids.filter((id) => taken.has(id))
  if (blocked.length) {
    ElMessage.warning('This instance is already bound to another node')
    return
  }
  selectedInstanceIds.value = ids
  form.value.instances = await buildInstancesWithChannels(ids)
  await store.loadChannelBindings(true)
  applyChanges()
}

function removeInstance(instanceId: number) {
  selectedInstanceIds.value = selectedInstanceIds.value.filter((id) => id !== instanceId)
  form.value.instances = form.value.instances.filter((item) => item.instanceId !== instanceId)
  applyChanges()
}

function openCreateInstance() {
  instanceDialogRef.value?.open(null, { productName: form.value.productName || undefined })
}

function openInstanceDetail(instanceId: number) {
  instanceDialogRef.value?.open(instanceId, { readOnly: props.readonly })
}

function goPointsPage(inst: ModelInstanceBinding) {
  const name = String(inst.instanceName || resolveInstanceName(inst.instanceId))
  pointsDialogRef.value?.open(inst.instanceId, name)
}

async function onInstanceDialogSubmit() {
  await store.loadInstances(true)
  syncInstancesFromStore()
}

async function onInstanceCreated(payload: {
  instance_id?: number
  instance_name: string
  product_name: string
}) {
  await store.loadInstances(true)

  let instanceId = payload.instance_id
  if (!instanceId) {
    const matched = store.instances.find(
      (i) =>
        i.instance_name === payload.instance_name &&
        i.product_name === payload.product_name,
    )
    instanceId = matched?.instance_id
  }

  if (!instanceId) return

  if (boundElsewhere.value.has(instanceId)) {
    ElMessage.warning('This instance is already bound to another node')
    return
  }

  // 单实例约束：新建后直接替换当前绑定
  selectedInstanceIds.value = [instanceId]
  form.value.instances = await buildInstancesWithChannels([instanceId])
  applyChanges()
}

function syncInstancesFromStore() {
  form.value.instances = buildInstancesFromIds(selectedInstanceIds.value)
  applyChanges()
}

function applyChanges() {
  if (props.readonly || !props.selectedNode) return
  const instances = form.value.instances.map((item) => ({ ...item }))
  const updated: ModelFlowNode = {
    ...props.selectedNode,
    data: {
      ...props.selectedNode.data,
      label: form.value.label,
      description: form.value.description,
      productName: form.value.productName,
      parentName: form.value.parentName,
      color: form.value.color,
      instances,
      instanceId: instances[0]?.instanceId,
      instanceName: instances[0]?.instanceName,
    },
  }
  emit('update-node', updated)
}

function onColorChange(value: string) {
  form.value.color = value
  applyChanges()
}

const connectionHint = computed(() => {
  const pn = form.value.productName
  return pn ? CONNECTION_HINTS[pn] ?? null : null
})

const hasProductMismatchWarning = computed(() => {
  const product = form.value.productName?.trim()
  if (!product) return false
  return selectedInstanceIds.value.some(id => {
    const inst = storeInstances.value.find(i => i.instance_id === id)
    return inst && (inst.product_name || '').trim() !== product
  })
})

onMounted(() => {
  loadProductOptions()
  void store.loadInstances(true)
  void store.loadChannelBindings(true)
})
</script>

<style lang="scss" scoped>
.right-panel {
  width: 0;
  overflow: hidden;
  transition: width 0.25s ease;
  background: rgba(255, 255, 255, 0.97);
  border-left: 1px solid rgba(15, 31, 61, 0.08);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.right-panel.right-panel--visible {
  width: 300px;
}

.right-panel__header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px 7px;
  border-bottom: 1px solid rgba(15, 31, 61, 0.08);
  flex-shrink: 0;
}

.right-panel__type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  color: #fff;
}

.right-panel__type-badge.right-panel__type-badge--station {
  background: #283593;
}

.right-panel__type-badge.right-panel__type-badge--product {
  background: #4a90d9;
}

.right-panel__type-badge.right-panel__type-badge--group {
  background: #8e24aa;
}

.right-panel__title {
  font-size: 13px;
  font-weight: 700;
  color: #0f1f3d;
  flex: 1;
}

.right-panel__spin {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.right-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.right-panel__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.right-panel__divider {
  font-size: 11px;
  font-weight: 700;
  color: #7f8c9a;
  padding: 4px 0 2px;
  border-bottom: 1px solid rgba(15, 31, 61, 0.08);
  display: flex;
  align-items: center;
  gap: 5px;
}

.right-panel__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.right-panel__label {
  font-size: 11px;
  font-weight: 600;
  color: #607080;
}

.right-panel__hint {
  font-size: 10px;
  color: #b0b8c4;
  margin-top: 2px;
  line-height: 1.4;
}

.right-panel__info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 12px;
  padding: 2px 0;
}

.right-panel__info-label {
  color: #7f8c9a;
  font-weight: 500;
}

.right-panel__info-val {
  color: #1a2438;
  font-weight: 600;
  text-align: right;
  word-break: break-all;
  max-width: 170px;
}

.right-panel__container-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(142, 36, 170, 0.06);
  border: 1px dashed rgba(142, 36, 170, 0.25);
  font-size: 11px;
  color: #7f8c9a;
  line-height: 1.5;
}

.right-panel__container-tip :deep(svg) {
  width: 16px;
  height: 16px;
  color: #8e24aa !important;
  flex-shrink: 0;
  margin-top: 1px;
}

.right-panel__create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border: 1px dashed rgba(74, 144, 217, 0.45);
  border-radius: 6px;
  background: rgba(74, 144, 217, 0.05);
  color: #4a90d9;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.right-panel__create-btn :deep(svg) {
  width: 14px;
  height: 14px;
  color: inherit !important;
}

.right-panel__create-btn:hover {
  background: rgba(74, 144, 217, 0.12);
  border-color: #4a90d9;
}

.right-panel__instance-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.right-panel__instance-item {
  border: 1px solid rgba(15, 31, 61, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  background: #f8fafc;
}

.right-panel__instance-name {
  font-size: 12px;
  font-weight: 700;
  color: #0f1f3d;
  word-break: break-all;
  margin-bottom: 4px;
}

.right-panel__instance-channels {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 10px;
  color: #4a90d9;
  margin-bottom: 6px;
  line-height: 1.35;
}

.right-panel__instance-channels :deep(svg) {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #4a90d9 !important;
}

.right-panel__instance-channels.right-panel__instance-channels--empty {
  color: #ef6c00;
}

.right-panel__instance-channels.right-panel__instance-channels--empty :deep(svg) {
  color: #ef6c00 !important;
}

.right-panel__instance-actions {
  display: flex;
  gap: 6px;
}

.right-panel__action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px;
  border: 1px solid rgba(15, 31, 61, 0.08);
  border-radius: 6px;
  background: #fff;
  color: #4a90d9;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 0;
}

.right-panel__action-btn :deep(svg) {
  width: 15px;
  height: 15px;
  color: inherit !important;
}

.right-panel__action-btn span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.right-panel__action-btn:hover {
  background: rgba(74, 144, 217, 0.08);
  border-color: rgba(74, 144, 217, 0.35);
}

.right-panel__action-btn.right-panel__action-btn--danger {
  color: #e53935;
}

.right-panel__action-btn.right-panel__action-btn--danger:hover {
  background: rgba(229, 57, 53, 0.06);
  border-color: rgba(229, 57, 53, 0.25);
}

.right-panel__no-props {
  font-size: 11px;
  color: #b0b8c4;
  text-align: center;
  padding: 6px 0;
}

.right-panel__footer {
  padding: 10px 12px;
  border-top: 1px solid rgba(15, 31, 61, 0.08);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.right-panel__footer .el-button {
  width: 100%;
  margin-left: 0 !important;
}

.right-panel__detach-btn {
  color: #4a90d9;
  border-color: rgba(74, 144, 217, 0.45);
}

.right-panel__placeholder {
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
  width: 300px;
}

.right-panel__placeholder-icon :deep(svg) {
  width: 32px;
  height: 32px;
  color: #b0b8c4 !important;
}

.right-panel__type-warning {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #ef6c00;
  padding: 4px 6px;
  border-radius: 5px;
  background: rgba(239, 108, 0, 0.08);
  border: 1px solid rgba(239, 108, 0, 0.2);

  :deep(svg) { width: 12px; height: 12px; color: #ef6c00 !important; }
}

.right-panel__connection-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 10px;
  color: #7f8c9a;
  padding: 4px 6px;
  border-radius: 5px;
  background: rgba(74, 144, 217, 0.06);
  line-height: 1.4;

  :deep(svg) { width: 12px; height: 12px; color: #4a90d9 !important; flex-shrink: 0; margin-top: 1px; }
}

.right-panel__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.right-panel__color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  flex-shrink: 0;

  &.active, &:hover {
    border-color: #0f1f3d;
    transform: scale(1.2);
  }
}
</style>
