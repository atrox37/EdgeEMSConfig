<template>
  <FormDialog
    ref="dialogRef"
    :title="viewMode === 'points' ? 'Points Table' : 'Routings Table'"
    :width="width"
    :dialog-class="dialogClass"
    :append-to-body="true"
    :before-close="handleDialogBeforeClose"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="voltage-class dc-points-dialog">
        <div class="rule-management__config-section">
          <div class="config-section__header">
            <!-- 视图模式切换器 - 移到tabs上方 -->
            <div v-if="!isEditing" class="config-section__controls">
              <div class="view-mode-switch">
                <span class="switch-label">View Mode:</span>
                <el-radio-group v-model="viewModeSwitch" class="el-radio-group--button">
                  <el-radio :label="false">Points</el-radio>
                  <el-radio :label="true">Routing</el-radio>
                </el-radio-group>
              </div>
            </div>
            <div class="config-section__tabs-wrapper">
              <LoadingBg :loading="globalStore.loading">
                <el-tabs v-model="activeTab" type="card" class="config-section__tabs">
                  <el-tab-pane v-if="viewMode === 'points'" label="property" name="property">
                    <DevicePointTablePoints
                      ref="propertyPointsRef"
                      category="property"
                      :points="propertyRows"
                      :original-points="originalPointsData.property"
                      :view-mode="viewMode"
                      :edit-filters="editFilters"
                      :is-editing="isEditing"
                      :publish-mode="false"
                    />
                  </el-tab-pane>
                  <el-tab-pane label="measurement" name="measurement">
                    <template v-if="viewMode === 'points'">
                      <DevicePointTablePoints
                        ref="measurementPointsRef"
                        category="measurement"
                        :points="measurementRows"
                        :original-points="originalPointsData.measurement"
                        :view-mode="viewMode"
                        :edit-filters="editFilters"
                        :is-editing="isEditing"
                        :publish-mode="isPublish && activeTab === 'measurement'"
                        @publish-change="
                          (dirty: boolean) => {
                            publishDirty = dirty
                          }
                        "
                        @toggle-publish="togglePublishMode"
                      />
                    </template>
                    <template v-else>
                      <DevicePointTableRouting
                        ref="measurementRoutingRef"
                        category="measurement"
                        :points="measurementRows"
                        :original-points="originalPointsData.measurement"
                        :view-mode="viewMode"
                        :edit-filters="editFilters"
                        :is-editing="isEditing"
                        :channels="channelsForRouting"
                      />
                    </template>
                  </el-tab-pane>
                  <el-tab-pane label="action" name="action">
                    <template v-if="viewMode === 'points'">
                      <DevicePointTablePoints
                        ref="actionPointsRef"
                        category="action"
                        :points="actionRows"
                        :original-points="originalPointsData.action"
                        :view-mode="viewMode"
                        :edit-filters="editFilters"
                        :is-editing="isEditing"
                        :publish-mode="isPublish && activeTab === 'action'"
                        @publish-change="
                          (dirty: boolean) => {
                            publishDirty = dirty
                          }
                        "
                        @toggle-publish="togglePublishMode"
                      />
                    </template>
                    <template v-else>
                      <DevicePointTableRouting
                        ref="actionRoutingRef"
                        category="action"
                        :points="actionRows"
                        :original-points="originalPointsData.action"
                        :view-mode="viewMode"
                        :edit-filters="editFilters"
                        :is-editing="isEditing"
                        :channels="channelsForRouting"
                      />
                    </template>
                  </el-tab-pane>
                </el-tabs>

                <!-- Status 筛选器：modified 复选，invalid 独立复选 -->
                <div v-if="isEditing" class="config-section__status-filter">
                  <el-checkbox-group v-model="statusCheckboxValue" class="status-checkbox-group">
                    <el-checkbox label="modified">modified</el-checkbox>
                  </el-checkbox-group>
                  <el-checkbox v-model="invalidChecked" class="status-invalid-checkbox">invalid</el-checkbox>
                </div>
              </LoadingBg>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <div class="dc-points-dialog__toolbar">
        <el-button v-if="!isPublish" @click="handleCancel">{{
          isEditing ? 'Cancel Edit' : 'Cancel'
        }}</el-button>
        <el-button
          v-if="viewMode === 'routing' && !isEditing && !isPublish"
          type="primary"
          @click="handleEdit"
          >Edit</el-button
        >

        <el-button v-if="isEditing" type="primary" :loading="submitLoading" @click="handleSubmit">Submit</el-button>

        <el-button
          v-if="!isEditing && isPublish && (activeTab === 'action' || activeTab === 'measurement')"
          type="primary"
          :disabled="!publishDirty"
          :loading="publishLoading"
          @click="handleSubmitPublish"
        >
          Submit Publish
        </el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, computed, readonly, provide, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 弹框宽度，支持百分比 */
    width?: string
    dialogClass?: string
  }>(),
  {
    width: '1400px',
    dialogClass: '',
  },
)
import { ElMessage, ElMessageBox } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import LoadingBg from '@/components/common/LoadingBg.vue'
import { getInstancePoints, executeAction, updateInstanceRouting } from '@/api/devicesManagement'
import { getAllChannels } from '@/api/channelsManagement'
import type {
  InstancePointList,
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import DevicePointTablePoints from './DevicePointTablePoints.vue'
import DevicePointTableRouting from './DevicePointTableRouting.vue'
import { InstanceNameKey, InstanceIdKey } from '@/utils/key'
import wsManager from '@/utils/websocket'
import { Request } from '@/utils/request'
import { useGlobalStore } from '@/stores/global'
const globalStore = useGlobalStore()
const dialogRef = ref()
const activeTab = ref<'measurement' | 'action' | 'property'>('property')
const isEditing = ref(false)
const isPublish = ref(false)
const instanceName = ref('')
const instanceId = ref<number>(0)
const measurementRows = ref<InstanceMeasurementItem[]>([])
const actionRows = ref<InstanceActionItem[]>([])
const propertyRows = ref<InstancePropertyItem[]>([])
const loading = computed(() => globalStore.loading)
const submitLoading = ref(false)
const publishLoading = ref(false)
// 通道列表（用于编辑模式）
const channelsForRouting = ref<Array<{ id: number; name: string }>>([])
// 页面订阅ID
const pageId = ref<string>('')
provide(InstanceNameKey, readonly(instanceName))
provide(InstanceIdKey, readonly(instanceId))
// 视图模式与筛选
const viewModeSwitch = ref(false) // false=points, true=routing
const viewMode = computed(() => (viewModeSwitch.value ? 'routing' : 'points'))
const editFilters = ref<string[]>([])
// Status 筛选器：modified 复选，invalid 独立复选
const statusCheckboxValue = ref<string[]>([])
const invalidChecked = ref(false)
watch(
  [statusCheckboxValue, invalidChecked],
  () => {
    if (invalidChecked.value) {
      editFilters.value = ['invalid']
    } else if (statusCheckboxValue.value.length > 0) {
      editFilters.value = [statusCheckboxValue.value[0]]
    } else {
      editFilters.value = []
    }
  },
  { immediate: true, deep: true },
)
const publishDirty = ref(false)
// 原始基线
const originalPointsData = ref<{
  measurement: InstanceMeasurementItem[]
  action: InstanceActionItem[]
  property: InstancePropertyItem[]
}>({
  measurement: [],
  action: [],
  property: [],
})
// 子表 refs
const measurementPointsRef = ref<any>()
const actionPointsRef = ref<any>()
const propertyPointsRef = ref<any>()
const measurementRoutingRef = ref<any>()
const actionRoutingRef = ref<any>()
const propertyRoutingRef = ref<any>()
async function open(id: number, name: string) {
  instanceId.value = id
  instanceName.value = name

  // 先重置状态
  isEditing.value = false
  isPublish.value = false
  publishDirty.value = false
  editFilters.value = []
  statusCheckboxValue.value = []
  invalidChecked.value = false
  // 默认 Points 视图和 property Tab
  viewModeSwitch.value = false
  activeTab.value = 'property'

  // 先打开对话框
  dialogRef.value.dialogVisible = true

  // 先取消上一个订阅
  if (pageId.value) {
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {}
    pageId.value = ''
  }
  try {
    const res = await getInstancePoints(id)
    if (res.success) {
      const data = res.data as InstancePointList
      if (data.measurements) measurementRows.value = Object.values(data.measurements)
      if (data.actions) actionRows.value = Object.values(data.actions)
      if (data.properties) propertyRows.value = Object.values(data.properties)
      originalPointsData.value = {
        measurement: JSON.parse(JSON.stringify(measurementRows.value)),
        action: JSON.parse(JSON.stringify(actionRows.value)),
        property: JSON.parse(JSON.stringify(propertyRows.value)),
      }
    }
  } catch {
    console.error('Failed to load points data')
  }

  // 数据加载完成后，建立 WebSocket 订阅（用本地 id 参数，避免 await 后 instanceId.value 被覆盖）
  pageId.value = `inst-${id}-${Date.now()}`
  wsManager.subscribe(
    {
      source: 'inst',
      channels: [id] as any,
      dataTypes: ['A', 'M', 'P'] as any,
      interval: 1000,
    } as any,
    {
      onBatchDataUpdate: (payload: any) => {
        if (!payload?.updates?.length) return
        payload.updates.forEach((upd: any) => {
          if (Number(upd.channel_id) !== id) return
          const dt = String(upd.data_type || '').toUpperCase()
          const values = upd.values || {}
          const ts = upd.ts || {}
          const map: Record<string, number> = {}
          Object.keys(values).forEach((k) => (map[k] = Number(values[k])))
          if (dt === 'M') {
            measurementPointsRef.value?.applyRealtimeValues?.(map, ts)
          } else if (dt === 'A') {
            actionPointsRef.value?.applyRealtimeValues?.(map, ts)
          } else if (dt === 'P') {
            propertyPointsRef.value?.applyRealtimeValues?.(map, ts)
          }
        })
      },
    },
    pageId.value,  // ← 关键：必须传 pageId，否则 wsManager 用自动生成 key，unsubscribe 永远找不到
  )
}

function close() {
  dialogRef.value.dialogVisible = false
}

// Dialog 关闭前拦截：编辑模式有修改时提醒
const handleDialogBeforeClose = async (done: () => void) => {
  // 如果正在编辑，检查是否有修改
  if (isEditing.value) {
    const hasChanges =
      measurementRoutingRef.value?.hasChanges?.() || actionRoutingRef.value?.hasChanges?.()
    if (hasChanges) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved changes. Do you want to discard them?',
          'Unsaved Changes',
          {
            confirmButtonText: 'Discard',
            cancelButtonText: 'Cancel',
            type: 'warning',
            center: true,
            showClose: false,
          },
        )
        isEditing.value = false
        isPublish.value = false
        publishDirty.value = false
        measurementRoutingRef.value?.clearImportedFileName?.()
        actionRoutingRef.value?.clearImportedFileName?.()
        if (pageId.value) {
          try {
            wsManager.unsubscribe(pageId.value)
          } catch {}
          pageId.value = ''
        }
        done()
      } catch {
        // 用户取消，不做任何操作
        return
      }
    } else {
      isEditing.value = false
      isPublish.value = false
      publishDirty.value = false
      measurementRoutingRef.value?.clearImportedFileName?.()
      actionRoutingRef.value?.clearImportedFileName?.()
      if (pageId.value) {
        try {
          wsManager.unsubscribe(pageId.value)
        } catch {}
        pageId.value = ''
      }
      done()
    }
    return
  }

  // 非编辑模式，直接关闭
  if (pageId.value) {
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {}
    pageId.value = ''
  }
  done()
}

