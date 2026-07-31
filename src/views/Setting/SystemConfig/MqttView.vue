<template>
  <div class="system-mqtt">
    <div class="system-mqtt__header">
      <h2 class="system-mqtt__title">MQTT</h2>
      <p class="system-mqtt__desc">
        Configure MQTT connectivity, topic behavior, and runtime reconnect strategy for device telemetry.
      </p>
    </div>

    <div class="system-mqtt__panel">
      <div class="system-mqtt__body">
        <!-- ── 左侧：折叠区块 ── -->
        <div class="system-mqtt__left">
          <el-card class="system-mqtt__card">
            <div class="system-mqtt__left-panel">
              <el-form ref="formRef" :model="form" :rules="rules" label-width="200px" class="system-mqtt__form">
                <div class="system-mqtt__scroll-content">

                <!-- ① Basic Settings -->
                <LightCollapseCard v-model="openBasic" title="Basic Settings" class="system-mqtt__section-card">
              <el-form-item label="Alarm Service URL:" prop="alarmsrv_url" required>
                <el-input v-model="form.alarmsrv_url" :disabled="isBusy" placeholder="Alarm service URL" />
              </el-form-item>
              <el-form-item label="Model Service URL:" prop="modsrv_url" required>
                <el-input v-model="form.modsrv_url" :disabled="isBusy" placeholder="e.g. http://localhost:6002" />
              </el-form-item>
              <el-form-item label="Broker Host:" prop="broker_host" required>
                <el-input v-model="form.broker_host" :disabled="isBusy" placeholder="Broker host" />
              </el-form-item>
              <el-form-item label="Broker Port:" prop="broker_port" required>
                <el-input-number v-model="form.broker_port" :min="1" :max="65535" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="Broker Keepalive (s):" prop="broker_keepalive_secs" required>
                <el-input-number v-model="form.broker_keepalive_secs" :min="5" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="SSL Enabled:" prop="ssl_enabled" required>
                <el-switch v-model="form.ssl_enabled" :disabled="isBusy" />
              </el-form-item>
            </LightCollapseCard>

            <!-- ② Device Info -->
            <LightCollapseCard v-model="openDevice" title="Device Info" class="system-mqtt__section-card">
              <el-form-item label="Client ID:" prop="client_id" required>
                <el-input v-model="form.client_id" :disabled="isBusy" placeholder="Client ID" />
              </el-form-item>
              <el-form-item label="Device SN:" prop="device_sn" required>
                <el-input v-model="form.device_sn" :disabled="isBusy" placeholder="Device serial number" />
              </el-form-item>
              <el-form-item label="Product SN:" prop="product_sn" required>
                <el-input v-model="form.product_sn" :disabled="isBusy" placeholder="Product serial number" />
              </el-form-item>
            </LightCollapseCard>

            <!-- ③ Reporting -->
            <LightCollapseCard v-model="openReporting" title="Reporting" class="system-mqtt__section-card">
              <el-form-item label="Report Batch Size:" prop="report_batch_size" required>
                <el-input-number v-model="form.report_batch_size" :min="1" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="Report Interval (s):" prop="report_interval_secs" required>
                <el-input-number v-model="form.report_interval_secs" :min="1" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="Subscribe Patterns:" prop="subscribe_patterns_text" required>
                <el-input v-model="form.subscribe_patterns_text" :disabled="isBusy" type="textarea" :rows="2"
                  placeholder="Use commas to separate patterns" />
              </el-form-item>
              <el-form-item label="Exclude Patterns:" prop="exclude_patterns_text">
                <el-input v-model="form.exclude_patterns_text" :disabled="isBusy" type="textarea" :rows="2"
                  placeholder="Use commas to separate patterns" />
              </el-form-item>
            </LightCollapseCard>

            <!-- ④ Advanced -->
            <LightCollapseCard v-model="openAdvanced" title="Advanced" class="system-mqtt__section-card">
              <el-form-item label="Reconnect Delay (s):" prop="reconnect_delay_secs" required>
                <el-input-number v-model="form.reconnect_delay_secs" :min="1" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="Reconnect Max Attempts:" prop="reconnect_max_attempts" required>
                <el-input-number v-model="form.reconnect_max_attempts" :min="1" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="System Monitor Enabled:" prop="system_monitor_enabled" required>
                <el-switch v-model="form.system_monitor_enabled" :disabled="isBusy" />
              </el-form-item>
              <el-form-item label="System Monitor Interval (s):" prop="system_monitor_interval_secs" required>
                <el-input-number v-model="form.system_monitor_interval_secs" :min="1" :controls="false" align="left" :disabled="isBusy" />
              </el-form-item>
            </LightCollapseCard>

                </div><!-- /.system-mqtt__scroll-content -->
              </el-form>

              <!-- Apply 按钮 -->
              <div v-permission="'engineer'" class="system-mqtt__actions">
                <el-button type="primary" :loading="saving" :disabled="isBusy" @click="handleApply">Apply</el-button>
              </div>
            </div><!-- /.system-mqtt__left-panel -->
          </el-card>
        </div>

        <!-- ── 右侧：状态 + TLS ── -->
        <div class="system-mqtt__right">
          <el-card class="system-mqtt__status-card">
            <template #header>
              <div class="system-mqtt__status-header">
                <div class="system-mqtt__status-title">Connection Status</div>
              </div>
            </template>

            <div class="system-mqtt__status-line">
              <el-icon :class="statusIconClass">
                <component :is="statusIconComponent" />
              </el-icon>
              <span class="system-mqtt__status-text">{{ statusText }}</span>
              <el-button size="small" type="primary" class="system-mqtt__refresh-btn"
                :loading="statusLoading" :disabled="isBusy" @click="loadMqttStatus">
                Refresh
              </el-button>
            </div>

            <div class="system-mqtt__status-field">
              <span>Broker</span>
              <span class="system-mqtt__status-value">{{ mqttStatus.broker || '-' }}</span>
            </div>
            <div class="system-mqtt__status-field">
              <span>Device SN</span>
              <span class="system-mqtt__status-value">{{ mqttStatus.device_sn || '-' }}</span>
            </div>
            <div class="system-mqtt__status-field">
              <span>Product SN</span>
              <span class="system-mqtt__status-value">{{ mqttStatus.product_sn || mqttStatus.product_name || '-' }}</span>
            </div>
            <div class="system-mqtt__status-field">
              <span>SSL Enabled</span>
              <span class="system-mqtt__status-value">{{ sslStatusText }}</span>
            </div>
            <div v-permission="'engineer'" class="system-mqtt__status-actions">
              <el-button v-if="mqttStatus.connected === true" size="small"
                :loading="disconnecting" :disabled="isBusy" @click="handleDisconnect">
                Disconnect
              </el-button>
              <el-button size="small" type="primary" :loading="reconnecting" :disabled="isBusy" @click="handleReconnect">
                Reconnect
              </el-button>
            </div>
          </el-card>

          <el-card class="system-mqtt__tls-card">
            <template #header>
              <div class="system-mqtt__tls-title">TLS Certificate</div>
            </template>
            <div class="system-mqtt__tls-list" v-loading="certLoading">
              <div v-for="item in certTypeOptions" :key="item.type" class="system-mqtt__tls-row">
                <div class="system-mqtt__tls-meta">
                  <div class="system-mqtt__tls-meta-main">
                    <span class="system-mqtt__tls-label">{{ item.label }}</span>
                    <el-tag class="system-mqtt__cert-tag" size="small" :type="getCertExists(item.type) ? 'success' : 'info'">
                      {{ getCertExists(item.type) ? 'Exists' : 'Missing' }}
                    </el-tag>
                  </div>
                  <div class="system-mqtt__tls-file-name" :title="getCertFileName(item.type)">
                    {{ getCertFileName(item.type) }}
                  </div>
                </div>
                <div v-permission="'engineer'" class="system-mqtt__tls-actions">
                  <el-icon class="system-mqtt__icon-btn is-update"
                    :class="{ 'is-disabled': isBusy || certDeletingType === item.type }"
                    @click="!(isBusy || certDeletingType === item.type) && triggerCertificateUpload(item.type)">
                    <component :is="certUploadingType === item.type ? Loading : Upload" />
                  </el-icon>
                  <el-icon class="system-mqtt__icon-btn is-danger"
                    :class="{ 'is-disabled': isBusy || !getCertExists(item.type) || certUploadingType === item.type }"
                    @click="!(isBusy || !getCertExists(item.type) || certUploadingType === item.type) && handleDeleteCertificate(item.type)">
                    <component :is="certDeletingType === item.type ? Loading : Delete" />
                  </el-icon>
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { CircleCheckFilled, Delete, InfoFilled, Loading, Upload, WarningFilled } from '@element-plus/icons-vue'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import type {
  CertificateFileSnapshot,
  CertificateInfoSnapshot,
  CertificateType,
  MqttConfigPayload,
  MqttStatusSnapshot,
} from '@/types/systemConfig'
import {
  cancelCertificateDeleteRequests,
  cancelCertificateInfoRequests,
  cancelCertificateUploadRequests,
  cancelMqttConfigGetRequests,
  cancelMqttConfigUpdateRequests,
  cancelMqttDisconnectRequests,
  cancelMqttReconnectRequests,
  cancelMqttStatusGetRequests,
  deleteCertificateFile,
  disconnectMqtt,
  getCertificateInfo,
  getMqttConfig,
  getMqttStatus,
  reconnectMqtt,
  uploadCertificateFile,
  updateMqttConfig,
} from '@/api/systemConfig'

