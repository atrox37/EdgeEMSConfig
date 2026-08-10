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
        <!-- ── 左侧：折叠区块 ── -->
        <div class="system-storage__left">
          <el-card class="system-storage__card">
            <div class="system-storage__left-panel">
              <div class="system-storage__scroll-content">

              <!-- ① Connection Settings -->
              <LightCollapseCard v-model="openConnection" title="Connection Settings" class="system-storage__section-card">
            <div class="system-storage__enable-row">
              <span class="system-storage__enable-label">Enable Storage</span>
              <el-switch v-model="form.enabled" :disabled="loading || saving || applying" />
            </div>
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
                <el-input v-model="form.database" :disabled="loading || saving || applying" placeholder="Database name" />
              </el-form-item>
              <el-form-item label="Username:" prop="username" required>
                <el-input v-model="form.username" :disabled="loading || saving || applying" placeholder="Database username" />
              </el-form-item>
              <el-form-item label="Password:" prop="password" required>
                <el-input v-model="form.password" :disabled="loading || saving || applying"
                  placeholder="Database password" show-password />
              </el-form-item>
            </el-form>

            <template #footer>
              <div v-permission="'engineer'">
              <el-button :loading="testing" :disabled="loading || saving || applying" @click="handleTest">
                Test Connection
              </el-button>
              <el-button type="primary" :loading="saving" :disabled="loading || applying || testing" @click="handleSave">
                Save
              </el-button>
              <el-button type="primary" :loading="applying" :disabled="loading || saving || testing || !form.enabled"
                @click="handleApply">
                Apply
              </el-button>
              </div>
            </template>
          </LightCollapseCard>

          <!-- ② History Service -->
          <LightCollapseCard v-model="openHistory" title="History Service" class="system-storage__section-card">
            <div class="system-storage__form-wrap" v-loading="hisLoading">
              <el-form ref="hisFormRef" :model="hisForm" :rules="hisRules" label-width="210px" class="system-storage__form">
                <el-form-item label="Batch Size:" prop="batch_size">
                  <el-input-number v-model="hisForm.batch_size" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Collection Interval (s):" prop="collection_interval_secs">
                  <el-input-number v-model="hisForm.collection_interval_secs" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Flush Interval (s):" prop="flush_interval_secs">
                  <el-input-number v-model="hisForm.flush_interval_secs" :min="30" :max="600" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Cleanup Enabled:" prop="cleanup_enabled">
                  <el-switch v-model="hisForm.cleanup_enabled" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Cleanup Older Than (days):" prop="cleanup_older_than_days">
                  <el-input-number v-model="hisForm.cleanup_older_than_days" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Max Time Range (days):" prop="max_time_range_days">
                  <el-input-number v-model="hisForm.max_time_range_days" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Default Page Size:" prop="default_page_size">
                  <el-input-number v-model="hisForm.default_page_size" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>
                <el-form-item label="Max Page Size:" prop="max_page_size">
                  <el-input-number v-model="hisForm.max_page_size" :min="1" :controls="false" align="left" :disabled="hisSaving" />
                </el-form-item>

                <!-- Subscribe Patterns -->
                <el-form-item label="Subscribe Patterns:" class="system-storage__patterns-item">
                  <div class="system-storage__patterns">
                    <div class="system-storage__patterns-header">
                      <span class="system-storage__patterns-col">Pattern</span>
                      <span class="system-storage__patterns-col">Interval</span>
                      <span></span>
                    </div>
                    <div
                      v-for="(row, index) in subscribePatternRows"
                      :key="index"
                      class="system-storage__pattern-row"
                    >
                      <el-input
                        v-model="row.pattern"
                        placeholder="e.g. inst:*:M"
                        :disabled="hisSaving"
                      />
                      <div class="system-storage__interval-cell">
                        <el-select
                          v-model="row.useGlobal"
                          :disabled="hisSaving"
                          class="system-storage__interval-select"
                          @change="() => { if (row.useGlobal) row.interval = null }"
                        >
                          <el-option label="Use Global" :value="true" />
                          <el-option label="Custom (s)" :value="false" />
                        </el-select>
                        <el-input-number
                          v-if="!row.useGlobal"
                          v-model="row.interval"
                          :min="1"
                          :controls="false"
                          align="left"
                          placeholder="seconds"
                          :disabled="hisSaving"
                          class="system-storage__interval-input"
                        />
                      </div>
                      <el-button
                        type="danger"
                        size="small"
                        circle
                        :disabled="hisSaving"
                        @click="removePatternRow(index)"
                      >
                        <AppIcon name="i-tabler-trash" className="system-storage__icon-sm" />
                      </el-button>
                    </div>
                    <el-button size="small" :disabled="hisSaving" class="system-storage__add-btn" @click="addPatternRow">
                      <AppIcon name="i-tabler-plus" className="system-storage__icon-sm" />
                      Add Pattern
                    </el-button>
                  </div>
                </el-form-item>
              </el-form>
            </div>

            <template #footer>
              <el-button v-permission="'engineer'" type="primary" :loading="hisSaving" :disabled="hisLoading" @click="handleHisSave">
                Apply
              </el-button>
            </template>
          </LightCollapseCard>

              </div><!-- /.system-storage__scroll-content -->
            </div><!-- /.system-storage__left-panel -->
          </el-card>
        </div>

        <!-- ── 右侧：连接状态 ── -->
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import type {
  HisServiceConfig,
  StorageConfigRequest,
  StorageConfigSnapshot,
  StorageConnectionState,
  StorageGetResponseData,
  StorageTestRequest,
} from '@/types/systemConfig'
import {
  cancelHisConfigGetRequests,
  cancelHisConfigUpdateRequests,
  cancelStorageGetRequests,
  cancelStorageReconnectRequests,
  cancelStorageTestRequests,
  cancelStorageUpdateRequests,
  getHisConfig,
  getStorageConfig,
  reconnectStorage,
  testStorageConnection,
  updateHisConfig,
  updateStorageConfig,
} from '@/api/systemConfig'