async function handleClose() {
  // 关闭后的清理工作（如果需要）
  isEditing.value = false
  isPublish.value = false
  publishDirty.value = false
}

async function handleCancel() {
  if (isEditing.value) {
    // 检查是否有修改
    const hasChanges =
      measurementRoutingRef.value?.hasChanges?.() || actionRoutingRef.value?.hasChanges?.()
    if (hasChanges) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved changes. Do you want to discard them?',
          'Unsaved Changes',
          {
            confirmButtonText: 'Discard',
            cancelButtonText: 'Cancel',
            type: 'warning',
            center: true,
            showClose: false,
          },
        )
        isEditing.value = false
        editFilters.value = []
        statusCheckboxValue.value = []
        invalidChecked.value = false
        measurementRoutingRef.value?.clearImportedFileName?.()
        actionRoutingRef.value?.clearImportedFileName?.()
      } catch {
        // 用户取消，不做任何操作
        return
      }
    } else {
      isEditing.value = false
      editFilters.value = []
      statusCheckboxValue.value = []
      invalidChecked.value = false
      measurementRoutingRef.value?.clearImportedFileName?.()
      actionRoutingRef.value?.clearImportedFileName?.()
    }
  } else {
    close()
  }
}

// 加载通道列表（用于编辑模式）
async function loadChannelsForRouting() {
  try {
    const res = await getAllChannels()
    const list = Array.isArray(res?.data?.list)
      ? res.data.list
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? (res as any)
          : []
    channelsForRouting.value = (list as any[])
      .map((it: any) => ({
        id: Number(it.id),
        name: String(it.name || ''),
      }))
      .filter((x) => Number.isFinite(x.id) && x.id > 0 && x.name)
  } catch (error) {
    console.error('Failed to load channels:', error)
    channelsForRouting.value = []
  }
}

