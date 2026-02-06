<template>
  <div class="voltage-class points-tables-page">
    <!-- Page Header -->
    <el-page-header @back="handleBack" class="points-tables-page__header">
      <template #content>
        <div class="points-tables-page__header-content">
          <span class="points-tables-page__header-title">{{ pageTitle }}</span>
          <!-- 模式切换下拉框 -->
          <el-select
            v-if="!isEditing"
            v-model="viewModeSwitch"
            class="points-tables-page__view-mode-select"
            @change="handleViewModeChange"
          >
            <el-option label="Points" :value="false" />
            <el-option label="Routing" :value="true" />
          </el-select>
        </div>
      </template>
    </el-page-header>

    <div class="points-tables-page__content">
      <div class="voltage-class rule-management__expand-content">
        <div class="config-section__tabs-wrapper">
          <el-tabs
            v-model="activeTab"
            type="card"
            :before-leave="handleBeforeLeave"
            @tab-change="handleTabChange"
            class="config-section__tabs"
          >
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
                :loading="globalStore.loading"
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
                  :loading="globalStore.loading"
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
                  :loading="globalStore.loading"
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
                  :loading="globalStore.loading"
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
                  :loading="globalStore.loading"
                />
              </template>
            </el-tab-pane>
          </el-tabs>

          <!-- Status 筛选器 -->
          <div v-if="isEditing" class="config-section__status-filter">
            <el-checkbox-group
              v-model="statusFilterValue"
              @change="handleStatusFilterChange"
              class="status-checkbox-group"
            >
              <el-checkbox v-for="option in statusFilterOptions" :key="option.value" :label="option.value">
                {{ option.label }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="points-tables-page__footer">
      <el-button v-if="!isPublish" @click="handleCancel">
        {{ isEditing ? 'Cancel Edit' : 'Cancel' }}
      </el-button>
      <el-button v-if="viewMode === 'routing' && !isEditing && !isPublish" type="primary" @click="handleEdit">
        Edit
      </el-button>
      <IconButton v-if="isEditing" type="primary" :icon="submitIcon" text="Submit" @click="handleSubmit" />
      <el-button
        v-if="!isEditing && isPublish && (activeTab === 'action' || activeTab === 'measurement')"
        type="primary"
        :disabled="!publishDirty"
        @click="handleSubmitPublish"
      >
        Submit Execute
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, onMounted, onUnmounted, ref, provide, readonly } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import DevicePointTablePoints from './components/DevicePointTablePoints.vue'
import DevicePointTableRouting from './components/DevicePointTableRouting.vue'
import IconButton from '@/components/common/IconButton.vue'
import tableSubmitIcon from '@/assets/icons/btn-submit.svg'
// @ts-ignore - SVG导入类型问题
const submitIcon: string = tableSubmitIcon
import { getInstancePoints, executeAction, updateInstanceRouting } from '@/api/devicesManagement'
import { getAllChannels } from '@/api/channelsManagement'
import type {
  InstancePointList,
  InstanceActionItem,
  InstanceMeasurementItem,
  InstancePropertyItem,
} from '@/types/deviceConfiguration'
import { InstanceNameKey, InstanceIdKey } from '@/utils/key'
import wsManager from '@/utils/websocket'
import { useGlobalStore } from '@/stores/global'
const globalStore = useGlobalStore()

const route = useRoute()
const router = useRouter()

