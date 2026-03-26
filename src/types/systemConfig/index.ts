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
  broker_keepalive_secs: number
  broker_port: number
  client_id: string
  device_sn: string
  exclude_patterns: string[]
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
