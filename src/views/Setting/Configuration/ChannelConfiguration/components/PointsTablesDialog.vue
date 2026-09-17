<template>
  <FormDialog
    ref="dialogRef"
    :title="viewMode === 'points' ? 'Points Table' : 'Mappings Table'"
    width="1400px"
    :appendToBody="false"
    :before-close="handleDialogBeforeClose"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="voltage-class rule-management__expand-content">
        <div class="rule-management__config-section">
          <div class="config-section__header">
            <div v-if="!isEditing" class="config-section__controls">
              <div class="view-mode-switch">
                <span class="switch-label">View Mode:</span>
                <el-radio-group v-model="viewModeSwitch" class="el-radio-group--button">
                  <el-radio :label="false">Points</el-radio>
                  <el-radio :label="true">Mappings</el-radio>
                </el-radio-group>
              </div>
            </div>
            <div class="config-section__tabs-wrapper">
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
                tabs-type="card"
                status-filter-tone="dialog"
                :before-leave="handleBeforeLeave"
                @tab-change="onTabChange"
                @toggle-publish="togglePublishMode"
                @enter-edit-mode="handleEdit"
                @publish-change="(dirty: boolean) => { publishDirty = dirty }"
                @status-checkbox-change="handleStatusCheckboxChange"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button v-if="!isPublish" @click="handleClose">
          {{ isEditing ? 'Cancel Edit' : 'Cancel' }}
        </el-button>
        <el-button v-if="!isEditing && !isPublish" type="primary" @click="() => handleEdit()">
          Edit
        </el-button>
        <IconButton
          v-if="isEditing && !isPublish"
          type="primary"
          :icon="submitIcon"
          text="Submit"
          :loading="submitLoading"
          @click="handleSubmit"
        />
        <IconButton
          v-if="!isEditing && isPublish"
          type="primary"
          :icon="submitIcon"
          text="Submit Publish"
          :loading="publishLoading"
          @click="handleSubmitPublish"
        />
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import FormDialog from '@/components/dialog/FormDialog.vue'
import ChannelPointsTablesTabs from './ChannelPointsTablesTabs.vue'
import { useGlobalStore } from '@/stores/global'
import {
  useChannelPointsTablesHost,
  type ChannelProtocol,
} from '@/composables/useChannelPointsTablesHost'

const submitIcon = 'i-tabler-check'
const globalStore = useGlobalStore()

const dialogRef = ref<InstanceType<typeof FormDialog>>()
const channelTabsRef = ref<InstanceType<typeof ChannelPointsTablesTabs>>()
const submitLoading = ref(false)
const publishLoading = ref(false)
const showSignalNameFilter = ref(false)

const {
  viewMode,
  viewModeSwitch,
  editFilters,
  statusCheckboxValue,
  invalidChecked,
  handleStatusCheckboxChange,
  handleViewModeChange,
  handleBeforeLeave,
  togglePublishMode,
  confirmDiscardUnsavedChanges,
  isPublish,
  publishDirty,
  isEditing,
  activeTab,
  channelProtocol,
  pointsData,
  originalPointsData,
  getHasChanges,
  handleEdit,
  handleSubmit,
  handleSubmitPublish,
  handleTabChange,
  performDiscardEdit,
  confirmDiscardPublishOnClose,
  clearAllSignalFilters,
  subscribeWebSocket,
  teardownWebSocket,
  loadChannelContext,
  resetHostState,
} = useChannelPointsTablesHost({
  channelTabsRef,
  restorePointsOnCancelEdit: false,
  submitLoading,
  publishLoading,
})

watch(viewModeSwitch, () => {
  handleViewModeChange()
})

const onTabChange = (name: string | number) => {
  if (showSignalNameFilter.value) {
    showSignalNameFilter.value = false
  }
  handleTabChange(name)
}

const handleDialogBeforeClose = async (done: () => void) => {
  if (isEditing.value) {
    if (getHasChanges()) {
      const confirmed = await confirmDiscardUnsavedChanges()
      if (!confirmed) return
    }
    performDiscardEdit()
    clearAllSignalFilters()
    done()
    return
  }

  await confirmDiscardPublishOnClose(done)
}

const close = () => {
  dialogRef.value!.dialogVisible = false
  teardownWebSocket()
}

const handleClose = async () => {
  if (isEditing.value) {
    if (getHasChanges()) {
      const confirmed = await confirmDiscardUnsavedChanges()
      if (!confirmed) return
    }
    performDiscardEdit()
    return
  }

  await confirmDiscardPublishOnClose(() => {
    close()
  })
}

const open = async (
  id: number,
  name?: string,
  protocol?: ChannelProtocol,
) => {
  teardownWebSocket()
  resetHostState()
  dialogRef.value!.dialogVisible = true

  await loadChannelContext({
    id,
    name,
    protocol,
    fetchNameIfMissing: !name,
  })

  nextTick(() => {
    channelTabsRef.value?.scrollActiveTabToTop(activeTab.value)
  })

  subscribeWebSocket(id)
}

defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/components/points-tables-host' as pth;

.voltage-class .rule-management__expand-content {
  .top-actions {
    @include pth.points-tables-dialog-top-actions();
  }
}

.dialog-footer {
  @include pth.points-tables-dialog-footer();
}

.voltage-class .rule-management__config-section {
  @include pth.points-tables-dialog-config-section();
}

@include pth.points-tables-tabs-content-static();
</style>