const handleEdit = async () => {
  isEditing.value = true
  editFilters.value = []
  statusCheckboxValue.value = []
  invalidChecked.value = false
  // 进入编辑模式时加载通道列表
  await loadChannelsForRouting()
}
const handleSubmit = async () => {
  if (viewMode.value !== 'routing') {
    isEditing.value = false
    return
  }
  const invalidTabs: Array<'measurement' | 'action'> = []
  if (measurementRoutingRef.value?.hasInvalid?.()) invalidTabs.push('measurement')
  if (actionRoutingRef.value?.hasInvalid?.()) invalidTabs.push('action')
  if (invalidTabs.length > 0) {
    ElMessage.warning('Routing has invalid data, please correct and submit again')
    invalidChecked.value = true
    activeTab.value = invalidTabs[0]
    return
  }
  const measurementMappings = measurementRoutingRef.value?.getEditedData?.() || []
  const actionMappings = actionRoutingRef.value?.getEditedData?.() || []
  const mappings = [...measurementMappings, ...actionMappings]
  if (!mappings.length) {
    ElMessage.info('No routing changes to submit')
    return
  }
  const toRoutingItem = (item: any, pointType: 'M' | 'A') => ({
    channel_id: Number(item.routing.channel_id),
    channel_point_id: Number(item.routing.channel_point_id),
    four_remote: String(item.routing.channel_type || '').toUpperCase(),
    point_id: Number(item.point_id),
    point_type: pointType,
    enabled: !!item.routing.enabled,
  })
  const routingPayload = [
    ...measurementMappings.map((item: any) => toRoutingItem(item, 'M')),
    ...actionMappings.map((item: any) => toRoutingItem(item, 'A')),
  ]
  submitLoading.value = true
  try {
    const res = await updateInstanceRouting(instanceId.value, routingPayload)
    if (res.success) {
      ElMessage.success('Routing updated successfully')
      isEditing.value = false
      editFilters.value = []
      statusCheckboxValue.value = []
      invalidChecked.value = false
      try {
        const resp = await getInstancePoints(instanceId.value)
        if (resp.success) {
          const data = resp.data as InstancePointList
          measurementRows.value = data.measurements ? Object.values(data.measurements) : []
          actionRows.value = data.actions ? Object.values(data.actions) : []
          propertyRows.value = data.properties ? Object.values(data.properties) : []
          originalPointsData.value = {
            measurement: JSON.parse(JSON.stringify(measurementRows.value)),
            action: JSON.parse(JSON.stringify(actionRows.value)),
            property: JSON.parse(JSON.stringify(propertyRows.value)),
          }
        }
      } catch {
        console.error('Failed to refresh points data')
      }
    }
  } finally {
    submitLoading.value = false
  }
}
const togglePublishMode = async () => {
  if (isPublish.value) {
    if (publishDirty.value) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved publish values. Do you want to discard them?',
          'Unsaved Changes',
          { confirmButtonText: 'Discard', cancelButtonText: 'Cancel', type: 'warning', center: true, showClose: false },
        )
        isPublish.value = false
        publishDirty.value = false
        if (activeTab.value === 'action') {
          actionPointsRef.value?.resetPublish?.()
        } else if (activeTab.value === 'measurement') {
          measurementPointsRef.value?.resetPublish?.()
        }
      } catch {
        return
      }
    } else {
      isPublish.value = false
      publishDirty.value = false
      if (activeTab.value === 'action') {
        actionPointsRef.value?.resetPublish?.()
      } else if (activeTab.value === 'measurement') {
        measurementPointsRef.value?.resetPublish?.()
      }
    }
  } else {
    if (activeTab.value !== 'action' && activeTab.value !== 'measurement')
      activeTab.value = 'action'
    isPublish.value = true
    publishDirty.value = false
    if (activeTab.value === 'action') {
      actionPointsRef.value?.resetPublish?.()
    } else if (activeTab.value === 'measurement') {
      measurementPointsRef.value?.resetPublish?.()
    }
  }
}
const handleSubmitPublish = async () => {
  const sourceRef =
    activeTab.value === 'action'
      ? actionPointsRef
      : activeTab.value === 'measurement'
        ? measurementPointsRef
        : null
  const cmds = sourceRef?.value?.getPublishCommands?.() || []
  if (!Array.isArray(cmds) || cmds.length === 0) return
  publishLoading.value = true
  try {
    for (const { id, value } of cmds) {
      await executeAction(instanceId.value, { point_id: String(id), value })
    }
    publishDirty.value = false
    isPublish.value = false
    if (activeTab.value === 'action') {
      actionPointsRef.value?.resetPublish?.()
    } else if (activeTab.value === 'measurement') {
      measurementPointsRef.value?.resetPublish?.()
    }
  } finally {
    publishLoading.value = false
  }
}

