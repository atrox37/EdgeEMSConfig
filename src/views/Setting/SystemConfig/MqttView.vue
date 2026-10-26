<template>
  <div class="system-mqtt">
    <div class="system-mqtt__header">
      <div class="system-mqtt__title-row">
        <h2 class="system-mqtt__title">Cloud Link</h2>
        <span v-permission="'engineer'" class="system-mqtt__header-sync">
          <el-button
            type="primary"
            :loading="syncing"
            :disabled="isBusy || mqttStatus.connected !== true"
            @click="handleSyncToCloud"
          >
            <AppIcon v-if="!syncing" name="i-tabler-cloud-upload" />
            Sync to Cloud
          </el-button>
        </span>
      </div>
      <p class="system-mqtt__desc">
        Configure MQTT and TLS for the cloud platform, then publish saved device models and topology when linked.
      </p>
    </div>

    <div class="system-mqtt__panel">
      <div class="system-mqtt__body">
        <div class="system-mqtt__left">
          <el-card class="system-mqtt__card">
            <div class="system-mqtt__left-panel">
              <el-form
                ref="formRef"
                :model="form"
                :rules="rules"
                label-width="180px"
                class="system-mqtt__form"
              >
                <div class="system-mqtt__scroll-content">
          <LightCollapseCard
            v-model="openBasic"
            title="Cloud Endpoint"
            class="system-mqtt__section-card"
          >
            <el-form-item label="Broker Host:" prop="broker_host" required>
              <el-input
                v-model="form.broker_host"
                :disabled="isBusy"
                placeholder="Broker host"
              />
            </el-form-item>
            <el-form-item label="Broker Port:" prop="broker_port" required>
              <el-input-number
                v-model="form.broker_port"
                :min="1"
                :max="65535"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item label="TLS:" prop="ssl_enabled" required>
              <el-switch v-model="form.ssl_enabled" :disabled="isBusy" />
            </el-form-item>
            <el-form-item v-if="form.ssl_enabled" label="TLS Files:" required>
              <div
                ref="certificatesPanelRef"
                class="system-mqtt__certificates"
                role="group"
                aria-label="TLS certificates"
              >
                <p
                  v-if="certificateValidationError"
                  class="system-mqtt__certificate-error"
                  role="alert"
                >
                  {{ certificateValidationError }}
                </p>
                <div
                  v-for="item in certTypeOptions"
                  :key="item.type"
                  class="system-mqtt__certificate-row"
                >
                  <div class="system-mqtt__certificate-meta">
                    <span class="system-mqtt__certificate-label">{{ item.label }}:</span>
                    <code class="system-mqtt__certificate-file">{{ item.savedAs }}</code>
                  </div>
                  <el-tag
                    size="small"
                    :type="
                      getCertExists(item.type)
                        ? 'success'
                        : certificateInfoLoaded
                          ? 'danger'
                          : 'info'
                    "
                  >
                    {{
                      !certificateInfoLoaded
                        ? 'Unknown'
                        : getCertExists(item.type)
                          ? 'Installed'
                          : 'Missing'
                    }}
                  </el-tag>
                  <div
                    v-permission="'engineer'"
                    class="system-mqtt__certificate-actions"
                  >
                    <button
                      type="button"
                      class="system-mqtt__icon-button"
                      :aria-label="`Upload ${item.label}`"
                      :title="`Upload ${item.label}`"
                      :disabled="isBusy"
                      @click="triggerCertificateUpload(item.type)"
                    >
                      <el-icon>
                        <component
                          :is="certUploadingType === item.type ? Loading : Upload"
                        />
                      </el-icon>
                    </button>
                    <button
                      type="button"
                      class="system-mqtt__icon-button is-danger"
                      :aria-label="`Delete ${item.label}`"
                      :title="`Delete ${item.label}`"
                      :disabled="isBusy || !getCertExists(item.type)"
                      @click="handleDeleteCertificate(item.type)"
                    >
                      <el-icon>
                        <component
                          :is="certDeletingType === item.type ? Loading : Delete"
                        />
                      </el-icon>
                    </button>
                  </div>
                </div>
              </div>
            </el-form-item>
            <el-form-item label="Username:" prop="username">
              <el-input
                v-model="form.username"
                :disabled="isBusy"
                placeholder="MQTT username"
              />
            </el-form-item>
            <el-form-item label="Password:" prop="password">
              <el-input
                v-model="form.password"
                :disabled="isBusy"
                type="password"
                show-password
                placeholder="MQTT password"
              />
            </el-form-item>
          </LightCollapseCard>
          <LightCollapseCard
            v-model="openDevice"
            title="Device Identity"
            class="system-mqtt__section-card"
          >
            <el-form-item label="Client ID:" prop="client_id" required>
              <el-input
                v-model="form.client_id"
                :disabled="isBusy"
                placeholder="Client ID"
              />
            </el-form-item>
            <el-form-item label="Device SN:" prop="device_sn" required>
              <el-input
                v-model="form.device_sn"
                :disabled="isBusy"
                placeholder="Device serial number"
              />
            </el-form-item>
            <el-form-item label="Product SN:" prop="product_sn" required>
              <el-input
                v-model="form.product_sn"
                :disabled="isBusy"
                placeholder="Product serial number"
              />
            </el-form-item>
          </LightCollapseCard>
          <LightCollapseCard
            v-model="openReporting"
            title="Reporting"
            class="system-mqtt__section-card"
          >
            <el-form-item
              label="Report Batch Size:"
              prop="report_batch_size"
              required
            >
              <el-input-number
                v-model="form.report_batch_size"
                :min="1"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="Report Interval (s):"
              prop="report_interval_secs"
              required
            >
              <el-input-number
                v-model="form.report_interval_secs"
                :min="1"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="Subscribe Patterns:"
              prop="subscribe_patterns_text"
              required
            >
              <el-input
                v-model="form.subscribe_patterns_text"
                :disabled="isBusy"
                type="textarea"
                :rows="2"
                placeholder="Use commas to separate patterns"
              />
            </el-form-item>
            <el-form-item
              label="Exclude Patterns:"
              prop="exclude_patterns_text"
            >
              <el-input
                v-model="form.exclude_patterns_text"
                :disabled="isBusy"
                type="textarea"
                :rows="2"
                placeholder="Use commas to separate patterns"
              />
            </el-form-item>
          </LightCollapseCard>
          <LightCollapseCard
            v-model="openAdvanced"
            title="Advanced Settings"
            class="system-mqtt__section-card"
          >
            <el-form-item
              label="Alarm Service URL:"
              prop="alarmsrv_url"
              required
            >
              <el-input
                v-model="form.alarmsrv_url"
                :disabled="isBusy"
                placeholder="Alarm service URL"
              />
            </el-form-item>
            <el-form-item label="Model Service URL:" prop="modsrv_url" required>
              <el-input
                v-model="form.modsrv_url"
                :disabled="isBusy"
                placeholder="e.g. http://localhost:6002"
              />
            </el-form-item>
            <el-form-item
              label="Broker Keepalive (s):"
              prop="broker_keepalive_secs"
              required
            >
              <el-input-number
                v-model="form.broker_keepalive_secs"
                :min="5"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="Reconnect Delay (s):"
              prop="reconnect_delay_secs"
              required
            >
              <el-input-number
                v-model="form.reconnect_delay_secs"
                :min="1"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="Reconnect Max Attempts:"
              prop="reconnect_max_attempts"
              required
            >
              <el-input-number
                v-model="form.reconnect_max_attempts"
                :min="1"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="System Monitor Enabled:"
              prop="system_monitor_enabled"
              required
            >
              <el-switch
                v-model="form.system_monitor_enabled"
                :disabled="isBusy"
              />
            </el-form-item>
            <el-form-item
              label="System Monitor Interval (s):"
              prop="system_monitor_interval_secs"
              required
            >
              <el-input-number
                v-model="form.system_monitor_interval_secs"
                :min="1"
                :controls="false"
                align="left"
                :disabled="isBusy"
              />
            </el-form-item>
          </LightCollapseCard>
                </div>
              </el-form>
              <div v-permission="'engineer'" class="system-mqtt__actions">
                <el-button
                  type="primary"
                  :loading="saving"
                  :disabled="isBusy"
                  @click="handleApply"
                >
                  Apply
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <div class="system-mqtt__right">
          <el-card class="system-mqtt__status-card">
            <template #header>
              <div class="system-mqtt__status-title">Connection Status</div>
            </template>
            <div class="system-mqtt__status-line">
              <div
                class="system-mqtt__status-main"
                role="status"
                aria-live="polite"
              >
                <el-icon :class="statusIconClass">
                  <component :is="statusIconComponent" />
                </el-icon>
                <span class="system-mqtt__status-text">{{ statusText }}</span>
              </div>
              <el-tooltip content="Refresh status" placement="top">
                <button
                  type="button"
                  class="system-mqtt__status-refresh"
                  aria-label="Refresh status"
                  :disabled="isBusy"
                  @click="loadMqttStatus"
                >
                  <el-icon v-if="statusLoading" class="is-spinning">
                    <Loading />
                  </el-icon>
                  <AppIcon
                    v-else
                    name="i-tabler-refresh"
                    className="system-mqtt__status-refresh-icon"
                  />
                </button>
              </el-tooltip>
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
              <span>TLS</span>
              <span class="system-mqtt__status-value">{{ sslStatusText }}</span>
            </div>
            <div v-if="effectiveTlsEnabled" class="system-mqtt__status-field">
              <span>TLS Files</span>
              <span class="system-mqtt__status-value">{{ tlsFilesStatusText }}</span>
            </div>
            <div v-permission="'engineer'" class="system-mqtt__status-actions">
              <el-button
                size="small"
                type="primary"
                :loading="reconnecting"
                :disabled="isBusy"
                @click="handleReconnect"
              >
                Reconnect
              </el-button>
              <el-button
                v-if="mqttStatus.connected === true"
                size="small"
                :loading="disconnecting"
                :disabled="isBusy"
                @click="handleDisconnect"
              >
                Disconnect
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { CircleCheckFilled, Delete, InfoFilled, Loading, Upload, WarningFilled } from '@element-plus/icons-vue'
import LightCollapseCard from '@/components/common/LightCollapseCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore } from '@/stores/user'
import { canAccessConfigTool } from '@/utils/rolePermission'
import { isRequestCanceled } from '@/utils/request'
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
  cancelInstSyncRequests,
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
  triggerInstSync,
} from '@/api/systemConfig'

