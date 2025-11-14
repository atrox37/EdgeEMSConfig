<template>
  <FormDialog
    ref="dialogRef"
    title="Mappings"
    width="1400px"
    :appendToBody="false"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="voltage-class rule-management__expand-content">
        <div class="rule-management__config-section">
          <el-tabs v-model="activeTab" type="card">
            <el-tab-pane label="telemetry" name="telemetry">
              <MappingsTable
                ref="telemetryTableRef"
                :protocol="protocol"
                :items="mappings.telemetry"
                :channel-id="channelId"
                :is-editing="isEditing"
                pointType="T"
              />
            </el-tab-pane>
            <el-tab-pane label="signal" name="signal">
              <MappingsTable
                ref="signalTableRef"
                :protocol="protocol"
                :items="mappings.signal"
                :channel-id="channelId"
                :is-editing="isEditing"
                pointType="S"
              />
            </el-tab-pane>
            <el-tab-pane label="control" name="control">
              <MappingsTable
                ref="controlTableRef"
                :protocol="protocol"
                :items="mappings.control"
                :channel-id="channelId"
                :is-editing="isEditing"
                pointType="C"
              />
            </el-tab-pane>
            <el-tab-pane label="adjustment" name="adjustment">
              <MappingsTable
                ref="adjustmentTableRef"
                :protocol="protocol"
                :items="mappings.adjustment"
                :channel-id="channelId"
                :is-editing="isEditing"
                pointType="A"
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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import MappingsTable from './MappingsTable.vue'
import tableSubmitIcon from '@/assets/icons/btn-submit.svg'
import type {
  MappingCategoryResponse,
  mappingResponse,
  ChannelDetail,
  BatchUpdateMappingPointRequest,
} from '@/types/channelConfiguration'
import { getChannelMappings, batchUpdateMappingPoint } from '@/api/channelsManagement'

const dialogRef = ref()
const isEditing = ref(false)
const activeTab = ref<'telemetry' | 'signal' | 'control' | 'adjustment'>('telemetry')
const channelId = ref(0)
const protocol = ref<'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can'>('modbus_tcp')

const mappings = ref<MappingCategoryResponse>({
  telemetry: [],
  signal: [],
  control: [],
  adjustment: [],
})

const telemetryTableRef = ref()
const signalTableRef = ref()
const controlTableRef = ref()
const adjustmentTableRef = ref()

const handleEdit = () => {
  isEditing.value = true
}
const getAllMapping = async () => {
  const res = await getChannelMappings(channelId.value)
  if (res.success) {
    mappings.value = res.data as MappingCategoryResponse
  }
}
const handleSubmit = async () => {
  const param: BatchUpdateMappingPointRequest = {
    mappings: [
      ...telemetryTableRef.value?.getEditedData?.(),
      ...signalTableRef.value?.getEditedData?.(),
      ...controlTableRef.value?.getEditedData?.(),
      ...adjustmentTableRef.value?.getEditedData?.(),
    ],
    mode: 'merge',
    reload_channel: false,
    validate_only: false,
  }
  const res = await batchUpdateMappingPoint(channelId.value, param)
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

const open = async (id: number, channelProtocol: 'modbus_tcp' | 'can' | 'virt' | 'modbus_rtu') => {
  channelId.value = id
  activeTab.value = 'telemetry'
  dialogRef.value.dialogVisible = true
  protocol.value = channelProtocol

  getAllMapping()
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
::deep(.el-tabs__content) {
  position: static;
}
</style>