// ── 折叠面板开关：默认仅展开 Basic ───────────────────────────
const openBasic = ref(true)
const openDevice = ref(false)
const openReporting = ref(false)
const openAdvanced = ref(false)

interface MqttFormModel extends Omit<MqttConfigPayload, 'exclude_patterns' | 'subscribe_patterns'> {
  exclude_patterns_text: string
  subscribe_patterns_text: string
}

const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const disconnecting = ref(false)
const reconnecting = ref(false)
const statusLoading = ref(false)
const certLoading = ref(false)
const certUploadingType = ref<CertificateType | ''>('')
const certDeletingType = ref<CertificateType | ''>('')

const mqttStatus = reactive<MqttStatusSnapshot>({
  broker: '', connected: false, device_sn: '', product_name: '', product_sn: '', ssl_enabled: undefined,
})

const certInfo = reactive<CertificateInfoSnapshot>({ cert_dir: '', files: [] })

const certTypeOptions: Array<{ type: CertificateType; label: string }> = [
  { type: 'ca_cert', label: 'CA Cert' },
  { type: 'client_cert', label: 'Client Cert' },
  { type: 'client_key', label: 'Client Key' },
]

const form = reactive<MqttFormModel>({
  alarmsrv_url: '',
  modsrv_url: '',
  broker_host: '',
  broker_keepalive_secs: 60,
  broker_port: 1883,
  client_id: '',
  device_sn: '',
  product_sn: '',
  reconnect_delay_secs: 5,
  reconnect_max_attempts: 3,
  report_batch_size: 10,
  report_interval_secs: 5,
  ssl_enabled: false,
  system_monitor_enabled: false,
  system_monitor_interval_secs: 5,
  subscribe_patterns_text: '',
  exclude_patterns_text: '',
})

