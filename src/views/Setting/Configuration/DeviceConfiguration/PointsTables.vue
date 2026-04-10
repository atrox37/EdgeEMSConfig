<template>
  <div class="voltage-class points-tables-page">
    <!-- Page Header -->
    <el-page-header @back="handleBack" class="points-tables-page__header">
      <template #content>
        <div class="points-tables-page__header-content">
                    <!-- 右侧实例名称（样式与标题一致；编辑模式下不显示，避免红色焦点区域） -->
                    <span v-if="instanceName" class="points-tables-page__channel-name">
            {{ instanceName }} -&nbsp;
          </span>
          <!-- 模式切换下拉菜单：首次打开默认为 Points Table -->
          <el-dropdown
            v-if="!isEditing"
            trigger="click"
            class="points-tables-page__view-mode-dropdown"
            @command="handleDropdownCommand"
          >
            <span class="points-tables-page__dropdown-trigger">
              {{ viewMode === 'points' ? 'Points Table' : 'Routings Table' }}
              <AppIcon name="i-tabler-chevron-down" className="el-icon--right" />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="points">Points Table</el-dropdown-item>
                <el-dropdown-item command="routing">Routings Table</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span v-else class="points-tables-page__header-title"> {{ viewMode === 'points' ? 'Points Table' : 'Routings Table' }}</span>

        </div>
      </template>
    </el-page-header>

    <div class="points-tables-page__content">
      <div class="voltage-class rule-management__expand-content">
        <div class="config-section__tabs-wrapper">
          <el-tabs
            v-model="activeTab"
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

          <!-- Status 筛选器：modified/added/deleted 多选框互斥，invalid 独立复选 -->
          <div v-if="isEditing" class="config-section__status-filter">
            <el-checkbox-group v-model="statusCheckboxValue" class="status-checkbox-group" @change="handleStatusCheckboxChange">
              <el-checkbox v-if="viewMode === 'points'" label="modified">modified</el-checkbox>
              <el-checkbox v-if="viewMode === 'points'" label="added">added</el-checkbox>
              <el-checkbox v-if="viewMode === 'points'" label="deleted">deleted</el-checkbox>
              <el-checkbox v-if="viewMode === 'routing'" label="modified">modified</el-checkbox>
            </el-checkbox-group>
            <el-checkbox v-model="invalidChecked" class="status-invalid-checkbox">invalid</el-checkbox>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="points-tables-page__footer">
      <el-button v-if="isEditing" @click="handleCancelEdit">
        Cancel Edit
      </el-button>
      <el-button
        v-if="!isEditing && !isPublish"
        type="primary"
        :disabled="viewMode === 'points'"
        @click="handleEdit"
      >
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
import AppIcon from '@/components/AppIcon.vue'
import DevicePointTablePoints from './components/DevicePointTablePoints.vue'
import DevicePointTableRouting from './components/DevicePointTableRouting.vue'
import IconButton from '@/components/common/IconButton.vue'
const submitIcon = 'i-tabler-check'
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
// 用于取消过期的 initData 异步调用（防止快速切换时竞态条件）
let initToken = 0
provide(InstanceNameKey, readonly(instanceName))
provide(InstanceIdKey, readonly(instanceId))
// 视图模式与筛选
const viewModeSwitch = ref(false) // false=points, true=routing
const viewMode = computed(() => (viewModeSwitch.value ? 'routing' : 'points'))
const editFilters = ref<string[]>([])
// Status 筛选器：modified/added/deleted 多选框互斥，invalid 独立复选
const statusCheckboxValue = ref<string[]>([])
const invalidChecked = ref(false)
const handleStatusCheckboxChange = (val: string[]) => {
  if (val.length > 1) statusCheckboxValue.value = [val[val.length - 1]]
}
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


// 模式切换处理
const handleViewModeChange = () => {
  // 模式切换时重置筛选
  editFilters.value = []
  statusCheckboxValue.value = []
  invalidChecked.value = false
}

