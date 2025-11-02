<template>
  <FormDialog ref="formDialogRef" title="Channel Details" width="9.24rem" @close="handleClose">
    <template #dialog-body>
      <div class="voltage-class channel-detail-dialog">
        <el-form
          :model="form"
          :inline="true"
          label-width="1.4rem"
          :disabled="!isEditing"
          ref="formRef"
        >
          <!-- 基础信息 -->
          <div class="channel-detail__section">
            <h4 class="channel-detail__section-title">Basic Information</h4>
            <el-form-item label="ID:" v-if="!isAdd">
              <span v-if="!isEditing" class="channel-detail__text">{{ form.id }}</span>
              <el-input v-else v-model="form.id" disabled />
            </el-form-item>
            <el-form-item label="Name:" :style="!isAdd ? 'margin-right: 0' : ''">
              <span v-if="!isEditing" class="channel-detail__text">{{ form.name }}</span>
              <el-input v-else v-model="form.name" placeholder="Please enter channel name" />
            </el-form-item>
            <el-form-item label="Protocol:" :style="isAdd ? 'margin-right: 0' : ''">
              <span v-if="!isEditing" class="channel-detail__text">{{
                getProtocolLabel(form.protocol)
              }}</span>
              <el-select v-else v-model="form.protocol" placeholder="Please select protocol">
                <el-option
                  v-for="option in PROTOCOL_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Enabled:" style="margin-right: 0">
              <template v-if="!isEditing">
                <span
                  class="channel-detail__text"
                  :style="{ color: form.enabled ? '#67C23A' : '#F56C6C', fontWeight: 600 }"
                >
                  {{ form.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </template>
              <el-switch v-else v-model="form.enabled" />
            </el-form-item>
            <el-form-item label="Description:" style="width: calc(100% - 0.1rem); margin-right: 0">
              <span v-if="!isEditing" class="channel-detail__text">{{
                form.description || '-'
              }}</span>
              <el-input
                v-else
                v-model="form.description"
                type="textarea"
                :rows="2"
                placeholder="Please enter description"
              />
            </el-form-item>
          </div>
          <!-- 参数配置 -->
          <div class="channel-detail__section">
            <h4 class="channel-detail__section-title">Parameters</h4>
            <div class="channel-detail__parameters">
              <!-- Modbus TCP -->
              <template v-if="form.protocol === 'modbus_tcp'">
                <el-form-item
                  label="Host:"
                  class="channel-detail__parameter-item"
                  style="width: 100%; margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).host || '-'
                  }}</span>
                  <el-input
                    v-else
                    v-model="(form.parameters.parameters as any).host"
                    placeholder="Host"
                    style="width: calc(100% - 0.1rem) !important"
                  />
                </el-form-item>
                <el-form-item label="Port:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).port ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).port"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item
                  label="Retry Count:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).retry_count ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).retry_count"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item label="Timeout (ms):" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).timeout_ms ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).timeout_ms"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
              </template>

              <!-- CAN -->
              <template v-else-if="form.protocol === 'can'">
                <el-form-item label="Bitrate:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).bitrate ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).bitrate"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item
                  label="Data Bitrate:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).data_bitrate ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).data_bitrate"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item label="FD Mode:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).fd_mode ? 'Yes' : 'No'
                  }}</span>
                  <el-switch v-else v-model="(form.parameters.parameters as any).fd_mode" />
                </el-form-item>
                <el-form-item
                  label="Interface:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).interface || '-'
                  }}</span>
                  <el-input
                    v-else
                    v-model="(form.parameters.parameters as any).interface"
                    placeholder="can0 / can1 ..."
                  />
                </el-form-item>
                <el-form-item label="Listen Only:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).listen_only ? 'Yes' : 'No'
                  }}</span>
                  <el-switch v-else v-model="(form.parameters.parameters as any).listen_only" />
                </el-form-item>
                <el-form-item
                  label="Loopback:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).loopback ? 'Yes' : 'No'
                  }}</span>
                  <el-switch v-else v-model="(form.parameters.parameters as any).loopback" />
                </el-form-item>
                <el-form-item
                  label="Timeout (ms):"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).timeout_ms ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).timeout_ms"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
              </template>

              <!-- Virtual -->
              <template v-else-if="form.protocol === 'virt'">
                <el-form-item label="Update Interval (ms):" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).update_interval_ms ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).update_interval_ms"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
              </template>

              <!-- Modbus RTU -->
              <template v-else-if="form.protocol === 'modbus_rtu'">
                <el-form-item label="Device:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).device || '-'
                  }}</span>
                  <el-input
                    v-else
                    v-model="(form.parameters.parameters as any).device"
                    placeholder="/dev/ttyS0"
                  />
                </el-form-item>
                <el-form-item
                  label="Baud Rate:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).baud_rate ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).baud_rate"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item label="Data Bits:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).data_bits ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).data_bits"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item
                  label="Stop Bits:"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).stop_bits ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).stop_bits"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item label="Parity:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).parity || '-'
                  }}</span>
                  <el-select
                    v-else
                    v-model="(form.parameters.parameters as any).parity"
                    placeholder="Parity"
                  >
                    <el-option label="None" value="none" />
                    <el-option label="Even" value="even" />
                    <el-option label="Odd" value="odd" />
                  </el-select>
                </el-form-item>
                <el-form-item
                  label="Poll Interval (ms):"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).poll_interval_ms ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).poll_interval_ms"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item label="Retry Count:" class="channel-detail__parameter-item">
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).retry_count ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).retry_count"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
                <el-form-item
                  label="Timeout (ms):"
                  class="channel-detail__parameter-item"
                  style="margin-right: 0"
                >
                  <span v-if="!isEditing" class="channel-detail__text">{{
                    (form.parameters.parameters as any).timeout_ms ?? '-'
                  }}</span>
                  <el-input-number
                    v-else
                    v-model="(form.parameters.parameters as any).timeout_ms"
                    :controls="false"
                    align="left"
                  />
                </el-form-item>
              </template>
            </div>
          </div>
          <!-- 运行时状态 -->
          <div class="channel-detail__section" v-if="!isEditing && form.runtime_status">
            <h4 class="channel-detail__section-title">Runtime Status</h4>
            <el-form-item label="Connected:">
              <span
                class="channel-detail__text"
                :style="{
                  color: form.runtime_status.connected ? '#67C23A' : '#F56C6C',
                  fontWeight: 600,
                }"
              >
                {{ form.runtime_status.connected ? 'Connected' : 'Disconnected' }}
              </span>
            </el-form-item>
            <el-form-item label="Running:" v-if="form.runtime_status" style="margin-right: 0">
              <span
                class="channel-detail__text"
                :style="{
                  color: form.runtime_status.running ? '#67C23A' : '#F56C6C',
                  fontWeight: 600,
                }"
              >
                {{ form.runtime_status.running ? 'Running' : 'Stopped' }}
              </span>
            </el-form-item>
            <el-form-item label="Last Update:">
              <span class="channel-detail__text">{{
                formatIsoToDateTime(form.runtime_status?.last_update || '-')
              }}</span>
            </el-form-item>
            <el-form-item label="Error Count:" style="margin-right: 0">
              <span class="channel-detail__text">{{ form.runtime_status?.error_count }}</span>
            </el-form-item>
            <el-form-item label="Last Error:">
              <span class="channel-detail__text">{{
                form.runtime_status?.last_error || 'No errors'
              }}</span>
            </el-form-item>
          </div>

          <!-- 点位统计 -->
          <div v-if="!isEditing" class="channel-detail__section">
            <h4 class="channel-detail__section-title">Point Counts</h4>
            <el-form-item label="Telemetry:">
              <span class="channel-detail__text">{{ form.point_counts?.telemetry }}</span>
            </el-form-item>
            <el-form-item label="Signal:" style="margin-right: 0">
              <span class="channel-detail__text">{{ form.point_counts?.signal }}</span>
            </el-form-item>
            <el-form-item label="Control:">
              <span class="channel-detail__text">{{ form.point_counts?.control }}</span>
            </el-form-item>
            <el-form-item label="Adjustment:" style="margin-right: 0">
              <span class="channel-detail__text">{{ form.point_counts?.adjustment }}</span>
            </el-form-item>
          </div>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">{{ isEditing ? 'Cancel Edit' : 'Cancel' }}</el-button>
        <el-button v-if="!isEditing" type="primary" @click="handleEdit">Edit</el-button>
        <el-button v-else type="primary" @click="handleSubmit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import FormDialog from '@/components/dialog/FormDialog.vue'