const isBusy = computed(
  () => loading.value || saving.value || disconnecting.value || reconnecting.value || statusLoading.value,
)

const statusText = computed(() => {
  if (mqttStatus.connected === true) return 'Connected'
  if (mqttStatus.connected === false) return 'Disconnected'
  return 'Unknown'
})
const statusIconComponent = computed(() => {
  if (mqttStatus.connected === true) return CircleCheckFilled
  if (mqttStatus.connected === false) return WarningFilled
  return InfoFilled
})
const statusIconClass = computed(() => {
  if (mqttStatus.connected === true) return 'is-connected'
  if (mqttStatus.connected === false) return 'is-disconnected'
  return 'is-unknown'
})
const sslStatusText = computed(() => {
  if (typeof mqttStatus.ssl_enabled === 'boolean') return mqttStatus.ssl_enabled ? 'Enabled' : 'Disabled'
  return form.ssl_enabled ? 'Enabled' : 'Disabled'
})
const certFileList = computed(() => certInfo.files || [])

const splitPatterns = (text: string) =>
  text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)

const parseMqttConfigPayload = (payload: any): Partial<MqttConfigPayload> => {
  if (payload?.data && typeof payload.data === 'object') return payload.data
  if (payload && typeof payload === 'object') return payload
  return {}
}