// ── 折叠面板开关 ──────────────────────────────────────────────
const openConnection = ref(true)   // 默认展开连接设置
const openHistory = ref(true)      // 历史服务默认展开

// ── Storage ───────────────────────────────────────────────────
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
    .toLowerCase().trim()
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

const validateRequired = (label: string) => (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  if (value === null || value === undefined || String(value).trim() === '')
    return cb(new Error(`${label} is required`))
  cb()
}
const validatePort = (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1 || n > 65535) return cb(new Error('Port must be between 1 and 65535'))
  cb()
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
    applyStorageData(res)
  } finally {
    loading.value = false
  }
}

const saveStorageConfig = async (showMsg = true) => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return false
  cancelStorageUpdateRequests()
  saving.value = true
  try {
    const payload: StorageConfigRequest = { ...form.value, port: form.value.port ? Number(form.value.port) : null }
    const res = await updateStorageConfig(payload)
    if (showMsg) ElMessage.success('Storage configuration saved')
    connectionState.value = parseConnectionState(res)
    return true
  } finally {
    saving.value = false
  }
}

const handleSave = () => saveStorageConfig()

const handleTest = async () => {
  const valid = await formRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  cancelStorageTestRequests()
  testing.value = true
  try {
    const payload: StorageTestRequest = {
      backend: form.value.backend, host: form.value.host, password: form.value.password,
      port: form.value.port ? Number(form.value.port) : null, username: form.value.username,
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

// ── History Service ────────────────────────────────────────────
interface PatternRow { pattern: string; useGlobal: boolean; interval: number | null }

const hisFormRef = ref<FormInstance>()
const hisLoading = ref(false)
const hisSaving = ref(false)
const hisLoaded = ref(false)

const hisForm = ref<Omit<HisServiceConfig, 'subscribe_patterns' | 'exclude_patterns'>>({
  batch_size: 1000,
  cleanup_enabled: true,
  cleanup_older_than_days: 30,
  collection_interval_secs: 30,
  default_page_size: 100,
  flush_interval_secs: 60,
  max_page_size: 1000,
  max_time_range_days: 365,
})

const subscribePatternRows = ref<PatternRow[]>([])

const addPatternRow = () => subscribePatternRows.value.push({ pattern: '', useGlobal: true, interval: null })
const removePatternRow = (i: number) => subscribePatternRows.value.splice(i, 1)

const buildSubscribePatterns = (): Record<string, number | null> => {
  const result: Record<string, number | null> = {}
  for (const row of subscribePatternRows.value) {
    const key = row.pattern.trim()
    if (!key) continue
    result[key] = row.useGlobal ? null : (row.interval ?? null)
  }
  return result
}

const applyHisConfig = (data: HisServiceConfig) => {
  hisForm.value = {
    batch_size: Number(data.batch_size ?? 1000),
    cleanup_enabled: Boolean(data.cleanup_enabled),
    cleanup_older_than_days: Number(data.cleanup_older_than_days ?? 30),
    collection_interval_secs: Number(data.collection_interval_secs ?? 30),
    default_page_size: Number(data.default_page_size ?? 100),
    flush_interval_secs: Number(data.flush_interval_secs ?? 60),
    max_page_size: Number(data.max_page_size ?? 1000),
    max_time_range_days: Number(data.max_time_range_days ?? 365),
  }
  const patterns = data.subscribe_patterns || {}
  if (Array.isArray(patterns)) {
    subscribePatternRows.value = (patterns as string[]).map((p) => ({ pattern: p, useGlobal: true, interval: null }))
  } else {
    subscribePatternRows.value = Object.entries(patterns).map(([k, v]) => ({
      pattern: k, useGlobal: v === null || v === 0, interval: typeof v === 'number' && v > 0 ? v : null,
    }))
  }
}

const loadHisConfig = async () => {
  if (hisLoaded.value) return
  cancelHisConfigGetRequests()
  hisLoading.value = true
  try {
    const res = await getHisConfig()
    const data = (res as any)?.data ?? res
    if (data && typeof data === 'object' && 'batch_size' in data) {
      applyHisConfig(data as HisServiceConfig)
      hisLoaded.value = true
    }
  } finally {
    hisLoading.value = false
  }
}

const handleHisSave = async () => {
  const valid = await hisFormRef.value?.validate().then(() => true).catch(() => false)
  if (!valid) return
  cancelHisConfigUpdateRequests()
  hisSaving.value = true
  try {
    const payload: HisServiceConfig = {
      ...hisForm.value, exclude_patterns: [], subscribe_patterns: buildSubscribePatterns(),
    }
    await updateHisConfig(payload)
    ElMessage.success('History service configuration saved')
  } finally {
    hisSaving.value = false
  }
}

// History Service 表单校验规则
const hisRules = computed(() => ({
  flush_interval_secs: [
    {
      validator: (_rule: any, value: number, cb: (e?: Error) => void) => {
        if (value < 30 || value > 600) return cb(new Error('Flush Interval must be between 30 and 600'))
        if (value < hisForm.value.collection_interval_secs) {
          return cb(new Error(`Flush Interval must be ≥ Collection Interval (${hisForm.value.collection_interval_secs}s)`))
        }
        cb()
      },
      trigger: 'change',
    },
  ],
  collection_interval_secs: [
    {
      validator: (_rule: any, value: number, cb: (e?: Error) => void) => {
        if (!value || value < 1) return cb(new Error('Collection Interval must be ≥ 1'))
        cb()
      },
      trigger: 'change',
    },
  ],
}))

// 展开历史服务面板时懒加载（已提前加载则跳过）
watch(openHistory, (open) => {
  if (open) loadHisConfig()
})

onMounted(() => {
  loadStorageConfig()
  loadHisConfig()
})

onUnmounted(() => {
  cancelStorageGetRequests()
  cancelStorageUpdateRequests()
  cancelStorageTestRequests()
  cancelStorageReconnectRequests()
  cancelHisConfigGetRequests()
  cancelHisConfigUpdateRequests()
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
  font-size: var(--vt-font-size-lg);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-storage__desc {
  margin: 8px 0 0;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  line-height: 1.6;
}

.system-storage__panel {
  flex: 1;
  min-height: 0;
  border: var(--vt-border-width-base) solid var(--vt-border-color);
  border-radius: var(--vt-radius-md);
  // background: var(--vt-bg-overlay);
  box-shadow: var(--vt-shadow-base);
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
}

.system-storage__card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
}

.system-storage__left-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-storage__scroll-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.system-storage__section-card {
  flex-shrink: 0;
}

.system-storage__form {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}

.system-storage__form-wrap {
  min-height: 60px;
}

.system-storage__enable-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.system-storage__enable-label {
  color: var(--vt-text-secondary);
  font-size: var(--vt-font-size-sm);
}

.system-storage__hint {
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  margin-left: 8px;
  white-space: nowrap;
}

// ── Subscribe Patterns ────────────────────────────────────────
.system-storage__patterns-item {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: flex-start;
  }
}

.system-storage__patterns {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.system-storage__patterns-header {
  display: grid;
  grid-template-columns: 1fr 300px 36px;
  gap: 8px;
  padding: 0 2px 4px;
  border-bottom: 1px solid var(--vt-color-white-10);
}

.system-storage__patterns-col {
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
}

.system-storage__pattern-row {
  display: grid;
  grid-template-columns: 1fr 300px 36px;
  gap: 8px;
  align-items: center;
}

.system-storage__interval-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}

.system-storage__interval-select {
  width: 150px;
  flex-shrink: 0;
}

.system-storage__interval-input {
  // width: 100px !important;

  // flex-shrink: 0;
  flex:1;
}

.system-storage__add-btn {
  align-self: flex-start;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.system-storage__icon-sm {
  width: 14px;
  height: 14px;
}

// ── Right Panel ───────────────────────────────────────────────
.system-storage__right {
  width: 280px;
  flex-shrink: 0;
  align-self: flex-start;
  position: sticky;
  top: 0;
}

.system-storage__status-card {
  flex-shrink: 0;
}

.system-storage__status-title {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-storage__status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vt-text-primary);
  margin-bottom: 12px;
}

.system-storage__status-icon {
  font-size: 16px;
  .system-storage__status-icon.is-connected { color: var(--vt-color-success); }
  .system-storage__status-icon.is-disconnected { color: var(--vt-color-danger); }
  .system-storage__status-icon.is-unknown { color: var(--vt-text-secondary); }
}

.system-storage__status-text {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-medium);
}

.system-storage__status-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vt-border-color);
  color: var(--vt-text-secondary);
}

.system-storage__status-value {
  color: var(--vt-text-primary);
  text-align: right;
  margin-left: 10px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
