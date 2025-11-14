<template>
  <FormDialog
    ref="dialogRef"
    title="Points Tables"
    width="1400px"
    :appendToBody="false"
    @close="handleClose"
  >
    <template #dialog-body>
      <div class="voltage-class rule-management__expand-content">
        <!-- 编辑/发布 控制按钮 -->
        <div class="rule-management__edit-controls">
          <IconButton
            v-if="isEditing"
            type="primary"
            :icon="tableAddIcon"
            text="Add Point"
            @click="handleAddPoint"
          />
        </div>

        <div class="rule-management__config-section">
          <el-tabs v-model="activeTab" type="card" @tab-change="handleTabChange">
            <el-tab-pane label="telemetry" name="telemetry">
              <PointTable
                ref="telemetryTableRef"
                pointType="T"
                :points="pointsData.telemetry"
                :publish-mode="false"
                :is-editing="isEditing"
              />
            </el-tab-pane>
            <el-tab-pane label="signal" name="signal">
              <PointTable
                ref="signalTableRef"
                pointType="S"
                :points="pointsData.signal"
                :publish-mode="false"
                :is-editing="isEditing"
              />
            </el-tab-pane>
            <el-tab-pane label="control" name="control">
              <PointTable
                ref="controlTableRef"
                pointType="C"
                :points="pointsData.control"
                :publishMode="isPublish && activeTab === 'control'"
                :is-editing="isEditing"
                @publish-change="
                  (dirty: boolean) => {
                    publishDirty = dirty
                  }
                "
              />
            </el-tab-pane>
            <el-tab-pane label="adjustment" name="adjustment">
              <PointTable
                ref="adjustmentTableRef"
                pointType="A"
                :points="pointsData.adjustment"
                :publishMode="isPublish && activeTab === 'adjustment'"
                :is-editing="isEditing"
                @publish-change="
                  (dirty: boolean) => {
                    publishDirty = dirty
                  }
                "
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </template>

    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button v-if="!isPublish" @click="handleClose">{{
          isEditing ? 'Cancel Edit' : 'Cancel'
        }}</el-button>
        <!-- <el-button type="primary" @click="handleEdit" v-if="!isEditing && !isPublish"
          >Edit</el-button
        > -->
        <IconButton
          v-if="isEditing && !isPublish"
          type="primary"
          :icon="tableSubmitIcon"
          text="Submit"
          @click="handleSubmit"
        />
        <el-button
          v-if="!isEditing && (activeTab === 'control' || activeTab === 'adjustment')"
          :type="isPublish ? 'warning' : 'primary'"
          @click="toggleisPublish"
          style="margin-left: 12px"
        >
          {{ isPublish ? 'Cancel Publish' : 'Batch Publish' }}
        </el-button>
        <IconButton
          v-if="!isEditing && isPublish && (activeTab === 'control' || activeTab === 'adjustment')"
          type="primary"
          :icon="tableSubmitIcon"
          text="Submit Publish"
          @click="handleSubmitPublish"
        />
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import PointTable from './PointTable.vue'
import tableSubmitIcon from '@/assets/icons/btn-submit.svg'
import tableAddIcon from '@/assets/icons/user-add.svg'
import type { PointInfo, PointInfoResponse } from '@/types/channelConfiguration'
import { getPointsTables, getChannelDetail } from '@/api/channelsManagement'
import { postAdjustmentBatch, postControlBatch } from '@/api/channelsManagement'
import { ChannelIdKey, ChannelNameKey, ChannelProtocolKey } from '@/utils/key'
// 内部状态
const dialogRef = ref()
const isEditing = ref(false)
const activeTab = ref('telemetry')
const channelId = ref(0)
const channelName = ref('')
const isPublish = ref(false)
let publishDirty = ref(false)
const channelProtocol = ref<'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can'>('modbus_tcp')

// 点位数据存储
const pointsData = ref<PointInfoResponse>({
  telemetry: [],
  signal: [],
  control: [],
  adjustment: [],
})

// 编辑状态管理方法
const telemetryTableRef = ref()
const signalTableRef = ref()
const controlTableRef = ref()
const adjustmentTableRef = ref()

provide(ChannelIdKey, readonly(channelId))
provide(ChannelNameKey, readonly(channelName))
provide(ChannelProtocolKey, readonly(channelProtocol))

const handleEdit = () => {
  isEditing.value = true
}

const handleCancel = () => {
  isEditing.value = false
}

