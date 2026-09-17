<template>
    <div class="voltage-class points-tables-page">
        <el-page-header @back="handleBack" class="points-tables-page__header">
            <template #content>
                <div class="points-tables-page__header-content">
                    <span v-if="channelName" class="points-tables-page__channel-name">
                        {{ channelName }} -&nbsp;
                    </span>
                    <el-dropdown v-if="!isEditing" trigger="click" :show-arrow="false"
                        class="points-tables-page__view-mode-dropdown"
                        @command="handleDropdownCommand">
                        <span class="points-tables-page__dropdown-trigger">
                            {{ viewMode === 'points' ? 'Points Table' : 'Mappings Table' }}
                            <AppIcon name="i-tabler-chevron-down" className="el-icon--right" />
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="points">Points Table</el-dropdown-item>
                                <el-dropdown-item command="mappings">Mappings Table</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <span v-else class="points-tables-page__header-title">{{ viewMode === 'points' ? 'Points Table' :
                        'Mappings Table'
                    }}</span>
                </div>
            </template>
        </el-page-header>

        <div class="points-tables-page__content">
            <div class="voltage-class rule-management__expand-content">
                <ChannelPointsTablesTabs
                    ref="channelTabsRef"
                    v-model:active-tab="activeTab"
                    v-model:status-checkbox-value="statusCheckboxValue"
                    v-model:invalid-checked="invalidChecked"
                    :view-mode="viewMode"
                    :edit-filters="editFilters"
                    :is-editing="isEditing"
                    :is-publish="isPublish"
                    :points-data="pointsData"
                    :original-points-data="originalPointsData"
                    :channel-protocol="channelProtocol"
                    :loading="globalStore.loading"
                    :before-leave="handleBeforeLeave"
                    @tab-change="handleTabChange"
                    @toggle-publish="togglePublishMode"
                    @enter-edit-mode="handleEdit"
                    @publish-change="(dirty: boolean) => { publishDirty = dirty }"
                    @status-checkbox-change="handleStatusCheckboxChange"
                />
            </div>
        </div>

        <div v-permission="'engineer'" class="points-tables-page__footer">
            <el-button v-if="isEditing && !isPublish" @click="handleCancelEdit">
                Cancel Edit
            </el-button>
            <el-button v-if="!isEditing && !isPublish" type="primary" @click="handleEdit">
                Edit
            </el-button>
            <IconButton v-if="isEditing && !isPublish" type="primary" :icon="submitIcon" text="Submit"
                @click="handleSubmit" />
            <IconButton v-if="!isEditing && isPublish" type="primary" :icon="submitIcon" text="Submit Publish"
                @click="handleSubmitPublish" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import ChannelPointsTablesTabs from './components/ChannelPointsTablesTabs.vue'
import IconButton from '@/components/common/IconButton.vue'
import { useGlobalStore } from '@/stores/global'
import {
  useChannelPointsTablesHost,
  type ChannelProtocol,
} from '@/composables/useChannelPointsTablesHost'

const submitIcon = 'i-tabler-check'
const globalStore = useGlobalStore()
const route = useRoute()
const router = useRouter()

const channelTabsRef = ref<InstanceType<typeof ChannelPointsTablesTabs>>()

const {
  viewMode,
  editFilters,
  statusCheckboxValue,
  invalidChecked,
  handleStatusCheckboxChange,
  handleDropdownCommand,
  isPublish,
  publishDirty,
  handleBeforeLeave,
  togglePublishMode,
  confirmDiscardUnsavedChanges,
  isEditing,
  activeTab,
  channelName,
  channelProtocol,
  pointsData,
  originalPointsData,
  getHasChanges,
  handleEdit,
  handleSubmit,
  handleSubmitPublish,
  handleTabChange,
  handleCancelEdit,
  performDiscardEdit,
  clearAllSignalFilters,
  subscribeWebSocket,
  teardownWebSocket,
  loadChannelContext,
} = useChannelPointsTablesHost({
  channelTabsRef,
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
  } else {
    clearAllSignalFilters()
  }
  router.push('/channelConfiguration')
}

const initData = async () => {
  const myToken = ++initToken
  teardownWebSocket()

  const id = route.query.id as string
  const name = route.query.name as string | undefined
  const protocol = route.query.protocol as ChannelProtocol | undefined

  if (!id) {
    ElMessage.error('Channel ID is required')
    handleBack()
    return
  }

  const localChannelId = Number(id)

  await loadChannelContext({
    id: localChannelId,
    name,
    protocol,
    fetchNameIfMissing: !name,
  })

  if (myToken !== initToken) return

  subscribeWebSocket(localChannelId)

  nextTick(() => {
    channelTabsRef.value?.scrollActiveTabToTop(activeTab.value)
  })
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
