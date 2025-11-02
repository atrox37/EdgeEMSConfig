<template>
  <FormDialog
    ref="dialogRef"
    title="Mappings"
    width="14rem"
    :appendToBody="false"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="voltage-class rule-management__expand-content">
        <div class="rule-management__config-section">
          <el-tabs v-model="activeTab" type="card">
            <el-tab-pane label="measurement" name="measurement">
              <MappingsTable
                ref="measurementTableRef"
                :items="mappings.measurement"
                :is-editing="isEditing"
                tabType="measurement"
              />
            </el-tab-pane>
            <el-tab-pane label="action" name="action">
              <MappingsTable
                ref="actionTableRef"
                :items="mappings.action"
                :is-editing="isEditing"
                tabType="action"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">Cancel</el-button>
        <el-button type="primary" @click="handleEdit" v-if="!isEditing">Edit</el-button>
        <IconButton
          v-if="isEditing"
          type="primary"
          :icon="tableSubmitIcon"
          text="Submit"
          @click="handleSubmit"
        />
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import MappingsTable from './MappingsTable.vue'
import tableSubmitIcon from '@/assets/icons/btn-submit.svg'
import { getInstanceMappings, updateInstanceMappings } from '@/api/devicesManagement'
import type { InstanceMappingList, InstanceMappingItem } from '@/types/deviceConfiguration'

const dialogRef = ref()
const isEditing = ref(false)
const activeTab = ref('measurement')

const mappings = ref<InstanceMappingList>({
  measurement: [],
  action: [],
})

const measurementTableRef = ref()
const actionTableRef = ref()
const instanceName = ref('')

const handleEdit = () => {
  isEditing.value = true
}

const getAllMapping = async () => {
  if (!instanceName.value) return
  const res = await getInstanceMappings(instanceName.value)
  if (res.success) {
    mappings.value = res.data as InstanceMappingList
  }
}

const handleSubmit = async () => {
  if (!instanceName?.value) return
  const mappingsPayload = [
    ...(measurementTableRef.value?.getEditedData?.() || []),
    ...(actionTableRef.value?.getEditedData?.() || []),
  ]
  const res = await updateInstanceMappings(instanceName.value, {
    mappings: mappingsPayload,
  })
  if (res.success) {
    ElMessage.success('Point mapping updated successfully')
    isEditing.value = false
    getAllMapping()
  }
}

const handleClose = () => {
  if (isEditing.value) {
    isEditing.value = false
  } else {
    dialogRef.value.dialogVisible = false
  }
}

const open = async (name: string) => {
  instanceName.value = name
  dialogRef.value.dialogVisible = true
  getAllMapping()
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.1rem;
}
::deep(.el-tabs__content) {
  position: static;
}
</style>