defineExpose({ open, close })

// 当在 Points 模式下位于 property 标签，切换到 Routing 模式时默认跳到 measurement
watch(
  () => viewMode.value,
  (mode) => {
    if (mode === 'routing' && activeTab.value === 'property') {
      activeTab.value = 'measurement'
    }
  },
)
</script>

<style scoped lang="scss">
.voltage-class {
  .dc-points-dialog {
    .dc-points-dialog__toolbar {
      display: flex;
      gap: 8px;
    }
  }
  :deep(.el-tabs__content) {
    position: static;
  }
  .rule-management__config-section {
    .config-section__header {
      position: relative;

      .config-section__controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 15px;
        margin-bottom: 10px;
        .view-mode-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          .switch-label {
            font-size: 18px;
            color: #fff;
          }
        }
        .edit-filters {
          :deep(.el-checkbox-group) {
            display: flex;
            gap: 8px;
          }
          :deep(.el-checkbox) {
            color: #fff;
            .el-checkbox__label {
              font-size: 12px;
            }
          }
        }
      }

      .config-section__tabs-wrapper {
        position: relative;
        min-height: 0;

        .config-section__tabs {
          width: 100%;
          padding: 0 20px;
          // 确保 tab header 有相对定位，以便 Status 筛选器可以相对于它定位
          :deep(.el-tabs__header) {
            position: relative;
          }
        }

        .config-section__status-filter {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 10;
          // 与 tab 标签对齐（tab 标签的高度通常是 40px 左右）
          height: 40px;
          line-height: 40px;

          .status-checkbox-group {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .status-invalid-checkbox {
            margin-left: 4px;
          }
          :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
            border-color: #fff !important;
          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
.dc-points-dialog--responsive.el-dialog {
  width: 92% !important;
  max-width: 92vw;
  height: 82vh;
  max-height: 82vh;
  margin-top: 4vh !important;
  margin-bottom: 4vh !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .el-dialog__header,
.dc-points-dialog--responsive .el-dialog__footer {
  flex-shrink: 0;
}

.dc-points-dialog--responsive .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  height: calc(82vh - 132px);
  padding-top: 8px;
  padding-bottom: 8px;
}

.dc-points-dialog--responsive .dc-points-dialog {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .rule-management__config-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .config-section__header {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .config-section__controls {
  flex-shrink: 0;
}

.dc-points-dialog--responsive .config-section__tabs-wrapper {
  flex: 1;
  min-height: 0 !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .config-section__tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .config-section__tabs .el-tabs__header {
  flex-shrink: 0;
  margin-bottom: 0;
}

.dc-points-dialog--responsive .config-section__tabs .el-tabs__content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dc-points-dialog--responsive .config-section__tabs .el-tab-pane {
  height: 100%;
  overflow: hidden;
}

.dc-points-dialog--responsive .device-point-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dc-points-dialog--responsive .device-point-table .table-action-controls {
  flex-shrink: 0;
}

.dc-points-dialog--responsive .device-point-table .point-table__wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.dc-points-dialog--responsive .device-point-table .point-table__pagination {
  flex-shrink: 0;
}
</style>
