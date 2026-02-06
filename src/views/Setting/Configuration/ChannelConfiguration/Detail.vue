<template>
  <div class="voltage-class channel-detail-page">
    <!-- Page Header -->
    <el-page-header @back="handleBack" class="channel-detail-page__header">
      <template #content>
        <span class="channel-detail-page__header-title">{{ pageTitle }}</span>
      </template>
    </el-page-header>
    
    <div class="channel-detail-page__content">
      <el-form
        :model="form"
        :inline="true"
        label-width="150px"
        :disabled="!isEditing"
        :rules="formRules"
        :validate-on-rule-change="false"
        ref="formRef"
      >
        <!-- 基础信息 -->
        <div class="channel-detail__section">
          <h4 class="channel-detail__section-title">Basic Information</h4>
          <el-form-item label="ID:" v-if="!isAdd" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.id }}</span>
          </el-form-item>
          <el-form-item label="Name:" prop="name" class="channel-detail__form-item">
            <span v-if="!isEditing" class="channel-detail__text">{{ form.name }}</span>
            <el-input v-else v-model="form.name" placeholder="Please enter channel name" />
          </el-form-item>
          <el-form-item label="Protocol:" prop="protocol" class="channel-detail__form-item">
            <span v-if="!isEditing" class="channel-detail__text">{{
              getProtocolLabel(form.protocol)
            }}</span>
            <div class="channel-detail__protocol-select" v-else>
              <el-select
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
            </div>
          </el-form-item>
          <el-form-item v-if="!isEditing || isAdd" label="Enabled:" class="channel-detail__form-item">
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
          <el-form-item label="Description:" class="channel-detail__form-item channel-detail__form-item--full">
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
            <!-- 根据协议类型动态加载不同的参数组件 -->
            <ModbusTcpParams 
              v-if="form.protocol === 'modbus_tcp'" 
              :form="form" 
              :is-editing="isEditing" 
            />
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
        
        <!-- 运行时状态 -->
        <div class="channel-detail__section" v-if="!isEditing && form.runtime_status">
          <h4 class="channel-detail__section-title">Runtime Status</h4>
          <el-form-item label="Connected:" class="channel-detail__form-item">
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
          <el-form-item label="Running:" v-if="form.runtime_status" class="channel-detail__form-item">
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
          <el-form-item label="Last Update:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{
              formatIsoToDateTime(form.runtime_status?.last_update || '-')
            }}</span>
          </el-form-item>
          <el-form-item label="Error Count:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.runtime_status?.error_count }}</span>
          </el-form-item>
          <el-form-item label="Last Error:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{
              form.runtime_status?.last_error || 'No errors'
            }}</span>
          </el-form-item>
        </div>

        <!-- Logging 配置（查看模式） -->
        <div v-if="!isEditing" class="channel-detail__section">
          <h4 class="channel-detail__section-title">Logging</h4>
          <el-form-item label="Enabled:" class="channel-detail__form-item">
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
          <el-form-item label="Level:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.logging?.level || '-' }}</span>
          </el-form-item>
        </div>

        <!-- Logging 配置（编辑模式） -->
        <div v-if="isEditing" class="channel-detail__section">
          <h4 class="channel-detail__section-title">Logging</h4>
          <el-form-item label="Enabled:" prop="logging.enabled" class="channel-detail__form-item">
            <el-switch v-model="form.logging.enabled" />
          </el-form-item>
          <el-form-item label="Level:" prop="logging.level" class="channel-detail__form-item">
            <el-select
              v-model="form.logging.level"
              placeholder="Please select level"
            >
              <el-option label="Info" value="info" />
              <el-option label="Debug" value="debug" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 点位统计 -->
        <div v-if="!isEditing" class="channel-detail__section">
          <h4 class="channel-detail__section-title">Point Counts</h4>
          <el-form-item label="Telemetry:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.point_counts?.telemetry }}</span>
          </el-form-item>
          <el-form-item label="Signal:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.point_counts?.signal }}</span>
          </el-form-item>
          <el-form-item label="Control:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.point_counts?.control }}</span>
          </el-form-item>
          <el-form-item label="Adjustment:" class="channel-detail__form-item">
            <span class="channel-detail__text">{{ form.point_counts?.adjustment }}</span>
          </el-form-item>
        </div>
      </el-form>
    </div>
    
    <!-- 操作按钮 -->
    <div class="channel-detail-page__footer">
      <el-button @click="handleCancel">{{
        isAdd ? 'Cancel Add' : isEditing ? 'Cancel Edit' : 'Cancel'
      }}</el-button>
      <el-button v-if="!isEditing" type="primary" @click="handleEdit">Edit</el-button>
      <el-button v-else type="primary" @click="handleSubmit">Submit</el-button>
    </div>
  </div>
