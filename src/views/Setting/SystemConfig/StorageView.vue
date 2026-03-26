<template>
  <div class="system-storage">
    <div class="system-storage__header">
      <h2 class="system-storage__title">Storage</h2>
      <p class="system-storage__desc">
        Configure PostgreSQL backend for historical data storage and verify connection health.
      </p>
    </div>

    <div class="system-storage__panel">
      <div class="system-storage__body">
        <div class="system-storage__left">
          <el-card class="system-storage__card">
            <template #header>
              <div class="system-storage__card-header">
                <span class="system-storage__card-title">Connection Settings</span>
                <div class="system-storage__enable">
                  <span class="system-storage__enable-label">Enable Storage</span>
                  <el-switch v-model="form.enabled" :disabled="loading || saving || applying" />
                </div>
              </div>
            </template>
            <div class="system-storage__card-body">
              <div class="system-storage__form-scroll">
                <el-form ref="formRef" :model="form" :rules="rules" label-width="98px" class="system-storage__form">
                  <el-form-item label="Backend:" prop="backend" required>
                    <el-select v-model="form.backend" :disabled="loading || saving || applying">
                      <el-option label="PostgreSQL" value="postgres" />
                      <el-option label="TimescaleDB" value="timescaledb" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="Host:" prop="host" required>
                    <el-input v-model="form.host" :disabled="loading || saving || applying" placeholder="Host address" />
                  </el-form-item>

                  <el-form-item label="Port:" prop="port" required>
                    <el-input-number v-model="form.port" :min="1" :max="65535" :controls="false" align="left"
                      :disabled="loading || saving || applying" />
                  </el-form-item>

                  <el-form-item label="Database:" prop="database" required>
                    <el-input v-model="form.database" :disabled="loading || saving || applying"
                      placeholder="Database name" />
                  </el-form-item>

                  <el-form-item label="Username:" prop="username" required>
                    <el-input v-model="form.username" :disabled="loading || saving || applying"
                      placeholder="Database username" />
                  </el-form-item>

                  <el-form-item label="Password:" prop="password" required>
                    <el-input v-model="form.password" :disabled="loading || saving || applying"
                      placeholder="Database password" show-password />
                  </el-form-item>
                </el-form>
              </div>

              <div class="system-storage__actions">
                <el-button :loading="testing" :disabled="loading || saving || applying" @click="handleTest">
                  Test Connection
                </el-button>
                <el-button type="primary" class="system-storage__save-btn" :loading="saving"
                  :disabled="loading || applying || testing" @click="handleSave">
                  Save
                </el-button>
                <el-button type="primary" class="system-storage__apply-btn" :loading="applying"
                  :disabled="loading || saving || testing || !form.enabled" @click="handleApply">
                  Apply
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <div class="system-storage__right">
          <el-card class="system-storage__status-card">
            <template #header>
              <div class="system-storage__status-title">Connection Status</div>
            </template>

            <div class="system-storage__status-line">
              <AppIcon :name="statusIconName" className="system-storage__status-icon" :class="statusIconClass" />
              <span class="system-storage__status-text">{{ statusText }}</span>
            </div>
            <div class="system-storage__status-field">
              <span>Active Backend</span>
              <span class="system-storage__status-value">{{ activeBackend }}</span>
            </div>

          </el-card>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import type {
  StorageConfigRequest,
  StorageConfigSnapshot,
  StorageConnectionState,
  StorageGetResponseData,
  StorageTestRequest,
} from '@/types/systemConfig'
import {
  cancelStorageGetRequests,
  cancelStorageReconnectRequests,
  cancelStorageTestRequests,
  cancelStorageUpdateRequests,
  getStorageConfig,
  reconnectStorage,
  testStorageConnection,
  updateStorageConfig,
} from '@/api/systemConfig'

const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const applying = ref(false)
const connectionState = ref<StorageConnectionState>('unknown')
const activeBackend = ref('Unknown')