const isEditing = ref(false)
const isPublish = ref(false)
const publishDirty = ref(false)
const activeTab = ref<'measurement' | 'action' | 'property'>('property')
const instanceName = ref('')
const instanceId = ref<number>(0)
const measurementRows = ref<InstanceMeasurementItem[]>([])
const actionRows = ref<InstanceActionItem[]>([])
const propertyRows = ref<InstancePropertyItem[]>([])
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
// Status 筛选器：使用 checkbox-group 但限制为单选
const statusFilterValue = ref<string[]>([])
// Status 筛选选项：Points 显示完整状态，Routing 仅显示 modified/invalid
const statusFilterOptions = computed(() => {
  if (viewMode.value === 'points') {
    return [
      { label: 'modified', value: 'modified' },
      { label: 'added', value: 'added' },
      { label: 'deleted', value: 'deleted' },
      { label: 'invalid', value: 'invalid' },
    ]
  }
  return [
    { label: 'modified', value: 'modified' },
    { label: 'invalid', value: 'invalid' },
  ]
})
// Status 筛选器变化处理：限制为单选
const handleStatusFilterChange = (values: string[]) => {
  // 限制为单选：如果选择了多个，只保留最后一个
  if (values.length > 1) {
    const lastValue = values[values.length - 1]
    statusFilterValue.value = [lastValue]
    editFilters.value = [lastValue]
  } else {
    editFilters.value = values
  }
}
// 监听 editFilters 变化，同步到 statusFilterValue（用于外部设置时同步）
watch(
  () => editFilters.value,
  (val) => {
    if (Array.isArray(val) && val.length > 0) {
      // 如果 editFilters 有值，同步到 statusFilterValue
      const currentValue = statusFilterValue.value
      if (currentValue.length === 0 || currentValue[0] !== val[0]) {
        statusFilterValue.value = [val[0]]
      }
    } else {
      // 如果 editFilters 为空，清空 statusFilterValue
      statusFilterValue.value = []
    }
  },
  { immediate: true },
)
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

// 页面标题
const pageTitle = computed(() => {
  const modeLabel = viewMode.value === 'points' ? 'Points' : 'Routing'
  const namePart = instanceName.value ? ` - ${instanceName.value}` : ''
  return `Points Tables - ${modeLabel}${namePart}`
})

// 返回处理
const handleBack = () => {
  router.push('/modelConfiguration')
}

// 模式切换处理
const handleViewModeChange = () => {
  // 模式切换时重置筛选
  editFilters.value = []
  statusFilterValue.value = []
}

// 根据激活 tab 获取对应表格实例
const pointsTableRefsByTab = {
  measurement: measurementPointsRef,
  action: actionPointsRef,
  property: propertyPointsRef,
}
const getCurrentPointsRef = () => {
  return pointsTableRefsByTab[activeTab.value] || null
}
const resetPublishForTab = (tab: 'measurement' | 'action' | 'property') =>
  pointsTableRefsByTab[tab]?.value?.resetPublish?.()
const resetPublishAll = () => {
  ;(['measurement', 'action', 'property'] as Array<'measurement' | 'action' | 'property'>).forEach(
    (tab) => {
      resetPublishForTab(tab)
    },
  )
}

// Tab 切换：保持发布状态与提示一致
const handleTabChange = () => {
  if (isPublish.value) {
    publishDirty.value = !!getCurrentPointsRef()?.value?.hasPublishChanges?.()
  }
}

// Tabs 切换拦截：批量发布中如有修改则提示；确认后切换并退出批量发布
const handleBeforeLeave = async () => {
  if (!isPublish.value) return true

  if (publishDirty.value) {
    try {
      await ElMessageBox.confirm(
        'You have unsaved publish values. Do you want to switch tabs?',
        'Confirm Switch',
        {
          confirmButtonText: 'Switch',
          cancelButtonText: 'Stay',
          type: 'warning',
        },
      )
      // 用户确认切换：清空当前 tab 的发布值并退出批量发布
      resetPublishForTab(activeTab.value)
      publishDirty.value = false
      isPublish.value = false
      return true
    } catch {
      // 取消切换，保持原 Tab
      return false
    }
  }

  // 无修改：直接退出批量发布并允许切换
  isPublish.value = false
  return true
}