</template>

<script lang="ts">
// 协议默认值配置
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
import { ref, watch, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import ModbusTcpParams, { validationRules as modbusTcpRules } from './components/ProtocolParams/ModbusTcpParams.vue'
import ModbusRtuParams, { validationRules as modbusRtuRules } from './components/ProtocolParams/ModbusRtuParams.vue'
import DiDoParams, { validationRules as diDoRules } from './components/ProtocolParams/DiDoParams.vue'
import type {
  ChannelDetail,
  modbusTcpParams,
  modbusRtuParams,
} from '@/types/channelConfiguration'
import { PROTOCOL_OPTIONS } from '@/types/channelConfiguration'
import dayjs from 'dayjs'
import { getChannelDetail, createChannel, updateChannel } from '@/api/channelsManagement'

type diDoParams = {
  di_poll_interval_ms: number
  driver: string
  gpio_base_path: string
}

const route = useRoute()
const router = useRouter()

// 响应式数据
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

const copyForm = ref<{
  description: string
  protocol: 'modbus_tcp' | 'can' | 'virt' | 'modbus_rtu' | 'di_do'
  name: string
  parameters: modbusTcpParams | modbusRtuParams | diDoParams
}>()

// 格式化时间
const formatIsoToDateTime = (isoString: string) => {
  return dayjs(isoString).format('YYYY-MM-DD HH:mm:ss')
}

// 获取协议标签
const getProtocolLabel = (protocol: string) => {
  const option = PROTOCOL_OPTIONS.find((opt) => opt.value === protocol)
  return option ? option.label : protocol
}

// 基础验证规则（所有协议共用）
const requiredMsg = (name: string) => `${name} is required`
const baseRules: Record<string, any[]> = {
  name: [{ required: true, message: requiredMsg('Name'), trigger: 'blur' }],
  protocol: [{ required: true, message: requiredMsg('Protocol'), trigger: 'change' }],
  'logging.enabled': [{ required: true, message: requiredMsg('Logging Enabled'), trigger: 'change' }],
  'logging.level': [{ required: true, message: requiredMsg('Logging Level'), trigger: 'change' }],
}

// 合并基础规则和协议特定规则
const formRules = computed<Record<string, any[]>>(() => {
  if (!isEditing.value) return {}
  
  // 获取协议特定的验证规则
  let protocolRules: Record<string, any[]> = {}
  if (form.value.protocol === 'modbus_tcp') {
    protocolRules = modbusTcpRules
  } else if (form.value.protocol === 'modbus_rtu') {
    protocolRules = modbusRtuRules
  } else if (form.value.protocol === 'di_do') {
    protocolRules = diDoRules
  }
  
  // 合并基础规则和协议规则
  return {
    ...baseRules,
    ...protocolRules,
  }
})

// 页面标题
const pageTitle = computed(() => {
  const mode = route.query.mode as string
  const id = route.query.id as string
  
  if (mode === 'add') {
    return 'Add Channel'
  } else if (mode === 'edit') {
    return `Edit Channel${id ? ` #${id}` : ''}`
  } else {
    return `Channel Details${id ? ` #${id}` : ''}`
  }
})

// 返回处理
const handleBack = () => {
  router.push('/channelConfiguration')
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

// 初始化数据
const initData = async () => {
  const mode = route.query.mode as string
  const id = route.query.id as string
  
  if (mode === 'add') {
    // 新增模式
    isAdd.value = true
    isEditing.value = true
    form.value = {
      name: '',
      description: '',
      protocol: 'modbus_tcp',
      enabled: false,
      parameters: {
        ...PROTOCOL_DEFAULTS.modbus_tcp,
      },
      logging: {
        enabled: true,
        level: 'debug',
      },
    } as any
  } else if (id) {
    // 详情或编辑模式
    isAdd.value = false
    isEditing.value = mode === 'edit'
    
    const res = await getChannelDetail(Number(id))
    if (res.success) {
      form.value = res.data
      // 如果没有 logging，设置默认值
      if (!form.value.logging) {
        form.value.logging = {
          enabled: true,
          level: 'debug',
        }
      }
      copyForm.value = {
        description: res.data.description,
        protocol: res.data.protocol,
        name: res.data.name,
        parameters: res.data.parameters,
      }
    }
  }
}

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
  // 更新路由，添加 mode=edit
  router.replace({
    query: {
      ...route.query,
      mode: 'edit',
    },
  })
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
    // 更新路由，移除 mode
    router.replace({
      query: {
        id: route.query.id,
      },
    })
  } else {
    // 返回列表页
    router.push('/channelConfiguration')
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
          router.push('/channelConfiguration')
        }
      } else {
        if (!form.value.id) return
        // 更新时不携带 enabled 字段
        const payload: any = JSON.parse(JSON.stringify(form.value))
        delete payload.enabled
        const res = await updateChannel(form.value.id, payload)
        if (res.success) {
          ElMessage.success('Channel updated successfully')
          // 更新后返回查看模式
          isEditing.value = false
          router.replace({
            query: {
              id: route.query.id,
            },
          })
          // 重新加载数据
          await initData()
        }
      }
    }
  })
}