const userStore = useUserStore()
const canManageConnection = computed(() => canAccessConfigTool(userStore.userInfo?.role?.name_en))

// Connection and identity stay visible; secondary settings start collapsed.
const openBasic = ref(true)
const openDevice = ref(false)
const openReporting = ref(false)
const openAdvanced = ref(false)

interface MqttFormModel extends Omit<MqttConfigPayload, 'exclude_patterns' | 'subscribe_patterns'> {
  exclude_patterns_text: string
  subscribe_patterns_text: string
}

const formRef = ref<FormInstance>()
const certificatesPanelRef = ref<HTMLElement>()
const certificateInfoLoaded = ref(false)
const certificateValidationAttempted = ref(false)
const loading = ref(false)
const saving = ref(false)
const syncing = ref(false)
const disconnecting = ref(false)
const reconnecting = ref(false)
const statusLoading = ref(false)
const certLoading = ref(false)
const certUploadingType = ref<CertificateType | ''>('')
const certDeletingType = ref<CertificateType | ''>('')

const mqttStatus = reactive<MqttStatusSnapshot>({
  broker: '', connected: undefined, device_sn: '', product_name: '', product_sn: '', ssl_enabled: undefined,
})

const certInfo = reactive<CertificateInfoSnapshot>({ cert_dir: '', files: [] })

