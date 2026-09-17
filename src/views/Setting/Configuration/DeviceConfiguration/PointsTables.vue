<template>
  <div class="voltage-class points-tables-page">
    <el-page-header @back="handleBack" class="points-tables-page__header">
      <template #content>
        <div class="points-tables-page__header-content">
          <span v-if="instanceName" class="points-tables-page__channel-name">
            {{ instanceName }} -&nbsp;
          </span>
          <el-dropdown
            v-if="!isEditing"
            trigger="click"
            :show-arrow="false"
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
          <span v-else class="points-tables-page__header-title">{{ viewMode === 'points' ? 'Points Table' : 'Routings Table' }}</span>
        </div>
      </template>
    </el-page-header>

    <div class="points-tables-page__content">
      <div class="voltage-class rule-management__expand-content">
        <DevicePointsTablesTabs
          ref="deviceTabsRef"
          v-model:active-tab="activeTab"
          v-model:status-checkbox-value="statusCheckboxValue"
          v-model:invalid-checked="invalidChecked"
          :view-mode="viewMode"
          :edit-filters="editFilters"
          :is-editing="isEditing"
          :is-publish="isPublish"
          :property-rows="propertyRows"
          :measurement-rows="measurementRows"
          :action-rows="actionRows"
          :original-points-data="originalPointsData"
          :channels-for-routing="channelsForRouting"
          :loading="globalStore.loading"
          :before-leave="handleBeforeLeave"
          status-filter-compact
          @tab-change="handleTabChange"
          @toggle-publish="togglePublishMode"
          @publish-change="(dirty: boolean) => { publishDirty = dirty }"
          @status-checkbox-change="handleStatusCheckboxChange"
        />
      </div>
    </div>

    <div class="points-tables-page__footer">
      <el-button v-if="isEditing" @click="handleCancelEdit">
        Cancel Edit
      </el-button>
      <el-button
        v-if="!isEditing && !isPublish && !topologyReadOnly"
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
        Submit Publish
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import DevicePointsTablesTabs from './components/DevicePointsTablesTabs.vue'
import IconButton from '@/components/common/IconButton.vue'
import { useGlobalStore } from '@/stores/global'
import { useDevicePointsTablesHost } from '@/composables/useDevicePointsTablesHost'

const submitIcon = 'i-tabler-check'
const globalStore = useGlobalStore()
const route = useRoute()
const router = useRouter()

const topologyReadOnly = computed(() => route.query.topologyView === '1')
const deviceTabsRef = ref<InstanceType<typeof DevicePointsTablesTabs>>()

const {
  viewMode,
  editFilters,
  statusCheckboxValue,
  invalidChecked,
  handleStatusCheckboxChange,
  handleDropdownCommand,
  isPublish,
  publishDirty,
  handleTabChange,
  handleBeforeLeave,
  togglePublishMode,
  confirmDiscardUnsavedChanges,
  isEditing,
  activeTab,
  instanceName,
  measurementRows,
  actionRows,
  propertyRows,
  originalPointsData,
  channelsForRouting,
  getHasChanges,
  handleEdit,
  handleSubmit,
  handleSubmitPublish,
  handleCancelEdit,
  performDiscardEdit,
  loadInstanceContext,
  resetHostState,
  subscribeWebSocket,
  teardownWebSocket,
} = useDevicePointsTablesHost({
  deviceTabsRef,
  restorePointsOnCancelEdit: true,
})

let initToken = 0

const handleBack = async () => {
  if (isEditing.value && getHasChanges()) {
    const confirmed = await confirmDiscardUnsavedChanges()
    if (!confirmed) return
  }
  if (isEditing.value) {
    performDiscardEdit()
  }
  const returnTo = typeof route.query.returnTo === 'string' ? route.query.returnTo : ''
  if (returnTo) {
    router.push(returnTo)
    return
  }
  router.push('/modelConfiguration')
}

const initData = async () => {
  const myToken = ++initToken
  teardownWebSocket()

  const id = route.query.id as string
  const name = route.query.name as string | undefined
  if (!id) {
    ElMessage.error('Instance ID is required')
    handleBack()
    return
  }

  const localInstanceId = Number(id)
  resetHostState()

  await loadInstanceContext({ id: localInstanceId, name })
  if (myToken !== initToken) return

  subscribeWebSocket(localInstanceId)
}

onMounted(() => {
  initData()
})

onUnmounted(() => {
  teardownWebSocket()
})

watch(
  () => route.query,
  () => {
    initData()
  },
  { deep: true },
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/components/points-tables-host' as pth;

.voltage-class.points-tables-page {
  @include pth.points-tables-page-shell();
}

.voltage-class .rule-management__expand-content {
  @include pth.points-tables-page-tabs-host();
}

@include pth.points-tables-tabs-content-static();
</style>