const parseMqttStatusPayload = (payload: any): Partial<MqttStatusSnapshot> => {
  if (payload?.data && typeof payload.data === 'object') return payload.data
  if (payload && typeof payload === 'object') return payload
  return {}
}

const validateRequired = (label: string) => (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  if (value === null || value === undefined || String(value).trim() === '')
    return cb(new Error(`${label} is required`))
  cb()
}
const validateIntMin = (label: string, min: number) => (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  const num = Number(value)
  if (!Number.isInteger(num) || num < min) return cb(new Error(`${label} must be an integer >= ${min}`))
  cb()
}
const validatePort = (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  const num = Number(value)
  if (!Number.isInteger(num) || num < 1 || num > 65535) return cb(new Error('Broker port must be between 1 and 65535'))
  cb()
}
const validatePatterns = (label: string) => (_rule: any, value: unknown, cb: (e?: Error) => void) => {
  if (splitPatterns(String(value || '')).length === 0) return cb(new Error(`${label} is required`))
  cb()
}

const rules: FormRules = {
  alarmsrv_url: [{ validator: validateRequired('Alarm Service URL'), trigger: 'blur' }],
  modsrv_url: [{ validator: validateRequired('Model Service URL'), trigger: 'blur' }],
  broker_host: [{ validator: validateRequired('Broker Host'), trigger: 'blur' }],
  broker_keepalive_secs: [{ validator: validateIntMin('Broker Keepalive', 5), trigger: 'change' }],
  broker_port: [{ validator: validatePort, trigger: 'change' }],
  client_id: [{ validator: validateRequired('Client ID'), trigger: 'blur' }],
  device_sn: [{ validator: validateRequired('Device SN'), trigger: 'blur' }],
  product_sn: [{ validator: validateRequired('Product SN'), trigger: 'blur' }],
  reconnect_delay_secs: [{ validator: validateIntMin('Reconnect Delay', 1), trigger: 'change' }],
  reconnect_max_attempts: [{ validator: validateIntMin('Reconnect Max Attempts', 1), trigger: 'change' }],
  report_batch_size: [{ validator: validateIntMin('Report Batch Size', 1), trigger: 'change' }],
  report_interval_secs: [{ validator: validateIntMin('Report Interval', 1), trigger: 'change' }],
  system_monitor_interval_secs: [{ validator: validateIntMin('System Monitor Interval', 1), trigger: 'change' }],
  subscribe_patterns_text: [{ validator: validatePatterns('Subscribe Patterns'), trigger: 'blur' }],
}

/** 校验失败时，自动展开对应折叠面板 */
const sectionFieldMap: Record<string, () => void> = {
  alarmsrv_url: () => { openBasic.value = true },
  modsrv_url: () => { openBasic.value = true },
  broker_host: () => { openBasic.value = true },
  broker_port: () => { openBasic.value = true },
  broker_keepalive_secs: () => { openBasic.value = true },
  ssl_enabled: () => { openBasic.value = true },
  client_id: () => { openDevice.value = true },
  device_sn: () => { openDevice.value = true },
  product_sn: () => { openDevice.value = true },
  report_batch_size: () => { openReporting.value = true },
  report_interval_secs: () => { openReporting.value = true },
  subscribe_patterns_text: () => { openReporting.value = true },
  exclude_patterns_text: () => { openReporting.value = true },
  reconnect_delay_secs: () => { openAdvanced.value = true },
  reconnect_max_attempts: () => { openAdvanced.value = true },
  system_monitor_enabled: () => { openAdvanced.value = true },
  system_monitor_interval_secs: () => { openAdvanced.value = true },
}