// 下拉菜单选择
const handleDropdownCommand = (command: string) => {
  if (command === 'points') {
    viewModeSwitch.value = false
  } else if (command === 'routing') {
    viewModeSwitch.value = true
  }
  handleViewModeChange()
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
    ElMessage.warning('Routings has invalid data, please correct and submit again')
    // 自动切换状态筛选为 invalid，并跳转到首个有问题的 Tab
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
  const res = await updateInstanceRouting(instanceId.value, routingPayload)
  if (res.success) {
    ElMessage.success('Routings updated successfully')
    isEditing.value = false
    // 刷新基线
    editFilters.value = []
    statusCheckboxValue.value = []
    invalidChecked.value = false
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

// 获取是否有未保存的修改
const getHasChanges = () =>
  measurementRoutingRef.value?.hasChanges?.() || actionRoutingRef.value?.hasChanges?.()

// 执行退出编辑并恢复原始数据
const performCancelEdit = () => {
  measurementRows.value = JSON.parse(JSON.stringify(originalPointsData.value.measurement))
  actionRows.value = JSON.parse(JSON.stringify(originalPointsData.value.action))
  propertyRows.value = JSON.parse(JSON.stringify(originalPointsData.value.property))
  isEditing.value = false
  editFilters.value = []
  statusCheckboxValue.value = []
  invalidChecked.value = false
  measurementRoutingRef.value?.clearImportedFileName?.()
  actionRoutingRef.value?.clearImportedFileName?.()
}

// 返回：编辑模式且有修改时弹出确认（与 Cancel Edit 类似），否则直接返回
const handleBack = async () => {
  if (isEditing.value && getHasChanges()) {
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
    } catch {
      return
    }
  }
  if (isEditing.value) {
    performCancelEdit()
  }
  router.push('/modelConfiguration')
}

// 取消编辑：退出编辑模式并恢复原始数据（遵循之前的逻辑）
const handleCancelEdit = async () => {
  if (getHasChanges()) {
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
    } catch {
      return
    }
  }
  performCancelEdit()
}

// 初始化数据
const initData = async () => {
  // 取消上一次未完成的 initData（通过 token 机制防止竞态）
  const myToken = ++initToken

  // 立即清理上一次订阅（用 pageId.value 能命中是因为我们正确地传了 pageId 给 subscribe）
  if (pageId.value) {
    try {
      wsManager.unsubscribe(pageId.value)
    } catch {}
    pageId.value = ''
  }

  const id = route.query.id as string
  const name = route.query.name as string
  if (!id) {
    ElMessage.error('Instance ID is required')
    handleBack()
    return
  }

  // 用本地变量保存本次调用的 instanceId，防止 await 后被其他 initData 覆盖
  const localInstanceId = Number(id)
  instanceId.value = localInstanceId
  if (name) instanceName.value = name

  // 重置状态
  isEditing.value = false
  isPublish.value = false
  publishDirty.value = false
  editFilters.value = []
  statusCheckboxValue.value = []
  invalidChecked.value = false
  // 默认 Points 视图和 property Tab
  viewModeSwitch.value = false
  activeTab.value = 'property'

  await refreshPointsBaseline()

  // await 返回后检查是否已被新的 initData 调用取代，若是则放弃后续操作
  if (myToken !== initToken) return

  // 数据加载完成后，建立 WebSocket 订阅（pageId 必须传给 subscribe，确保 unsubscribe 能命中）
  pageId.value = `inst-${localInstanceId}-${Date.now()}`
  wsManager.subscribe(
    {
      source: 'inst',
      channels: [localInstanceId] as any,
      dataTypes: ['A', 'M', 'P'] as any,
      interval: 1000,
    } as any,
    {
      onBatchDataUpdate: (payload: any) => {
        if (!payload?.updates?.length) return
        payload.updates.forEach((upd: any) => {
          if (Number(upd.channel_id) !== localInstanceId) return
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
      justify-content: space-between;
      flex: 1;
      min-width: 0;

      .points-tables-page__header-title {
        font-size: $font-size-large;
        font-weight: $font-weight-semibold;
        color: $text-color-primary;
      }

      .points-tables-page__dropdown-trigger {
        display: inline-flex;
        align-items: center;
        font-size: $font-size-large;
        font-weight: $font-weight-semibold;
        color: $text-color-primary;
        cursor: pointer;

        :deep(.el-icon--right) {
          margin-left: 4px;
          width: 1em;
          height: 1em;
        }
      }

      .points-tables-page__channel-name {
        font-size: $font-size-large;
        font-weight: $font-weight-semibold;
        color: $text-color-primary;
        flex-shrink: 0;
        margin-left: 4px;
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
      gap: 12px;
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