// 切换发布模式
const togglePublishMode = async () => {
  if (isPublish.value) {
    if (publishDirty.value) {
      try {
        await ElMessageBox.confirm(
          'You have unsaved publish values. Do you want to discard them?',
          'Unsaved Changes',
          {
            confirmButtonText: 'Discard',
            cancelButtonText: 'Cancel',
            type: 'warning',
          },
        )
        // 用户确认放弃
        isPublish.value = false
        publishDirty.value = false
        resetPublishAll()
      } catch {
        // 用户取消，不做任何操作
        return
      }
    } else {
      isPublish.value = false
      publishDirty.value = false
      resetPublishAll()
    }
  } else {
    // 开启发布模式：清空当前 tab 的发布值
    isPublish.value = true
    resetPublishForTab(activeTab.value)
    publishDirty.value = false
  }
}

// 提交发布
const handleSubmitPublish = async () => {
  const activeRef = getCurrentPointsRef()
  const commands = activeRef?.value?.getPublishCommands?.()

  if (!Array.isArray(commands) || commands.length === 0) return
  for (const { id, value } of commands) {
    await executeAction(instanceId.value, { point_id: String(id), value })
  }
  publishDirty.value = false
  isPublish.value = false
  activeRef?.value?.resetPublish?.()
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
  statusFilterValue.value = []
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
    // 自动切换状态筛选为 invalid，并跳转到首个有问题的 Tab
    editFilters.value = ['invalid']
    statusFilterValue.value = ['invalid']
    activeTab.value = invalidTabs[0]
    return
  }
  const mappings = [
    ...(measurementRoutingRef.value?.getEditedData?.() || []),
    ...(actionRoutingRef.value?.getEditedData?.() || []),
  ]
  if (!mappings.length) {
    ElMessage.info('No routing changes to submit')
    return
  }
  const routingPayload = mappings.map((item: any) => ({
    channel_id: Number(item.routing.channel_id),
    channel_point_id: Number(item.routing.channel_point_id),
    four_remote: String(item.routing.channel_type || '').toUpperCase(),
    point_id: Number(item.point_id),
  }))
  const res = await updateInstanceRouting(instanceId.value, routingPayload)
  if (res.success) {
    ElMessage.success('Routing updated successfully')
    isEditing.value = false
    // 刷新基线
    editFilters.value = []
    statusFilterValue.value = []
    await refreshPointsBaseline()
  }
}

const refreshPointsBaseline = async () => {
  try {
    const res = await getInstancePoints(instanceId.value)
    if (res.success) {
      const data = res.data as InstancePointList
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

// 取消处理
const handleCancel = async () => {
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
          },
        )
        isEditing.value = false
        editFilters.value = []
        statusFilterValue.value = []
        measurementRoutingRef.value?.clearImportedFileName?.()
        actionRoutingRef.value?.clearImportedFileName?.()
      } catch {
        // 用户取消，不做任何操作
        return
      }
    } else {
      isEditing.value = false
      editFilters.value = []
      statusFilterValue.value = []
      measurementRoutingRef.value?.clearImportedFileName?.()
      actionRoutingRef.value?.clearImportedFileName?.()
    }
    return
  }

  // 如果处于发布模式且有未提交的值，提醒用户
  if (isPublish.value && publishDirty.value) {
    try {
      await ElMessageBox.confirm(
        'You have unsaved publish values. Do you want to submit them before closing?',
        'Unsaved Changes',
        {
          confirmButtonText: 'Submit',
          cancelButtonText: 'Discard',
          type: 'warning',
        },
      )
      // 用户选择提交
      await handleSubmitPublish()
      handleBack()
    } catch {
      // 用户选择放弃或取消
      resetPublishAll()
      publishDirty.value = false
      isPublish.value = false
      handleBack()
    }
  } else {
    handleBack()
  }
}