onMounted(() => {
  initData()
})

// 监听路由变化
watch(
  () => route.query,
  () => {
    initData()
  },
  { deep: true },
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.voltage-class.channel-detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .channel-detail-page__header {
    margin-bottom: 20px;
  }
  
  .channel-detail-page__content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .channel-detail-page__footer {
    padding: 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  
  .channel-detail__section {
    margin-top: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .channel-detail__section-title {
      font-size: $font-size-large;
      font-weight: $font-weight-semibold;
      color: $text-color-primary;
      margin: 0 0 15px 0;
    }

    .channel-detail__parameters {
      display: block;
    }
  }

  .el-form-item {
    
    &.channel-detail__form-item {
      width: calc(33.33% - 14px) !important;
      &:nth-child(3n) {
        margin-right: 0 !important;
      }
      
      // 确保 label 宽度一致
      :deep(.el-form-item__label) {
        width: 150px !important;
        min-width: 150px;
      }
    }
    
    &.channel-detail__form-item--full {
      min-width: calc(100% - 10px);
      max-width: calc(100% - 10px);
      margin-right: 0;
    }
  }

  .channel-detail__text {
    color: $text-color-primary;
    font-size: 14px;
    line-height: 1.5;
  }
  
  // 设置所有 el-select、el-input 宽度为 100%
  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-select),
  :deep(.el-textarea__inner) {
    width: 100% !important;
  }
  
  .channel-detail__protocol-select {
    width: 100%;
    
    :deep(.el-select) {
      width: 100% !important;
    }
  }
  
  .channel-detail-page__header-title {
    font-size: $font-size-large;
    font-weight: $font-weight-semibold;
    color: $text-color-primary;
  }
}
</style>