import type {
  ChannelDetail,
  modbusTcpParams,
  canParams,
  virtualParams,
  modbusRtuParams,
} from '@/types/channelConfiguration'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import dayjs from 'dayjs'
import { getChannelDetail, createChannel } from '@/api/channelsManagement'

// Props
interface Props {
  channelData?: ChannelDetail
}

const props = withDefaults(defineProps<Props>(), {
  channelData: () => ({
    id: 0,
    name: '',
    description: '',
    protocol: 'modbus_tcp',
    enabled: false,
    parameters: {
      parameters: {
        host: '',
        port: 0,
        retry_count: 0,
        timeout_ms: 0,
      },
    },
    runtime_status: {
      connected: false,
      running: false,
      last_update: '',
      error_count: 0,
      last_error: null,
      statistics: {},
    },
    point_counts: {
      telemetry: 0,
      signal: 0,
      control: 0,
      adjustment: 0,
    },
  }),
})

// Emits
const emit = defineEmits<{
  submit: []
  cancel: []
}>()
const copyForm = ref<{
  description: string
  protocol: 'modbus_tcp' | 'can' | 'virt' | 'modbus_rtu'
  name: string
  parameters: modbusTcpParams | canParams | virtualParams | modbusRtuParams
}>()
// 响应式数据
const formDialogRef = ref()
const isEditing = ref(false)
const isAdd = ref(false)
const formRef = ref<FormInstance>()
// 表单数据
const form = ref<ChannelDetail>({
  id: 0,
  name: '',
  description: '',
  protocol: 'modbus_tcp',
  enabled: false,
  parameters: { parameters: { host: '', port: 502, retry_count: 0, timeout_ms: 2000 } as any },
  runtime_status: {
    connected: false,
    running: false,
    last_update: '',
    error_count: 0,
    last_error: null,
    statistics: {},
  },
  point_counts: {
    telemetry: 0,
    signal: 0,
    control: 0,
    adjustment: 0,
  },
})