const buildPayload = (): MqttConfigPayload => ({
  alarmsrv_url: form.alarmsrv_url.trim(),
  modsrv_url: form.modsrv_url.trim(),
  broker_host: form.broker_host.trim(),
  broker_keepalive_secs: Number(form.broker_keepalive_secs),
  broker_port: Number(form.broker_port),
  client_id: form.client_id.trim(),
  device_sn: form.device_sn.trim(),
  exclude_patterns: splitPatterns(form.exclude_patterns_text),
  product_sn: form.product_sn.trim(),
  reconnect_delay_secs: Number(form.reconnect_delay_secs),
  reconnect_max_attempts: Number(form.reconnect_max_attempts),
  report_batch_size: Number(form.report_batch_size),
  report_interval_secs: Number(form.report_interval_secs),
  ssl_enabled: Boolean(form.ssl_enabled),
  subscribe_patterns: splitPatterns(form.subscribe_patterns_text),
  system_monitor_enabled: Boolean(form.system_monitor_enabled),
  system_monitor_interval_secs: Number(form.system_monitor_interval_secs),
})

const loadMqttConfig = async () => {
  cancelMqttConfigGetRequests()
  loading.value = true
  try {
    const res = await getMqttConfig()
    const payload = parseMqttConfigPayload(res)
    form.alarmsrv_url = String(payload.alarmsrv_url || '')
    form.modsrv_url = String(payload.modsrv_url || '')
    form.broker_host = String(payload.broker_host || '')
    form.broker_keepalive_secs = Number(payload.broker_keepalive_secs ?? 60)
    form.broker_port = Number(payload.broker_port ?? 1883)
    form.client_id = String(payload.client_id || '')
    form.device_sn = String(payload.device_sn || '')
    form.exclude_patterns_text = (payload.exclude_patterns || []).join(', ')
    form.product_sn = String(payload.product_sn || '')
    form.reconnect_delay_secs = Number(payload.reconnect_delay_secs ?? 5)
    form.reconnect_max_attempts = Number(payload.reconnect_max_attempts ?? 3)
    form.report_batch_size = Number(payload.report_batch_size ?? 10)
    form.report_interval_secs = Number(payload.report_interval_secs ?? 5)
    form.ssl_enabled = Boolean(payload.ssl_enabled)
    form.subscribe_patterns_text = (payload.subscribe_patterns || []).join(', ')
    form.system_monitor_enabled = Boolean(payload.system_monitor_enabled)
    form.system_monitor_interval_secs = Number(payload.system_monitor_interval_secs ?? 5)
    formRef.value?.clearValidate()
  } finally {
    loading.value = false
  }
}

const loadMqttStatus = async () => {
  cancelMqttStatusGetRequests()
  statusLoading.value = true
  try {
    const res = await getMqttStatus()
    const payload = parseMqttStatusPayload(res)
    mqttStatus.broker = String(payload.broker || '')
    mqttStatus.connected = typeof payload.connected === 'boolean' ? payload.connected : false
    mqttStatus.device_sn = String(payload.device_sn || '')
    mqttStatus.product_name = String(payload.product_name || '')
    mqttStatus.product_sn = String(payload.product_sn || '')
    mqttStatus.ssl_enabled = typeof payload.ssl_enabled === 'boolean' ? payload.ssl_enabled : undefined
  } finally {
    statusLoading.value = false
  }
}

const loadCertificateInfo = async () => {
  cancelCertificateInfoRequests()
  certLoading.value = true
  try {
    const res = await getCertificateInfo()
    const payload = (res?.data && typeof res.data === 'object' ? res.data : res) as CertificateInfoSnapshot
    certInfo.cert_dir = String(payload?.cert_dir || '')
    certInfo.files = Array.isArray(payload?.files) ? payload.files : []
  } finally {
    certLoading.value = false
  }
}