const form = ref<StorageConfigRequest>({
  backend: 'postgres',
  database: '',
  enabled: false,
  host: '',
  password: '',
  port: 5432,
  username: '',
})

const toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return ['true', '1', 'yes', 'on', 'enabled'].includes(value.toLowerCase())
  return false
}

const toPort = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 5432
}

const normalizeStorageSnapshot = (payload: unknown): StorageConfigSnapshot => {
  const container = (payload || {}) as StorageGetResponseData
  if (container?.data && typeof container.data === 'object') return container.data
  if (container && typeof container === 'object') return container as StorageConfigSnapshot
  return {}
}

const parseConnectionState = (payload: unknown): StorageConnectionState => {
  const statusPayload = normalizeStorageSnapshot(payload)
  const connected = statusPayload.connected
  if (typeof connected === 'boolean') return connected ? 'connected' : 'disconnected'

  const stateText = String(statusPayload.state ?? statusPayload.status ?? statusPayload.message ?? '')
    .toLowerCase()
    .trim()
  if (!stateText) return 'unknown'
  if (stateText.includes('connect') && !stateText.includes('dis')) return 'connected'
  if (stateText.includes('disconnect') || stateText.includes('fail') || stateText.includes('error'))
    return 'disconnected'
  return 'unknown'
}

const applyStorageData = (payload: unknown) => {
  const configPayload = normalizeStorageSnapshot(payload)
  form.value = {
    backend: String(configPayload.backend || form.value.backend || 'postgres'),
    database: String(configPayload.database || ''),
    enabled: toBoolean(configPayload.enabled),
    host: String(configPayload.host || ''),
    password: typeof configPayload.password === 'string' ? configPayload.password : '',
    port: toPort(configPayload.port),
    username: String(configPayload.username || ''),
  }
  connectionState.value = parseConnectionState(payload)
  activeBackend.value = String(configPayload.active_backend || configPayload.backend || 'Unknown')
}

const statusText = computed(() => {
  if (connectionState.value === 'connected') return 'Connected'
  if (connectionState.value === 'disconnected') return 'Disconnected'
  return 'Unknown'
})

const statusIconName = computed(() => {
  if (connectionState.value === 'connected') return 'i-tabler-circle-check-filled'
  if (connectionState.value === 'disconnected') return 'i-tabler-alert-circle-filled'
  return 'i-tabler-info-circle-filled'
})

const statusIconClass = computed(() => {
  if (connectionState.value === 'connected') return 'is-connected'
  if (connectionState.value === 'disconnected') return 'is-disconnected'
  return 'is-unknown'
})

const validateRequired = (fieldLabel: string) => (_rule: any, value: unknown, callback: (error?: Error) => void) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return callback(new Error(`${fieldLabel} is required`))
  }
  callback()
}

const validatePort = (_rule: any, value: unknown, callback: (error?: Error) => void) => {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < 1 || numberValue > 65535) {
    return callback(new Error('Port must be between 1 and 65535'))
  }
  callback()
}

const rules: FormRules = {
  backend: [{ required: true, message: 'Backend is required', trigger: 'change' }],
  host: [{ validator: validateRequired('Host'), trigger: 'blur' }],
  port: [{ validator: validatePort, trigger: 'change' }],
  database: [{ validator: validateRequired('Database'), trigger: 'blur' }],
  username: [{ validator: validateRequired('Username'), trigger: 'blur' }],
  password: [{ validator: validateRequired('Password'), trigger: 'blur' }],
}

const loadStorageConfig = async () => {
  cancelStorageGetRequests()
  loading.value = true
  try {
    const res = await getStorageConfig()
    // Compatible with both wrapped responses ({ data: {...}, status: 'success' })
    // and plain object responses ({ backend, host, ... }).
    applyStorageData(res)
  } finally {
    loading.value = false
  }
}

