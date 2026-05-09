import { Request, cancelPendingRequestsByUrl } from '@/utils/request'
import type {
  CertificateInfoResponse,
  CertificateType,
  HisConfigResponse,
  HisServiceConfig,
  InstSyncResponse,
  LanValue,
  NetworkConfigRequest,
  NetworkConfigResponse,
  MqttConfigPayload,
  MqttConfigResponse,
  MqttStatusResponse,
  StorageConfigRequest,
  StorageGetResponseData,
  StorageTestRequest,
} from '@/types/systemConfig'

export const importConfigFile = (formData: FormData) => {
  return Request.post('/api/v1/config/import', formData, {
    timeout: 60 * 1000,
  })
}

export const downloadConfigExport = (filename: string) => {
  return Request.download('/api/v1/config/export', {}, filename, { timeout: 60 * 1000 })
}

export const uploadUpgradePackage = (file: File, config: Record<string, any> = {}) => {
  return Request.upload('/api/v1/config/upgrade', file, {}, { timeout: 20 * 60 * 1000, ...config })
}

export const getUpgradeStatus = () => {
  return Request.get('/api/v1/config/upgrade/status', {}, { showErrorMessage: false })
}

export const abortUpgrade = () => {
  return Request.post('/api/v1/config/upgrade/abort', {})
}

export const cancelUpgradeUpload = () => {
  cancelPendingRequestsByUrl('/api/v1/config/upgrade', 'post')
}

export const getNetworkConfig = (lan: LanValue) => {
  return Request.get<NetworkConfigResponse>('/api/v1/network', { lan })
}

export const updateNetworkConfig = (payload: NetworkConfigRequest) => {
  return Request.put('/api/v1/network', payload)
}

export const applyNetworkConfig = () => {
  return Request.post('/api/v1/network/apply', {})
}

export const cancelNetworkGetRequests = () => {
  cancelPendingRequestsByUrl('/api/v1/network', 'get')
}

export const cancelNetworkUpdateRequests = () => {
  cancelPendingRequestsByUrl('/api/v1/network', 'put')
}

export const cancelNetworkApplyRequests = () => {
  cancelPendingRequestsByUrl('/api/v1/network/apply', 'post')
}

export const getStorageConfig = () => {
  return Request.get<StorageGetResponseData>('/hisApi/storage')
}

export const updateStorageConfig = (payload: StorageConfigRequest) => {
  return Request.put('/hisApi/storage', payload)
}

export const reconnectStorage = () => {
  return Request.post('/hisApi/storage/reconnect', {})
}

export const testStorageConnection = (payload: StorageTestRequest) => {
  return Request.post('/hisApi/storage/test', payload)
}

export const cancelStorageGetRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/storage', 'get')
}

export const cancelStorageUpdateRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/storage', 'put')
}

export const cancelStorageReconnectRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/storage/reconnect', 'post')
}

export const cancelStorageTestRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/storage/test', 'post')
}

export const getMqttConfig = () => {
  // /netApi is routed by request interceptor to netApiURL or http://{ip}:6006
  return Request.get<MqttConfigResponse>('/netApi/mqtt/config')
}

export const updateMqttConfig = (payload: MqttConfigPayload) => {
  return Request.post('/netApi/mqtt/config', payload)
}

export const disconnectMqtt = () => {
  return Request.post('/netApi/mqtt/disconnect', {})
}

export const reconnectMqtt = () => {
  return Request.post('/netApi/mqtt/reconnect', {})
}

export const getMqttStatus = () => {
  return Request.get<MqttStatusResponse>('/netApi/mqtt/status')
}

export const getCertificateInfo = () => {
  return Request.get<CertificateInfoResponse>('/netApi/certificate/info')
}

export const uploadCertificateFile = (certType: CertificateType, file: File) => {
  return Request.upload('/netApi/certificate/upload', file, { cert_type: certType }, { timeout: 60 * 1000 })
}

export const deleteCertificateFile = (certType: CertificateType) => {
  return Request.delete(`/netApi/certificate/${certType}`, {})
}

export const cancelMqttConfigGetRequests = () => {
  cancelPendingRequestsByUrl('/netApi/mqtt/config', 'get')
}

export const cancelMqttConfigUpdateRequests = () => {
  cancelPendingRequestsByUrl('/netApi/mqtt/config', 'post')
}

export const cancelMqttDisconnectRequests = () => {
  cancelPendingRequestsByUrl('/netApi/mqtt/disconnect', 'post')
}

export const cancelMqttReconnectRequests = () => {
  cancelPendingRequestsByUrl('/netApi/mqtt/reconnect', 'post')
}

export const cancelMqttStatusGetRequests = () => {
  cancelPendingRequestsByUrl('/netApi/mqtt/status', 'get')
}

export const cancelCertificateInfoRequests = () => {
  cancelPendingRequestsByUrl('/netApi/certificate/info', 'get')
}

export const cancelCertificateUploadRequests = () => {
  cancelPendingRequestsByUrl('/netApi/certificate/upload', 'post')
}

export const cancelCertificateDeleteRequests = () => {
  cancelPendingRequestsByUrl('/netApi/certificate/', 'delete')
}

// ─── netsrv: 触发设备列表同步 ────────────────────────────────
export const triggerInstSync = () => {
  return Request.post<InstSyncResponse>('/netApi/inst-sync', {})
}

export const cancelInstSyncRequests = () => {
  cancelPendingRequestsByUrl('/netApi/inst-sync', 'post')
}

// ─── hissrv: 历史服务配置 ─────────────────────────────────────
export const getHisConfig = () => {
  return Request.get<HisConfigResponse>('/hisApi/config')
}

export const updateHisConfig = (payload: HisServiceConfig) => {
  return Request.put('/hisApi/config', payload)
}

export const cancelHisConfigGetRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/config', 'get')
}

export const cancelHisConfigUpdateRequests = () => {
  cancelPendingRequestsByUrl('/hisApi/config', 'put')
}
