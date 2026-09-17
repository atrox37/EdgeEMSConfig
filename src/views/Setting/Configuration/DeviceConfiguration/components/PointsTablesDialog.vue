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
                  tabs-type="card"
                  status-filter-tone="dialog"
                  status-filter-compact
                  :before-leave="handleBeforeLeave"
                  @tab-change="handleTabChange"
                  @toggle-publish="togglePublishMode"
                  @publish-change="(dirty: boolean) => { publishDirty = dirty }"
                  @status-checkbox-change="handleStatusCheckboxChange"
                />
              </LoadingBg>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <div class="dc-points-dialog__toolbar">
        <el-button v-if="!isPublish" @click="handleCancel">
          {{ isEditing ? 'Cancel Edit' : 'Cancel' }}
        </el-button>
        <el-button
          v-if="viewMode === 'routing' && !isEditing && !isPublish"
          type="primary"
          @click="handleEdit"
        >
          Edit
        </el-button>
        <el-button v-if="isEditing" type="primary" :loading="submitLoading" @click="handleSubmit">
          Submit
        </el-button>
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
import { ref, watch } from 'vue'
import FormDialog from '@/components/dialog/FormDialog.vue'
import LoadingBg from '@/components/common/LoadingBg.vue'
import DevicePointsTablesTabs from './DevicePointsTablesTabs.vue'
import { useGlobalStore } from '@/stores/global'
import { useDevicePointsTablesHost } from '@/composables/useDevicePointsTablesHost'

const props = withDefaults(
  defineProps<{
    width?: string
    dialogClass?: string
  }>(),
  {
    width: '1400px',
    dialogClass: '',
  },
)

const globalStore = useGlobalStore()
const dialogRef = ref<InstanceType<typeof FormDialog>>()
const deviceTabsRef = ref<InstanceType<typeof DevicePointsTablesTabs>>()
const submitLoading = ref(false)
const publishLoading = ref(false)

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
  resetPublishState,
  isPublish,
  publishDirty,
  isEditing,
  activeTab,
  measurementRows,
  actionRows,
  propertyRows,
  originalPointsData,
  channelsForRouting,
  handleTabChange,
  getHasChanges,
  handleEdit,
  handleSubmit,
  handleSubmitPublish,
  performDiscardEdit,
  loadInstanceContext,
  resetHostState,
  subscribeWebSocket,
  teardownWebSocket,
} = useDevicePointsTablesHost({
  deviceTabsRef,
  restorePointsOnCancelEdit: false,
  submitLoading,
  publishLoading,
})

watch(viewModeSwitch, () => {
  handleViewModeChange()
})

const close = () => {
  dialogRef.value!.dialogVisible = false
}

const handleDialogBeforeClose = async (done: () => void) => {
  if (isEditing.value && getHasChanges()) {
    const confirmed = await confirmDiscardUnsavedChanges()
    if (!confirmed) return
    performDiscardEdit()
    teardownWebSocket()
    done()
    return
  }

  if (isEditing.value) {
    performDiscardEdit()
  }

  teardownWebSocket()
  done()
}

async function handleClose() {
  isEditing.value = false
  resetPublishState()
}

async function handleCancel() {
  if (isEditing.value && getHasChanges()) {
    const confirmed = await confirmDiscardUnsavedChanges()
    if (!confirmed) return
    performDiscardEdit()
    return
  }

  if (isEditing.value) {
    performDiscardEdit()
  } else {
    close()
  }
}

async function open(id: number, name: string) {
  teardownWebSocket()
  resetHostState()
  dialogRef.value!.dialogVisible = true

  await loadInstanceContext({ id, name })
  subscribeWebSocket(id)
}

defineExpose({ open, close })
</script>

<style scoped lang="scss">
@use '@/assets/styles/components/points-tables-host' as pth;

.voltage-class {
  .dc-points-dialog {
    .dc-points-dialog__toolbar {
      display: flex;
      gap: 8px;
    }
  }

  @include pth.points-tables-tabs-content-static();
  @include pth.points-tables-device-dialog-scoped();
}
</style>

<style lang="scss">
@use '@/assets/styles/components/points-tables-host' as pth;

@include pth.points-tables-device-dialog-global('.dc-points-dialog--responsive');
</style>