// 初始化数据
const initData = async () => {
  const id = route.query.id as string
  const name = route.query.name as string
  if (!id) {
    ElMessage.error('Instance ID is required')
    handleBack()
    return
  }

  instanceId.value = Number(id)
  if (name) instanceName.value = name

  // 重置状态
  isEditing.value = false
  isPublish.value = false
  publishDirty.value = false
  editFilters.value = []
  statusFilterValue.value = []
  // 默认 Points 视图和 property Tab
  viewModeSwitch.value = false
  activeTab.value = 'property'

  // 先取消上一个订阅
  if (pageId.value) {
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {}
    pageId.value = ''
  }

  await refreshPointsBaseline()

  // 数据加载完成后，建立 WebSocket 订阅
  pageId.value = `inst-${instanceId.value}-${Date.now()}`
  wsManager.subscribe(
    {
      source: 'inst',
      channels: [instanceId.value] as any,
      dataTypes: ['A', 'M', 'P'] as any,
      interval: 1000,
    } as any,
    {
      onBatchDataUpdate: (payload: any) => {
        if (!payload?.updates?.length) return
        payload.updates.forEach((upd: any) => {
          if (Number(upd.channel_id) !== Number(instanceId.value)) return
          const dt = String(upd.data_type || '').toUpperCase()
          const values = upd.values || {}
          const map: Record<string, number> = {}
          Object.keys(values).forEach((k) => (map[k] = Number(values[k])))
          if (dt === 'M') {
            measurementPointsRef.value?.applyRealtimeValues?.(map)
          } else if (dt === 'A') {
            actionPointsRef.value?.applyRealtimeValues?.(map)
          } else if (dt === 'P') {
            propertyPointsRef.value?.applyRealtimeValues?.(map)
          }
        })
      },
    },
  )
}

onMounted(() => {
  initData()
})

onUnmounted(() => {
  // 关闭时取消页面订阅
  if (pageId.value) {
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {}
    pageId.value = ''
  }
})

// 当在 Points 模式下位于 property 标签，切换到 Routing 模式时默认跳到 measurement
watch(
  () => viewMode.value,
  (mode) => {
    if (mode === 'routing' && activeTab.value === 'property') {
      activeTab.value = 'measurement'
    }
  },
)

// 监听路由变化
watch(
  () => route.query,
  () => {
    initData()
  },
  { deep: true },
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.voltage-class.points-tables-page {
  height: 100%;
  display: flex;
  flex-direction: column;

  .points-tables-page__header {
    margin-bottom: 20px;

    .points-tables-page__header-content {
      display: flex;
      align-items: center;
      gap: 20px;

      .points-tables-page__header-title {
        font-size: $font-size-large;
        font-weight: $font-weight-semibold;
        color: $text-color-primary;
      }

      .points-tables-page__view-mode-select {
        width: 150px;
      }
    }
  }

  .points-tables-page__content {
    flex: 1;
    overflow: hidden;
    padding: 20px 20px 10px 20px;
    display: flex;
    flex-direction: column;
  }

  .points-tables-page__footer {
    padding: 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

.voltage-class .rule-management__expand-content {
  height: 100%;

  .config-section__tabs-wrapper {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .config-section__tabs {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      // 确保 tab header 有相对定位，以便 Status 筛选器可以相对于它定位
      :deep(.el-tabs__header) {
        position: relative;
        flex-shrink: 0;
      }

      :deep(.el-tabs__content) {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;

        .el-tab-pane {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
      }
    }

    .config-section__status-filter {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 10;
      // 与 tab 标签对齐（tab 标签的高度通常是 40px 左右）
      height: 40px;
      line-height: 40px;

      .filter-label {
        font-size: 14px;
        color: #fff;
        white-space: nowrap;
      }

      .status-checkbox-group {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
    }
  }
}

:deep(.el-tabs__content) {
  position: static;
}

/* 通用：操作列中的错误提示图标样式（编辑态下无效行） */
.voltage-class .point-table {
  .point-table__operation-cell {
    .point-table__error-tip {
      color: #f56c6c;
      font-size: 18px;
      margin-right: 4px;
    }
  }
}

:deep(.el-table td) {
  padding: 9px 12px;
}

:deep(.el-table .cell) {
  height: 32px;
  line-height: 32px;
}
</style>
