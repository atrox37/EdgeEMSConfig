<template>
  <FormDialog ref="formDialogRef" :title="dialogTitle" width="944px" @close="handleClose" :style="{ height: '80%' }">
    <template #dialog-body>
      <div class="voltage-class channel-detail-dialog">
        <el-form
          :model="form"
          :inline="true"
          label-width="160px"
          :disabled="!isEditing"
          :rules="formRules"
          :validate-on-rule-change="false"
          ref="formRef"
          class="channel-detail-form"
        >
          <LightCollapseCard v-model="isBasicOpen" title="Basic Information">
            <div class="channel-detail__section">
              <el-form-item label="ID:" v-if="!isAdd">
                <span class="channel-detail__text">{{ form.id }}</span>
              </el-form-item>
              <el-form-item v-if="isAdd" label="ID Mode:" prop="channel_id_mode">
                <el-select v-model="channelIdMode" placeholder="Please select mode">
                  <el-option label="Auto" value="auto" />
                  <el-option label="Manual" value="manual" />
                </el-select>
              </el-form-item>
              <el-form-item
                v-if="isAdd && channelIdMode === 'manual'"
                label="Channel ID:"
                prop="channel_id"
                style="margin-right: 0"
              >
                <el-input-number
                  v-model="channelIdInput"
                  :controls="false"
                  :min="1"
                  :precision="0"
                  align="left"
                  placeholder="Please enter channel id"
                />
              </el-form-item>
              <el-form-item label="Name:" :style="!isAdd ? 'margin-right: 0' : ''" prop="name">
                <span v-if="!isEditing" class="channel-detail__text">{{ form.name }}</span>
                <el-input v-else v-model="form.name" placeholder="Please enter channel name" />
              </el-form-item>
              <el-form-item label="Protocol:" :style="isAdd ? 'margin-right: 0' : ''" prop="protocol">
                <span v-if="!isEditing" class="channel-detail__text">{{
                  getProtocolLabel(form.protocol)
                }}</span>
                  <el-select
                  v-else
                    v-model="form.protocol"
                    placeholder="Please select protocol"
                  >
                    <el-option
                      v-for="option in PROTOCOL_OPTIONS"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                
              </el-form-item>
              <el-form-item label="Enabled:" style="margin-right: 0" prop="enabled">
                <template v-if="isAdd && isEditing">
                  <el-switch v-model="form.enabled" />
                </template>
                <template v-else>
                  <span
                    class="channel-detail__text"
                    :style="{ color: form.enabled ? '#67C23A' : '#F56C6C', fontWeight: 600 }"
                  >
                    {{ form.enabled ? 'Enabled' : 'Disabled' }}
                  </span>
                </template>
              </el-form-item>
              <el-form-item
                label="Description:"
                class="channel-detail__form-item--full"
              >
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
          </LightCollapseCard>

          <LightCollapseCard v-model="isParamsOpen" title="Parameters">
            <div class="channel-detail__section">
              <div class="channel-detail__parameters">
                <ModbusTcpParams
                  v-if="form.protocol === 'modbus_tcp'"
                  :form="form"
                  :is-editing="isEditing"
                />

                <template v-else-if="form.protocol === 'can'">
                  <el-form-item label="Bitrate:" class="channel-detail__parameter-item">
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).bitrate
                    }}</span>
                    <el-input-number
                      v-else
                      v-model="(form.parameters as any).bitrate"
                      :controls="false"
                      align="left"
                      placeholder="please enter bitrate"
                    />
                  </el-form-item>
                  <el-form-item
                    label="Data Bitrate:"
                    class="channel-detail__parameter-item"
                    style="margin-right: 0"
                  >
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).data_bitrate
                    }}</span>
                    <el-input-number
                      v-else
                      v-model="(form.parameters as any).data_bitrate"
                      :controls="false"
                      align="left"
                      placeholder="please enter data bitrate"
                    />
                  </el-form-item>
                  <el-form-item label="FD Mode:" class="channel-detail__parameter-item">
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).fd_mode ? 'Yes' : 'No'
                    }}</span>
                    <el-switch v-else v-model="(form.parameters as any).fd_mode" />
                  </el-form-item>
                  <el-form-item
                    label="Interface:"
                    class="channel-detail__parameter-item"
                    style="margin-right: 0"
                  >
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).interface || '-'
                    }}</span>
                    <el-input
                      v-else
                      v-model="(form.parameters as any).interface"
                      placeholder="please enter interface"
                    />
                  </el-form-item>
                  <el-form-item label="Listen Only:" class="channel-detail__parameter-item">
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).listen_only ? 'Yes' : 'No'
                    }}</span>
                    <el-switch v-else v-model="(form.parameters as any).listen_only" />
                  </el-form-item>
                  <el-form-item
                    label="Loopback:"
                    class="channel-detail__parameter-item"
                    style="margin-right: 0"
                  >
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).loopback ? 'Yes' : 'No'
                    }}</span>
                    <el-switch v-else v-model="(form.parameters as any).loopback" />
                  </el-form-item>
                  <el-form-item
                    label="Timeout (ms):"
                    class="channel-detail__parameter-item"
                    style="margin-right: 0"
                  >
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).timeout_ms
                    }}</span>
                    <el-input-number
                      v-else
                      v-model="(form.parameters as any).timeout_ms"
                      :controls="false"
                      align="left"
                      placeholder="please enter timeout (ms)"
                    />
                  </el-form-item>
                </template>

                <template v-else-if="form.protocol === 'virt'">
                  <el-form-item label="Update Interval (ms):" class="channel-detail__parameter-item">
                    <span v-if="!isEditing" class="channel-detail__text">{{
                      (form.parameters as any).update_interval_ms
                    }}</span>
                    <el-input-number
                      v-else
                      v-model="(form.parameters as any).update_interval_ms"
                      :controls="false"
                      align="left"
                      placeholder="please enter update interval (ms)"
                    />
                  </el-form-item>
                </template>

                <ModbusRtuParams
                  v-else-if="form.protocol === 'modbus_rtu'"
                  :form="form"
                  :is-editing="isEditing"
                />

                <DiDoParams
                  v-else-if="form.protocol === 'di_do'"
                  :form="form"
                  :is-editing="isEditing"
                />
              </div>
            </div>
          </LightCollapseCard>

          <LightCollapseCard
            v-if="!isEditing && form.runtime_status"
            v-model="isRuntimeOpen"
            title="Runtime Status"
          >
            <div class="channel-detail__section">
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
          </LightCollapseCard>

          <LightCollapseCard v-model="isLoggingOpen" title="Logging">
            <div class="channel-detail__section" v-if="!isEditing">
              <el-form-item label="Enabled:">
                <span
                  class="channel-detail__text"
                  :style="{
                    color: form.logging?.enabled ? '#67C23A' : '#F56C6C',
                    fontWeight: 600,
                  }"
                >
                  {{ form.logging?.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </el-form-item>
              <el-form-item label="Level:" style="margin-right: 0">
                <span class="channel-detail__text">{{ form.logging?.level || '-' }}</span>
              </el-form-item>
            </div>
            <div class="channel-detail__section" v-else>
              <el-form-item label="Enabled:" prop="logging.enabled">
                <el-switch v-model="form.logging.enabled" />
              </el-form-item>
              <el-form-item label="Level:" style="margin-right: 0" prop="logging.level" class="channel-detail__parameter-item">
                <el-select
                  v-model="form.logging.level"
                  placeholder="Please select level"
                >
                  <el-option label="Info" value="info" />
                  <el-option label="Debug" value="debug" />
                </el-select>
              </el-form-item>
            </div>
          </LightCollapseCard>

          <LightCollapseCard v-if="!isEditing" v-model="isPointsOpen" title="Point Counts">
            <div class="channel-detail__section">
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
          </LightCollapseCard>
        </el-form>
      </div>
    </template>
    <template #dialog-footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">{{
          isAdd ? 'Cancel Add' : isEditing ? 'Cancel Edit' : 'Cancel'
        }}</el-button>
        <el-button v-if="!isEditing" type="primary" @click="handleEdit">Edit</el-button>
        <el-button v-else type="primary" @click="handleSubmit">Submit</el-button>
      </div>
    </template>
  </FormDialog>