const handleSubmit = () => {
  const result: Record<string, PointInfo[]> = {
    telemetry: telemetryTableRef.value?.getEditedData?.(),
    signal: signalTableRef.value?.getEditedData?.(),
    control: controlTableRef.value?.getEditedData?.(),
    adjustment: adjustmentTableRef.value?.getEditedData?.(),
  }
  // 在此处可以发送统一保存请求，或向父组件上报保存
  // 这里直接覆盖到本地 pointsData
  Object.assign(pointsData.value, result)
  isEditing.value = false
  ElMessage.success('Points data submitted')
}

const toggleisPublish = () => {
  if (isPublish.value) {
    // 取消发布模式时，如果有未提交，提示
    if (publishDirty.value) {
      // 简单提示，避免引入额外依赖

      if (!confirm('You have unsaved publish values. Discard them?')) return
    }
    isPublish.value = false
    publishDirty.value = false
    controlTableRef.value?.resetPublish?.()
    adjustmentTableRef.value?.resetPublish?.()
  } else {
    isPublish.value = true
  }
}

const handleSubmitPublish = async () => {
  const commands =
    activeTab.value === 'control'
      ? controlTableRef.value?.getPublishCommands?.()
      : adjustmentTableRef.value?.getPublishCommands?.()
  if (!Array.isArray(commands) || commands.length === 0) return
  if (activeTab.value === 'control') {
    const res = await postControlBatch(channelId.value, commands)
    if (res.success) {
      publishDirty.value = false
      isPublish.value = false
      controlTableRef.value?.resetPublish()
      ElMessage.success('Control batch publish successful')
    }
  } else if (activeTab.value === 'adjustment') {
    const res = await postAdjustmentBatch(channelId.value, commands)
    if (res.success) {
      publishDirty.value = false
      isPublish.value = false
      adjustmentTableRef.value?.resetPublish()
      ElMessage.success('Adjustment batch publish successful')
    }
  }
}

const handleTabChange = async (name: string) => {
  if (isPublish.value && publishDirty) {
    const ok = confirm('You have unsent publish values. Submit them before switching?')
    if (ok) {
      await handleSubmitPublish()
    } else {
      // if cancel submit, also cancel publish mode changes
      controlTableRef.value?.resetPublish?.()
      adjustmentTableRef.value?.resetPublish?.()
      publishDirty.value = false
      isPublish.value = false
    }
  } else {
    if (isPublish.value && (name == 'telemetry' || name == 'signal')) {
      controlTableRef.value?.resetPublish?.()
      adjustmentTableRef.value?.resetPublish?.()
      publishDirty.value = false
      isPublish.value = false
    }
  }
}

// 添加点位方法
const handleAddPoint = () => {
  const newId = Date.now()
  const newPoint: PointInfo = {
    point_id: newId,
    signal_name: '',
    scale: 1,
    offset: 0,
    unit: '',
    data_type: 'float',
    reverse: false,
    description: '',
    has_mapping: false,
  }

  const currentRef = getCurrentTableRef()
  if (currentRef?.addPoint) {
    currentRef.addPoint(newPoint)
    ElMessage.success('Point added successfully')
  }
}

// 根据激活 tab 获取对应表格实例
const getCurrentTableRef = () => {
  switch (activeTab.value) {
    case 'telemetry':
      return telemetryTableRef.value
    case 'signal':
      return signalTableRef.value
    case 'control':
      return controlTableRef.value
    case 'adjustment':
      return adjustmentTableRef.value
    default:
      return null
  }
}

// 对话框控制方法
const open = async (
  id: number,
  name?: string,
  protocol?: 'modbus_tcp' | 'modbus_rtu' | 'virt' | 'can',
) => {
  isEditing.value = false
  isPublish.value = false
  channelId.value = id
  if (name) channelName.value = name
  if (protocol) channelProtocol.value = protocol
  dialogRef.value.dialogVisible = true
  const res = await getPointsTables(id)
  if (res.success) {
    pointsData.value = res.data
  }
  if (!name) {
    const detail = await getChannelDetail(id)
    if (detail.success) {
      channelName.value = detail.data.name || ''
    }
  }
}

const close = () => {
  dialogRef.value.dialogVisible = false
}

const handleClose = () => {
  //如果正在编辑，询问是否保存
  if (isEditing.value) {
    isEditing.value = false
  } else {
    close()
  }
}

// 暴露方法
defineExpose({
  open,
  close,
})
</script>

<style scoped lang="scss">
.voltage-class .rule-management__expand-content {
  .rule-management__edit-controls {
    display: flex;
    justify-content: flex-end;
    gap: 10px;

    .el-button {
      img {
        width: 14px;
        height: 14px;
        margin-right: 4px;
        object-fit: contain;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
:deep(.el-tabs__content) {
  position: static;
}
</style>