// 格式化时间
const formatIsoToDateTime = (isoString: string) => {
  return dayjs(isoString).format('YYYY-MM-DD HH:mm:ss')
}
// 获取协议标签
const getProtocolLabel = (protocol: string) => {
  const option = PROTOCOL_OPTIONS.find((opt) => opt.value === protocol)
  return option ? option.label : protocol
}

// 当协议变化时，初始化对应的参数模板
watch(
  () => form.value.protocol,
  (protocol) => {
    if (!form.value.parameters) form.value.parameters = { parameters: {} as any } as any
    if (!(form.value.parameters as any).parameters)
      (form.value.parameters as any).parameters = {} as any
    const params: any = (form.value.parameters as any).parameters
    if (protocol === 'modbus_tcp') {
      Object.assign(params, { host: '', port: 502, retry_count: 0, timeout_ms: 2000 })
    } else if (protocol === 'can') {
      Object.assign(params, {
        bitrate: 500000,
        data_bitrate: 2000000,
        fd_mode: false,
        interface: 'can0',
        listen_only: false,
        loopback: false,
        timeout_ms: 2000,
      })
    } else if (protocol === 'virt') {
      Object.assign(params, { update_interval_ms: 1000 })
    } else if (protocol === 'modbus_rtu') {
      Object.assign(params, {
        device: '/dev/ttyS0',
        baud_rate: 9600,
        data_bits: 8,
        stop_bits: 1,
        parity: 'none',
        poll_interval_ms: 1000,
        retry_count: 0,
        timeout_ms: 2000,
      })
    }
  },
  { immediate: true },
)

