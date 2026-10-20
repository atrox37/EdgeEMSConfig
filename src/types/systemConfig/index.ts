export type LanValue = 1 | 2 | 3 | 4

export interface NetworkConfigResponse {
  dhcp: boolean
  ip: string
  subnet_mask: string
  gateway: string
  dns1: string
  dns2: string
}

export interface NetworkConfigRequest extends NetworkConfigResponse {
  lan: LanValue
}

export interface StorageConfigRequest {
  backend: string
  database: string
  enabled: boolean
  host: string
  password: string
  port: number | null
  username: string
}

export interface StorageTestRequest {
  backend: string
  host: string
  password: string
  port: number | null
  username: string
}

export interface StorageConfigSnapshot {
  active_backend?: string
  backend?: string
  connected?: boolean
  database?: string
  enabled?: boolean
  host?: string
  message?: string
  password?: string
  port?: number | string | null
  state?: string
  status?: string
  username?: string
}

export interface StorageGetResponseData {
  data?: StorageConfigSnapshot
  status?: string
  [key: string]: any
}

export type StorageConnectionState = 'unknown' | 'connected' | 'disconnected'

export interface MqttConfigPayload {
  alarmsrv_url: string
  broker_host: string
  username: string
  password: string
  broker_keepalive_secs: number
  broker_port: number
  client_id: string
  device_sn: string
  exclude_patterns: string[]
  modsrv_url: string
  product_sn: string
  reconnect_delay_secs: number
  reconnect_max_attempts: number
  report_batch_size: number
  report_interval_secs: number
  ssl_enabled: boolean
  subscribe_patterns: string[]
  system_monitor_enabled: boolean
  system_monitor_interval_secs: number
}

export interface MqttConfigResponse {
  data?: MqttConfigPayload
  status?: string
  [key: string]: any
}

export interface MqttStatusSnapshot {
  broker?: string
  connected?: boolean
  device_sn?: string
  product_name?: string
  product_sn?: string
  ssl_enabled?: boolean
  [key: string]: any
}

export interface MqttStatusResponse {
  data?: MqttStatusSnapshot
  status?: string
  [key: string]: any
}

export type CertificateType = 'ca_cert' | 'client_cert' | 'client_key'

export interface CertificateFileSnapshot {
  exists: boolean
  file: string
}

export interface CertificateInfoSnapshot {
  cert_dir?: string
  files?: CertificateFileSnapshot[]
}

export interface CertificateInfoResponse {
  data?: CertificateInfoSnapshot
  status?: string
  [key: string]: any
}

// ─── hissrv 配置 ─────────────────────────────────────────────
export interface HisServiceConfig {
  batch_size: number
  cleanup_enabled: boolean
  cleanup_older_than_days: number
  collection_interval_secs: number
  default_page_size: number
  exclude_patterns: string[]
  flush_interval_secs: number
  max_page_size: number
  max_time_range_days: number
  /** 新格式：key = pattern, value = null (使用全局间隔) 或 正整数秒 */
  subscribe_patterns: Record<string, number | null>
}

export interface HisConfigResponse {
  data?: HisServiceConfig
  success?: boolean
  [key: string]: any
}

export interface InstSyncResponse {
  success: boolean
  message: string
  data?: { msgId: string }
}

export type ConfigVersionOrigin =
  | 'initial'
  | 'manual_backup'
  | 'import'
  | 'pre_import_snapshot'
  | 'pre_restore_snapshot'
  | 'restore'
  | string

export type ConfigVersionStatus = 'current' | 'history' | string

export interface ConfigVersionOperator {
  id?: number | null
  username?: string | null
}

export interface ConfigCurrentVersion {
  id: string
  version: string
  revision?: number
  content_hash?: string
  updated_at?: string | null
  operator?: ConfigVersionOperator | null
}

export interface ConfigVersionListItem {
  id: string
  version: string
  status: ConfigVersionStatus
  origin: ConfigVersionOrigin
  source_version_id?: string | null
  source_filename?: string | null
  activated_at?: string | null
  operator?: string | null
  description?: string | null
  archive_size?: number | null
}

export interface ConfigVersionStorage {
  backup_size_mb: number
  total_size_mb: number
  used_percent: number
}

export interface ConfigVersionListData {
  list: ConfigVersionListItem[]
  total: number
  storage?: ConfigVersionStorage | null
}

export interface ConfigVersionDeleteData {
  id: string
  version: string
  archive_size: number
  archive_removed: boolean
  deleted_at: string
}

export interface ConfigVersionSummary {
  id?: string
  revision?: number
  version?: string
  origin?: ConfigVersionOrigin
  description?: string | null
  operator_name?: string
  created_at?: string
  source_filename?: string | null
  source_version_id?: string | null
}

export interface ConfigBackupData {
  created: boolean
  reason?: string | null
  version?: ConfigVersionSummary | null
}

export interface ConfigImportCheck {
  code: string
  passed: boolean
  message?: string
}

export interface ConfigImportPackageInfo {
  config_version?: string
  format_version?: number
  created_at?: string
  created_by?: string
}

export interface ConfigImportValidateData {
  import_id: string
  filename?: string
  size?: number
  expires_at?: string
  valid: boolean
  checks: ConfigImportCheck[]
  package?: ConfigImportPackageInfo | null
}

export interface ConfigRestartResult {
  service: string
  success: boolean
  error?: string
}

export interface ConfigApplyData {
  version?: ConfigVersionSummary | null
  files_extracted?: number
  preserved_local_tables?: string[]
  restart_results?: ConfigRestartResult[]
}

export interface ConfigApiErrorBody {
  success?: boolean
  message?: string
  data?: unknown
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
}