const getCertRecord = (certType: CertificateType): CertificateFileSnapshot | undefined => {
  const keywordsMap: Record<CertificateType, string[]> = {
    ca_cert: ['ca', 'rootca', 'amazonrootca'],
    client_cert: ['client', 'certificate'],
    client_key: ['private', 'key'],
  }
  const keywords = keywordsMap[certType]
  return certFileList.value.find((item) => {
    const fileName = String(item.file || '').toLowerCase()
    return keywords.some((keyword) => fileName.includes(keyword))
  })
}
const getCertExists = (certType: CertificateType) => Boolean(getCertRecord(certType)?.exists)
const getCertFileName = (certType: CertificateType) => String(getCertRecord(certType)?.file || '-')

const uploadTlsCertificate = async (certType: CertificateType, file: File) => {
  const fileName = String(file.name || '').toLowerCase()
  const allowedExtensions = ['.pem', '.crt', '.key', '.cer']
  if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
    ElMessage.error('Only .pem/.crt/.key/.cer files are supported'); return
  }
  if (file.size > 1024 * 1024) { ElMessage.error('Certificate file must be <= 1MB'); return }
  cancelCertificateUploadRequests()
  certUploadingType.value = certType
  try {
    await uploadCertificateFile(certType, file)
    ElMessage.success('Certificate uploaded')
    await loadCertificateInfo()
  } finally {
    certUploadingType.value = ''
  }
}

const triggerCertificateUpload = (certType: CertificateType) => {
  const inputEl = document.createElement('input')
  inputEl.type = 'file'
  inputEl.accept = '.pem,.crt,.key,.cer'
  inputEl.onchange = async (event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return
    await uploadTlsCertificate(certType, file)
  }
  inputEl.click()
}

const handleDeleteCertificate = async (certType: CertificateType) => {
  cancelCertificateDeleteRequests()
  certDeletingType.value = certType
  try {
    await deleteCertificateFile(certType)
    ElMessage.success('Certificate deleted')
    await loadCertificateInfo()
  } finally {
    certDeletingType.value = ''
  }
}

const handleApply = async () => {
  let valid = false
  try {
    await formRef.value?.validate()
    valid = true
  } catch (error: any) {
    const invalidField = Object.keys(error || {})[0]
    if (invalidField && sectionFieldMap[invalidField]) {
      sectionFieldMap[invalidField]()
    }
    valid = false
  }
  if (!valid) return

  cancelMqttConfigUpdateRequests()
  saving.value = true
  try {
    await updateMqttConfig(buildPayload())
    ElMessage.success('MQTT configuration applied')
    await loadMqttStatus()
  } finally {
    saving.value = false
  }
}

const handleDisconnect = async () => {
  cancelMqttDisconnectRequests()
  disconnecting.value = true
  try {
    await disconnectMqtt()
    ElMessage.success('MQTT disconnected')
    await loadMqttStatus()
  } finally {
    disconnecting.value = false
  }
}

const handleReconnect = async () => {
  cancelMqttReconnectRequests()
  reconnecting.value = true
  try {
    await reconnectMqtt()
    ElMessage.success('MQTT reconnect triggered')
    await loadMqttStatus()
  } finally {
    reconnecting.value = false
  }
}

onMounted(async () => {
  await loadMqttConfig()
  await loadMqttStatus()
  await loadCertificateInfo()
})

onUnmounted(() => {
  cancelCertificateInfoRequests()
  cancelCertificateUploadRequests()
  cancelCertificateDeleteRequests()
  cancelMqttConfigGetRequests()
  cancelMqttConfigUpdateRequests()
  cancelMqttDisconnectRequests()
  cancelMqttReconnectRequests()
  cancelMqttStatusGetRequests()
})
</script>