interface CertTypeOption {
  type: CertificateType
  label: string
  savedAs: string
}

const certTypeOptions: CertTypeOption[] = [
  { type: 'ca_cert', label: 'CA Cert', savedAs: 'AmazonRootCA1.pem' },
  { type: 'client_cert', label: 'Client Cert', savedAs: 'certificate.pem.crt' },
  { type: 'client_key', label: 'Client Key', savedAs: 'private.pem.key' },
]

const form = reactive<MqttFormModel>({
  alarmsrv_url: '',
  modsrv_url: '',
  broker_host: '',
  username: '',
  password: '',
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
  () => loading.value || saving.value || disconnecting.value || reconnecting.value || statusLoading.value || syncing.value || certLoading.value
    || Boolean(certUploadingType.value) || Boolean(certDeletingType.value),
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
const effectiveTlsEnabled = computed(() => {
  if (typeof mqttStatus.ssl_enabled === 'boolean') return mqttStatus.ssl_enabled
  return form.ssl_enabled
})
const sslStatusText = computed(() => {
  if (typeof mqttStatus.ssl_enabled === 'boolean') {
    return mqttStatus.ssl_enabled ? 'Enabled' : 'Disabled'
  }
  return form.ssl_enabled ? 'Enabled (pending apply)' : 'Disabled (pending apply)'
})
const certFileList = computed(() => certInfo.files || [])
const installedCertificateCount = computed(() =>
  certTypeOptions.filter((item) => getCertExists(item.type)).length,
)
const tlsFilesStatusText = computed(() => {
  if (!certificateInfoLoaded.value) return 'Unknown'
  return `${installedCertificateCount.value} / ${certTypeOptions.length} installed`
})
const missingCertificates = computed(() => certTypeOptions.filter((item) => !getCertExists(item.type)))
const certificateValidationError = computed(() => {
  if (!form.ssl_enabled || !certificateValidationAttempted.value || certLoading.value) return ''
  if (!certificateInfoLoaded.value) return 'Could not verify TLS files. Apply settings again to retry.'
  if (!missingCertificates.value.length) return ''
  return `Upload the missing TLS files: ${missingCertificates.value.map((item) => item.label).join(', ')}.`
})

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
  alarmsrv_url: () => { openAdvanced.value = true },
  modsrv_url: () => { openAdvanced.value = true },
  broker_host: () => { openBasic.value = true },
  broker_port: () => { openBasic.value = true },
  broker_keepalive_secs: () => { openAdvanced.value = true },
  ssl_enabled: () => { openBasic.value = true },
  username: () => { openBasic.value = true },
  password: () => { openBasic.value = true },
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
  username: form.username.trim(),
  password: form.password,
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
    form.username = String(payload.username || '')
    form.password = String(payload.password || '')
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
  mqttStatus.connected = undefined
  mqttStatus.ssl_enabled = undefined
  try {
    const res = await getMqttStatus()
    const payload = parseMqttStatusPayload(res)
    mqttStatus.broker = String(payload.broker || '')
    mqttStatus.connected = typeof payload.connected === 'boolean' ? payload.connected : undefined
    mqttStatus.device_sn = String(payload.device_sn || '')
    mqttStatus.product_name = String(payload.product_name || '')
    mqttStatus.product_sn = String(payload.product_sn || '')
    const tlsEnabled = payload.ssl_enabled ?? payload.ssl
    mqttStatus.ssl_enabled = typeof tlsEnabled === 'boolean' ? tlsEnabled : undefined
  } finally {
    statusLoading.value = false
  }
}

const loadCertificateInfo = async () => {
  cancelCertificateInfoRequests()
  certLoading.value = true
  certificateInfoLoaded.value = false
  try {
    const res = await getCertificateInfo()
    const payload = (res?.data && typeof res.data === 'object' ? res.data : res) as CertificateInfoSnapshot
    if (!Array.isArray(payload?.files)) throw new Error('Certificate status is unavailable')
    certInfo.cert_dir = String(payload.cert_dir || '')
    certInfo.files = payload.files
    certificateInfoLoaded.value = true
  } finally {
    certLoading.value = false
  }
}

const getCertRecord = (certType: CertificateType): CertificateFileSnapshot | undefined => {
  const fileNames: Record<CertificateType, string[]> = {
    ca_cert: ['amazonrootca1.pem', 'ca.pem'],
    client_cert: ['certificate.pem.crt', 'client.crt'],
    client_key: ['private.pem.key', 'client.key'],
  }
  const matches = certFileList.value.filter((item) => fileNames[certType].includes(String(item.file || '').toLowerCase()))
  return matches.find((item) => item.exists) || matches[0]
}
const getCertExists = (certType: CertificateType) => certificateInfoLoaded.value && Boolean(getCertRecord(certType)?.exists)
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

// The endpoint confirms publication, not cloud-side application.
const handleSyncToCloud = async () => {
  if (!canManageConnection.value || isBusy.value || mqttStatus.connected !== true) return
  syncing.value = true
  try {
    const res = await triggerInstSync()
    if (res.success === true) ElMessage.success('Configuration sent to cloud.')
    else ElMessage.warning(res.message || 'Could not send configuration. Check the cloud connection and try again.')
  } catch (error: unknown) {
    // Request errors are displayed centrally by the request wrapper.
    if (isRequestCanceled(error)) return
  } finally {
    syncing.value = false
  }
}

const revealCertificates = async () => {
  openBasic.value = true
  await nextTick()
  certificatesPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const handleApply = async () => {
  if (isBusy.value) return
  saving.value = true
  try {
    if (form.ssl_enabled) {
      certificateValidationAttempted.value = true
      // Refresh before saving; files may have changed since this page was loaded.
      try {
        await loadCertificateInfo()
      } catch (error: unknown) {
        if (!isRequestCanceled(error)) await revealCertificates()
        return
      }
      if (missingCertificates.value.length) {
        await revealCertificates()
        return
      }
    }

    try {
      await formRef.value?.validate()
    } catch (error: any) {
      const invalidField = Object.keys(error || {})[0]
      if (invalidField && sectionFieldMap[invalidField]) sectionFieldMap[invalidField]()
      return
    }

    cancelMqttConfigUpdateRequests()
    await updateMqttConfig(buildPayload())
    ElMessage.success('Cloud link settings applied')
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
  await Promise.allSettled([loadMqttConfig(), loadMqttStatus(), loadCertificateInfo()])
})

onUnmounted(() => {
  cancelInstSyncRequests()
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
  margin-bottom: 16px;
}

.system-mqtt__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 32px;
}

.system-mqtt__title {
  margin: 0;
  height: 32px;
  line-height: 32px;
  font-size: var(--vt-font-size-md);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-mqtt__desc {
  margin: 8px 0 0;
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  line-height: 1.6;
}

.system-mqtt__header-sync {
  display: inline-flex;
  flex-shrink: 0;
}

.system-mqtt__header-sync .iconify {
  margin-right: 8px;
}

.system-mqtt__panel {
  flex: 1;
  min-height: 0;
  border: var(--vt-border-width-base) solid var(--vt-border-color);
  border-radius: var(--vt-radius-md);
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

.system-mqtt__form :deep(.el-form-item) {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.system-mqtt__section-card :deep(.light-collapse-card__body),
.system-mqtt__section-card :deep(.light-collapse-card__body-inner) {
  height: auto;
}

.system-mqtt__form :deep(.el-form-item__content) {
  min-width: 0;
}
.system-mqtt__field-hint {
  font-size: var(--vt-font-size-sm);
  color: var(--vt-text-secondary);
  line-height: 1.5;
}

.system-mqtt__actions {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  border-top: var(--vt-border-width-base) solid var(--vt-border-color);
  padding-top: 12px;
  margin-top: 12px;
}

.system-mqtt__right {
  width: 280px;
  flex-shrink: 0;
  align-self: flex-start;
  position: sticky;
  top: 0;
}

.system-mqtt__status-card {
  flex-shrink: 0;
}

.system-mqtt__status-title {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-semibold);
  color: var(--vt-text-primary);
}

.system-mqtt__status-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.system-mqtt__status-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--vt-text-primary);

  .el-icon.is-connected {
    color: var(--vt-color-success);
  }
  .el-icon.is-disconnected {
    color: var(--vt-color-danger);
  }
  .el-icon.is-unknown {
    color: var(--vt-text-secondary);
  }
}

.system-mqtt__status-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--vt-radius-sm);
  background: transparent;
  color: var(--vt-color-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--vt-bg-elevated);
    color: var(--vt-color-primary);
    box-shadow: inset 0 0 0 1px var(--vt-border-color);
  }
  &:active:not(:disabled) {
    background: var(--vt-border-color);
  }
  &:focus-visible {
    outline: 2px solid var(--vt-color-primary);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .el-icon.is-spinning,
  .system-mqtt__status-refresh-icon {
    width: 18px;
    height: 18px;
  }

  .el-icon.is-spinning {
    animation: system-mqtt-status-spin 0.9s linear infinite;
  }
}