const saveStorageConfig = async (showSuccessMessage = true) => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return false

  cancelStorageUpdateRequests()
  saving.value = true
  try {
    const payload: StorageConfigRequest = {
      ...form.value,
      port: form.value.port ? Number(form.value.port) : null,
    }
    const res = await updateStorageConfig(payload)
    if (showSuccessMessage) {
      ElMessage.success('Storage configuration saved')
    }
    connectionState.value = parseConnectionState(res)
    return true
  } finally {
    saving.value = false
  }
}

const handleSave = async () => {
  await saveStorageConfig()
}

const handleTest = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  cancelStorageTestRequests()
  testing.value = true
  try {
    const payload: StorageTestRequest = {
      backend: form.value.backend,
      host: form.value.host,
      password: form.value.password,
      port: form.value.port ? Number(form.value.port) : null,
      username: form.value.username,
    }
    const res = await testStorageConnection(payload)
    const nextState = parseConnectionState(res)
    connectionState.value = nextState === 'unknown' ? 'connected' : nextState
    ElMessage.success('Connection test succeeded')
  } finally {
    testing.value = false
  }
}

const handleApply = async () => {
  if (!form.value.enabled) return

  const saved = await saveStorageConfig(false)
  if (!saved) return

  cancelStorageReconnectRequests()
  applying.value = true
  try {
    const res = await reconnectStorage()
    const nextState = parseConnectionState(res)
    connectionState.value = nextState === 'unknown' ? 'connected' : nextState
    ElMessage.success('Storage applied')
  } finally {
    applying.value = false
  }
}

onMounted(async () => {
  await loadStorageConfig()
})

onUnmounted(() => {
  cancelStorageGetRequests()
  cancelStorageUpdateRequests()
  cancelStorageTestRequests()
  cancelStorageReconnectRequests()
})
</script>

<style scoped lang="scss">
.system-storage {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-storage__header {
  margin-bottom: 24px;
}

.system-storage__title {
  margin: 0;
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.system-storage__desc {
  margin: 8px 0 0;
  font-size: $font-size-small;
  color: $text-color-secondary;
  line-height: 1.6;
}

.system-storage__panel {
  flex: 1;
  min-height: 0;
  border: $border-width-base solid $border-color-base;
  border-radius: $border-radius-base;
  background: $bg-color-overlay;
  box-shadow: $box-shadow-base;
}

.system-storage__body {
  height: 100%;
  display: flex;
  gap: 20px;
  padding: 20px;
}

.system-storage__left {
  flex: 1;
  min-width: 0;
}

.system-storage__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-storage__card-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.system-storage__form-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
}

.system-storage__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.system-storage__card-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.system-storage__enable {
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-storage__enable-label {
  color: $text-color-secondary;
  font-size: $font-size-small;
}

.system-storage__form {
  display: flex;
  flex-direction: column;
}

.system-storage__actions {
  border-top: $border-width-base solid $border-color-base;
  padding-top: 12px;
  margin-top: 12px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// .system-storage__save-btn {
//   min-width: 86px;
// }

// .system-storage__apply-btn {
//   min-width: 96px;
// }

.system-storage__right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.system-storage__status-card {
  flex-shrink: 0;
}

.system-storage__status-title {
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  color: $text-color-primary;
}

.system-storage__status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $text-color-primary;
  margin-bottom: 12px;
}

.system-storage__status-icon {
  font-size: 16px;

  &.is-connected {
    color: $success-color;
  }

  &.is-disconnected {
    color: $danger-color;
  }

  &.is-unknown {
    color: $text-color-secondary;
  }
}

.system-storage__status-text {
  font-size: $font-size-base;
  font-weight: $font-weight-medium;
}

.system-storage__status-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid $border-color-base;
  color: $text-color-secondary;
}

.system-storage__status-value {
  color: $text-color-primary;
  text-align: right;
  margin-left: 10px;
}
</style>