<style scoped lang="scss">
.system-mqtt {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.system-mqtt__header {
  margin-bottom: 24px;
}

.system-mqtt__title {
  margin: 0;
  font-size: var(--vt-font-size-lg);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-mqtt__desc {
  margin: 8px 0 0;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  line-height: 1.6;
}

.system-mqtt__panel {
  flex: 1;
  min-height: 0;
  border: var(--vt-border-width-base) solid var(--vt-border-color);
  border-radius: var(--vt-radius-md);
  background: var(--vt-bg-overlay);
  box-shadow: var(--vt-shadow-base);
}

.system-mqtt__body {
  height: 100%;
  display: flex;
  gap: 20px;
  padding: 20px;
}

.system-mqtt__left {
  flex: 1;
  min-width: 0;
}

.system-mqtt__card {
  height: 100%;
}

.system-mqtt__card :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 20px;
}

.system-mqtt__left-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-mqtt__form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.system-mqtt__scroll-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.system-mqtt__section-card {
  flex-shrink: 0;
}

// form-item 间距
:deep(.light-collapse-card) {
  .el-form-item {
    margin-bottom: 14px;
    .el-form-item:last-child { margin-bottom: 0; }
  }
}

.system-mqtt__actions {
  border-top: var(--vt-border-width-base) solid var(--vt-border-color);
  padding-top: 12px;
  margin-top: 12px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// ── Right Panel ───────────────────────────────────────────────
.system-mqtt__right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.system-mqtt__status-card {
  flex-shrink: 0;
}

.system-mqtt__status-title {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-mqtt__status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.system-mqtt__status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vt-text-primary);
  margin-bottom: 12px;

  .el-icon {
    font-size: 16px;
    .el-icon.is-connected { color: var(--vt-color-success); }
    .el-icon.is-disconnected { color: var(--vt-color-danger); }
    .el-icon.is-unknown { color: var(--vt-text-secondary); }
  }
}

.system-mqtt__refresh-btn { margin-left: auto; }

.system-mqtt__status-text {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-medium);
}

.system-mqtt__status-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--vt-border-color);
}

.system-mqtt__tls-card {
  flex-shrink: 0;
}

.system-mqtt__tls-card :deep(.el-card__body) {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.system-mqtt__tls-title {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-mqtt__tls-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.system-mqtt__tls-row {
  border: var(--vt-border-width-base) solid var(--vt-border-color);
  border-radius: var(--vt-radius-sm);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.system-mqtt__tls-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.system-mqtt__tls-meta-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-mqtt__tls-file-name {
  align-self: stretch;
  min-width: 0;
  max-width: 100%;
  color: var(--vt-text-secondary);
  font-size: var(--vt-font-size-sm);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.system-mqtt__tls-label {
  color: var(--vt-text-primary);
  font-weight: var(--vt-font-weight-medium);
}

.system-mqtt__cert-tag {
  :deep(.el-tag__content) {
    font-size: 11px;
    line-height: 16px;
  }
}

.system-mqtt__tls-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-mqtt__icon-btn {
  font-size: 18px;
  width: 30px;
  height: 30px;
  border-radius: var(--vt-radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s ease, background-color 0.2s ease;

  .system-mqtt__icon-btn.is-danger {
    color: var(--vt-color-danger);
    .system-mqtt__icon-btn.is-danger:hover { background-color: color-mix(in srgb, var(--vt-color-danger) 14%, transparent); }
  }
  .system-mqtt__icon-btn.is-disabled {
    opacity: 0.45;
    cursor: not-allowed;
    .system-mqtt__icon-btn.is-disabled:hover { background-color: transparent; }
  }
  .system-mqtt__icon-btn.is-update {
    color: #409eff;
    .system-mqtt__icon-btn.is-update:hover { background-color: rgba(64, 158, 255, 0.14); }
  }
}

.system-mqtt__status-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vt-border-color);
  color: var(--vt-text-secondary);
}

.system-mqtt__status-value {
  color: var(--vt-text-primary);
  text-align: right;
  margin-left: 10px;
}

:deep(.el-input-number) { width: 100%; }
</style>