// 添加参数
const addParameter = () => {
  const key = prompt('Please enter parameter key:')
  if (key && !form.value.parameters[key]) {
    form.value.parameters[key] = ''
  }
}

// 编辑
const handleEdit = () => {
  isEditing.value = true
}

// 取消
const handleCancel = () => {
  if (isEditing.value && !isAdd.value) {
    // 如果正在编辑，返回到查看状态
    isEditing.value = false
    // 恢复原始数据
    if (copyForm.value) {
      form.value.name = copyForm.value.name
      form.value.description = copyForm.value.description
      form.value.protocol = copyForm.value.protocol
      ;(form.value.parameters as any).parameters = copyForm.value.parameters as any
    }
  } else {
    // 如果在查看状态，关闭对话框
    if (formDialogRef.value) {
      formDialogRef.value.dialogVisible = false
    }
    emit('cancel')
  }
}

// 提交
const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      if (isAdd.value) {
        const res = await createChannel(form.value)
        if (res.success) {
          ElMessage.success('Channel created successfully')
          formDialogRef.value.dialogVisible = false
          isEditing.value = false
          isAdd.value = false
          emit('submit')
        }
      } else {
        // const res = await updateChannel(form.value.id, form.value)
        // if (res.success) {
        //   ElMessage.success('Channel updated successfully')
        //   emit('submit')
        // }
      }
    }
  })
}
const open = async (id: number | undefined) => {
  form.value.id = id
  if (id) {
    isEditing.value = false
    const res = await getChannelDetail(id)
    if (res.success) {
      form.value = res.data
      formDialogRef.value.dialogVisible = true
      isEditing.value = false
      copyForm.value = {
        description: res.data.description,
        protocol: res.data.protocol,
        name: res.data.name,
        parameters: res.data.parameters,
      }
    }
  } else {
    form.value = {
      name: '',
      description: '',
      protocol: 'modbus_tcp',
      enabled: false,
      parameters: {
        parameters: {
          host: '',
          port: 0,
          retry_count: 0,
          timeout_ms: 0,
        },
      },
    }
    isAdd.value = true
    isEditing.value = true
    formDialogRef.value.dialogVisible = true
  }

  setTimeout(() => {
    if (formDialogRef.value && formRef.value) {
      formDialogRef.value.dialogVisible = true
      formRef.value.clearValidate()
    }
  }, 100)
}
// 关闭
const handleClose = () => {
  isEditing.value = false
  emit('cancel')
}
defineExpose({
  open,
})
</script>

<style scoped lang="scss">
.voltage-class .channel-detail-dialog {
  max-height: 6rem;
  overflow-y: auto;
  .channel-detail__section {
    margin-bottom: 0.3rem;
    padding-bottom: 0.2rem;
    border-bottom: 0.01rem solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
    }

    .channel-detail__section-title {
      font-size: 0.16rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.15rem 0;
    }

    .channel-detail__parameters {
      .channel-detail__parameter-item {
        // margin-bottom: 0.1rem;
        // width: calc(50% - 0.1rem);
      }
    }
  }

  .el-form-item {
    margin-bottom: 0.15rem;
  }

  .channel-detail__text {
    color: #fff;
    font-size: 0.14rem;
    line-height: 1.5;
  }
}
</style>