</template>

<script lang="ts">
// 协议默认值配置 - 必须在普通 script 块中定义，以便 defineProps 可以访问
export const PROTOCOL_DEFAULTS = {
  modbus_tcp: {
    host: '127.0.0.1',
    port: 502,
    connect_timeout_ms: 5000,
    read_timeout_ms: 3000,
    max_batch_size: 64,
    poll_interval_ms: 1000,
  },
  modbus_rtu: {
    baud_rate: 9600,
    connect_timeout_ms: 5000,
    read_timeout_ms: 3000,
    max_batch_size: 64,
    poll_interval_ms: 1000,
  },
  di_do: {
    driver: 'gpiod',
    gpio_base_path: '/sys/class/gpio',
    di_poll_interval_ms: 200,
  },
}
</script>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import FormDialog from '@/components/dialog/FormDialog.vue'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import ModbusTcpParams, {
  validationRules as modbusTcpRules,
} from '@/views/Setting/Configuration/ChannelConfiguration/components/ProtocolParams/ModbusTcpParams.vue'
import ModbusRtuParams, {
  validationRules as modbusRtuRules,
} from '@/views/Setting/Configuration/ChannelConfiguration/components/ProtocolParams/ModbusRtuParams.vue'
import DiDoParams, {
  validationRules as diDoRules,
} from '@/views/Setting/Configuration/ChannelConfiguration/components/ProtocolParams/DiDoParams.vue'
import type { ChannelDetail } from '@/types/channelConfiguration'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import dayjs from 'dayjs'
import { getChannelDetail, createChannel, updateChannel } from '@/api/channelsManagement'


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
        host: PROTOCOL_DEFAULTS.modbus_tcp.host,
        port: PROTOCOL_DEFAULTS.modbus_tcp.port,
        connect_timeout_ms: PROTOCOL_DEFAULTS.modbus_tcp.connect_timeout_ms,
        read_timeout_ms: PROTOCOL_DEFAULTS.modbus_tcp.read_timeout_ms,
        max_batch_size: PROTOCOL_DEFAULTS.modbus_tcp.max_batch_size,
        poll_interval_ms: PROTOCOL_DEFAULTS.modbus_tcp.poll_interval_ms,
      },
    },
    logging: {
      enabled: true,
      level: 'debug',
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
  description: string | null
  protocol: 'modbus_tcp' | 'can' | 'virt' | 'modbus_rtu' | 'di_do'
  name: string
  parameters: ChannelDetail['parameters']
}>()
// 响应式数据
const formDialogRef = ref()
const isEditing = ref(false)
const isAdd = ref(false)
const formRef = ref<FormInstance>()
const isBasicOpen = ref(true)
const isParamsOpen = ref(true)
const isRuntimeOpen = ref(false)
const isLoggingOpen = ref(false)
const isPointsOpen = ref(false)
const channelIdMode = ref<'auto' | 'manual'>('auto')
const channelIdInput = ref<number | null>(null)
const didUpdate = ref(false)
// 表单数据
const form = ref<ChannelDetail>({
  id: 0,
  name: '',
  description: '',
  protocol: 'modbus_tcp',
  enabled: false,
  parameters: { parameters: { host: '', port: 502, retry_count: 0, timeout_ms: 2000 } as any },
  logging: {
    enabled: true,
    level: 'debug',
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

// 动态标题：新增/编辑/查看
const dialogTitle = computed(() =>
  isAdd.value ? 'Add Channel' : isEditing.value ? 'Edit Channel' : 'Channel Details',
)

// 校验规则：拆分为 TCP 与 RTU，查看模式传空对象；数字限制改由 input-number 控制
const requiredMsg = (name: string) => `${name} is required`
const baseRules: Record<string, any[]> = {
  name: [{ required: true, message: requiredMsg('Name'), trigger: 'blur' }],
  protocol: [{ required: true, message: requiredMsg('Protocol'), trigger: 'change' }],
  enabled: [{ required: true, message: requiredMsg('Enabled'), trigger: 'change' }],
  'logging.enabled': [{ required: true, message: requiredMsg('Logging Enabled'), trigger: 'change' }],
  'logging.level': [{ required: true, message: requiredMsg('Logging Level'), trigger: 'change' }],
}
const formRules = computed<Record<string, any[]>>(() => {
  if (!isEditing.value) return {}
  let protocolRules: Record<string, any[]> = {}
  if (form.value.protocol === 'modbus_tcp') {
    protocolRules = modbusTcpRules
  } else if (form.value.protocol === 'modbus_rtu') {
    protocolRules = modbusRtuRules
  } else if (form.value.protocol === 'di_do') {
    protocolRules = diDoRules
  }
  const idRules: Record<string, any[]> =
    isAdd.value && channelIdMode.value === 'manual'
      ? {
          channel_id: [
            { required: true, message: requiredMsg('Channel ID'), trigger: 'blur' },
            {
              validator: (_: any, value: any, callback: any) => {
                const num = Number(value)
                if (!Number.isInteger(num) || num < 1) {
                  callback(new Error('Must be a positive integer'))
                } else {
                  callback()
                }
              },
              trigger: 'change',
            },
          ],
        }
      : {}
  return {
    ...baseRules,
    ...idRules,
    ...protocolRules,
  }
})

const openPanelsForErrors = (fields?: Record<string, any>) => {
  if (!fields) return
  const keys = Object.keys(fields)
  let openBasic = false
  let openParams = false
  let openLogging = false
  for (const key of keys) {
    if (key.startsWith('logging.')) {
      openLogging = true
    } else if (
      key === 'name' ||
      key === 'protocol' ||
      key === 'enabled' ||
      key === 'channel_id' ||
      key === 'channel_id_mode' ||
      key === 'description'
    ) {
      openBasic = true
    } else {
      openParams = true
    }
  }
  if (openBasic) isBasicOpen.value = true
  if (openParams) isParamsOpen.value = true
  if (openLogging) isLoggingOpen.value = true
}

const applyDetail = (detail: ChannelDetail) => {
  form.value = detail
  if (!form.value.logging) {
    form.value.logging = {
      enabled: true,
      level: 'debug',
    }
  }
  copyForm.value = {
    description: detail.description,
    protocol: detail.protocol,
    name: detail.name,
    parameters: detail.parameters,
  }
}

const fetchDetail = async (id: number) => {
  const res = await getChannelDetail(id)
  if (res.success) {
    applyDetail(res.data)
  }
}

// 当协议变化时，初始化对应的参数模板
watch(
  () => form.value.protocol,
  (protocol, prev) => {
    if (!isEditing.value && !isAdd.value) return
    const protocolChanged = prev !== protocol
    const hasParams = form.value.parameters && Object.keys(form.value.parameters || {}).length > 0
    if (protocolChanged || hasParams) {
      form.value.parameters = {} as any
      // 根据协议类型设置默认值
      if (protocol === 'modbus_tcp') {
        Object.assign(form.value.parameters, PROTOCOL_DEFAULTS.modbus_tcp)
      } else if (protocol === 'modbus_rtu') {
        Object.assign(form.value.parameters, PROTOCOL_DEFAULTS.modbus_rtu)
      } else if (protocol === 'di_do') {
        Object.assign(form.value.parameters, PROTOCOL_DEFAULTS.di_do)
      }
    }
    nextTick(() => {
      formRef.value?.clearValidate()
    })
  },
  { immediate: false },
)

watch(
  channelIdMode,
  (mode) => {
    if (mode === 'auto') {
      channelIdInput.value = null
    }
    ;(form.value as any).channel_id = channelIdInput.value
    ;(form.value as any).channel_id_mode = mode
    formRef.value?.clearValidate(['channel_id'])
  },
  { immediate: false },
)

watch(
  channelIdInput,
  (value) => {
    ;(form.value as any).channel_id = value
  },
  { immediate: false },
)


// 编辑
const handleEdit = () => {
  // 确保 logging 字段存在
  if (!form.value.logging) {
    form.value.logging = {
      enabled: true,
      level: 'debug',
    }
  }
  isEditing.value = true
  nextTick(() => {
    formRef.value?.clearValidate()
  })
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
      nextTick(() => {
        form.value.parameters = JSON.parse(JSON.stringify(copyForm.value!.parameters)) as any
        formRef.value?.clearValidate()
      })
    }
  } else {
    // 如果在查看状态，关闭对话框
    if (formDialogRef.value) {
      formDialogRef.value.dialogVisible = false
    }
    if (didUpdate.value) {
      emit('submit')
    } else {
      emit('cancel')
    }
    didUpdate.value = false
  }
}

// 提交
const handleSubmit = () => {
  formRef.value?.validate(async (valid, fields) => {
    if (valid) {
      if (isAdd.value) {
        const payload: any = JSON.parse(JSON.stringify(form.value))
        delete payload.channel_id_mode
        if (channelIdMode.value === 'manual' && channelIdInput.value) {
          payload.channel_id = channelIdInput.value
        } else {
          delete payload.channel_id
        }
        const res = await createChannel(payload)
        if (res.success) {
          ElMessage.success('Channel created successfully')
          formDialogRef.value.dialogVisible = false
          isEditing.value = false
          isAdd.value = false
          emit('submit')
        }
      } else {
        if (!form.value.id) return
        const payload: any = JSON.parse(JSON.stringify(form.value))
        const res = await updateChannel(form.value.id, payload)
        if (res.success) {
          ElMessage.success('Channel updated successfully')
          isEditing.value = false
          didUpdate.value = true
          await fetchDetail(form.value.id)
        }
      }
    } else {
      openPanelsForErrors(fields)
    }
  })
}
const open = async (id: number | undefined) => {
  didUpdate.value = false
  isBasicOpen.value = true
  isParamsOpen.value = true
  isRuntimeOpen.value = false
  isLoggingOpen.value = false
  isPointsOpen.value = false
  channelIdMode.value = 'auto'
  channelIdInput.value = null
  form.value.id = id
  if (id) {
    // 打开详情：查看模式，明确重置新增标记
    isAdd.value = false
    isEditing.value = false
    await fetchDetail(id)
    formDialogRef.value.dialogVisible = true
    isEditing.value = false
  } else {
    form.value = {
      name: '',
      description: '',
      protocol: 'modbus_tcp',
      enabled: true,
      parameters: {
        ...PROTOCOL_DEFAULTS.modbus_tcp,
      },
      logging: {
        enabled: true,
        level: 'debug',
      },
    } as any
    ;(form.value as any).channel_id = null
    ;(form.value as any).channel_id_mode = 'auto'
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
  if (didUpdate.value) {
    emit('submit')
  } else {
    emit('cancel')
  }
  didUpdate.value = false
}
defineExpose({
  open,
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
.voltage-class .channel-detail-dialog {
  height: 100%;
  // max-height: 80%;
  overflow-y: auto;
  padding: 0 10px 10px 10px;
  .channel-detail-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .channel-detail__section {
    // margin-bottom: 30px;
    // padding-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    column-gap: 12px;
    row-gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
    }

    .channel-detail__section-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-color-primary;
      margin: 0 0 15px 0;
    }

    .channel-detail__parameters {
      display: flex;
      flex-wrap: wrap;
      column-gap: 12px;
      row-gap: 6px;
    }

    :deep(.el-form-item) {
      width: calc(50% - 6px);
      margin-right:0;
      margin-bottom: 0px;
    }

    .channel-detail__form-item--full {
      flex: 1 1 100%;
      min-width: 100%;
      max-width: 100%;
    }

    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-input-number) {
      width: 100% !important;
    }
  }

  // .el-form-item {
  //   margin-bottom: 0px;
  // }

  .channel-detail__text {
    color: $text-color-primary;
    font-size: 14px;
    line-height: 32px;
  }

}
</style>