@keyframes system-mqtt-status-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.system-mqtt__status-text {
  font-size: var(--vt-font-size-base);
  font-weight: var(--vt-font-weight-medium);
}

.system-mqtt__status-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vt-border-color);
  color: var(--vt-text-secondary);
  font-size: var(--vt-font-size-sm);
}

.system-mqtt__status-value {
  color: var(--vt-text-primary);
  text-align: right;
  margin-left: 10px;
  word-break: break-all;
}

.system-mqtt__status-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--vt-border-color);
}

.system-mqtt__certificates {
  width: 100%;
  border: 1px solid var(--vt-border-color);
  border-radius: var(--vt-radius-sm);
  background: var(--vt-bg-page);
  overflow: hidden;
}

.system-mqtt__certificate-error {
  margin: 0;
  padding: 8px 12px;
  color: var(--vt-color-danger);
  font-size: var(--vt-font-size-sm);
  line-height: 1.5;
  border-bottom: 1px solid var(--vt-border-color);
  background: color-mix(in srgb, var(--vt-color-danger) 6%, var(--vt-bg-page));
}

.system-mqtt__certificate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--vt-border-color);

  &:last-child {
    border-bottom: 0;
  }
}

.system-mqtt__certificate-meta {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.system-mqtt__certificate-label {
  color: var(--vt-text-secondary);
  font-size: var(--vt-font-size-sm);
  font-weight: var(--vt-font-weight-medium);
  white-space: nowrap;
}

.system-mqtt__certificate-file {
  margin: 0;
  padding: 2px 6px;
  border-radius: var(--vt-radius-sm);
  background: rgba(57, 85, 131, 0.04);
  color: var(--vt-text-primary);
  font-size: var(--vt-font-size-xs);
  font-family: var(--vt-font-family-mono, ui-monospace, monospace);
  line-height: 1.4;
  word-break: break-all;
}

.system-mqtt__certificate-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.system-mqtt__certificate-actions .system-mqtt__icon-button {
  width: 26px;
  height: 26px;
  font-size: 16px;
}

.system-mqtt__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--vt-radius-sm);
  background: transparent;
  color: var(--vt-color-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--vt-bg-elevated);
    color: var(--vt-color-primary);
    box-shadow: inset 0 0 0 1px var(--vt-border-color);
  }
  &:active:not(:disabled) {
    background: var(--vt-border-color);
  }
  &:focus-visible {
    outline: 2px solid var(--vt-color-primary);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &.is-danger {
    color: var(--vt-color-danger);

    &:hover:not(:disabled) {
      color: var(--vt-color-danger);
      background: color-mix(in srgb, var(--vt-color-danger) 10%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--vt-color-danger) 35%, transparent);
    }
  }
}

@media (max-width: 900px) {
  .system-mqtt__body {
    flex-direction: column;
  }

  .system-mqtt__right {
    width: 100%;
    position: static;
  }
}

@media (max-width: 600px) {
  .system-mqtt__title-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .system-mqtt__body {
    padding: 12px;
  }

  .system-mqtt__form :deep(.el-form-item) {
    flex-direction: column;
  }

  .system-mqtt__form :deep(.el-form-item__label) {
    width: 100% !important;
    justify-content: flex-start;
  }

  .system-mqtt__form :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }

  .system-mqtt__certificate-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .system-mqtt__certificate-meta {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

:deep(.el-input-number) {
  width: 100%;
}
</style>
