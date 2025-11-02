<template>
  <FormDialog ref="dialogRef" title="Points" width="12rem" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class dc-points-dialog">
        <el-tabs v-model="activeTab" type="card">
          <el-tab-pane label="property" name="property">
            <PointsTable :rows="propertyRows" :editable="isEditing" pointType="property" />
          </el-tab-pane>
          <el-tab-pane label="measurement" name="measurement">
            <PointsTable :rows="measurementRows" :editable="isEditing" pointType="measurement" />
          </el-tab-pane>

          <el-tab-pane label="action" name="action">
            <PointsTable :rows="actionRows" :editable="isEditing || isPublish" pointType="action" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dc-points-dialog__toolbar">
        <!-- <el-button v-if="!isEditing && !isPublish" type="primary" @click="isEditing = true"
          >Edit</el-button
        > -->
        <el-button type="warning" @click="handleCancel">{{
          isEditing ? 'Cancel Edit' : 'Cancel'
        }}</el-button>
        <!-- <el-button v-if="isEditing" type="primary" @click="submitEdit">Submit</el-button> -->
        <!-- <el-button
          v-if="!isEditing && activeTab === 'action'"
          :type="isPublish ? 'warning' : 'primary'"
          @click="togglePublish"
          >{{ isPublish ? 'Cancel Execute' : 'Batch Execute' }}</el-button
        > -->
        <el-button
          v-if="!isEditing && isPublish && activeTab === 'action'"
          type="primary"
          @click="submitBatchPublish"
          >Submit Execute</el-button
        >
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FormDialog from '@/components/dialog/FormDialog.vue'
import { getInstancePoints } from '@/api/devicesManagement'
import type { InstancePointList, InstancePointItem } from '@/types/deviceConfiguration'
import PointsTable from './components/PointsTable.vue'
import { InstanceNameKey } from '@/utils/key'
const dialogRef = ref()
const activeTab = ref<'measurement' | 'action' | 'property'>('property')
const isEditing = ref(false)
const isPublish = ref(false)
const instanceName = ref('')
const measurementRows = ref<InstancePointItem[]>([])
const actionRows = ref<InstancePointItem[]>([])
const propertyRows = ref<InstancePointItem[]>([])
provide(InstanceNameKey, readonly(instanceName))
async function open(name: string) {
  instanceName.value = name
  // 初始化示例数据（真实项目应从接口加载）
  if (
    measurementRows.value.length === 0 &&
    actionRows.value.length === 0 &&
    propertyRows.value.length === 0
  ) {
    const res = await getInstancePoints(name)
    if (res.success) {
      const data = res.data as InstancePointList
      if (data.measurements) measurementRows.value = Object.values(data.measurements)
      if (data.actions) actionRows.value = Object.values(data.actions)
      if (data.properties) propertyRows.value = Object.values(data.properties)
    }
  }
  isEditing.value = false
  isPublish.value = false
  activeTab.value = 'property'
  dialogRef.value.dialogVisible = true
}

function close() {
  dialogRef.value.dialogVisible = false
}

function handleClose() {
  isEditing.value = false
  isPublish.value = false
}

function handleCancel() {
  if (isEditing.value) {
    isEditing.value = false
  } else {
    close()
  }
}

// function submitEdit() {
//   isEditing.value = false
// }

// function togglePublish() {
//   isPublish.value = !isPublish.value
// }

function submitBatchPublish() {
  // 批量发布逻辑（示例）
  isPublish.value = false
}

defineExpose({ open, close })
</script>

<style scoped lang="scss">
.voltage-class {
  .dc-points-dialog {
    .dc-points-dialog__toolbar {
      display: flex;
      gap: 0.08rem;
    }
  }
  :deep(.el-tabs__content) {
    position: static;
  }
}
</style>
