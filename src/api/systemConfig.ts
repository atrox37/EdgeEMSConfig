import { Request, cancelPendingRequestsByUrl } from '@/utils/request'
import type { RequestConfig } from '@/utils/request'
import type {
  CertificateInfoResponse,
  CertificateType,
  ConfigApplyData,
  ConfigBackupData,
  ConfigCurrentVersion,
  ConfigImportValidateData,
  ConfigVersionDeleteData,
  ConfigVersionListData,
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

const CONFIG_MUTATION_TIMEOUT_MS = 120 * 1000
const CONFIG_MUTATION_REQUEST: RequestConfig = {
  timeout: CONFIG_MUTATION_TIMEOUT_MS,
  skipGlobalLoading: true,
  showErrorMessage: false,
}

export const downloadConfigExport = (filename: string) => {
  return Request.download('/api/v1/config/export', {}, filename, { timeout: CONFIG_MUTATION_TIMEOUT_MS })
}

export const getCurrentConfigVersion = () => {
  return Request.get<ConfigCurrentVersion>('/api/v1/config/current', {}, {
    skipGlobalLoading: true,
  })
}

export const createConfigBackup = (payload: Record<string, never> | { description: string }) => {
  return Request.post<ConfigBackupData>('/api/v1/config/backups', payload, CONFIG_MUTATION_REQUEST)
}

export const listConfigVersions = (page: number, pageSize: number) => {
  return Request.get<ConfigVersionListData>(
    '/api/v1/config/versions',
    { page, page_size: pageSize },
    { skipGlobalLoading: true },
  )
}

export const downloadConfigVersionExport = (versionId: string, filename: string) => {
  return Request.download(
    `/api/v1/config/versions/${versionId}/export`,
    {},
    filename,
    { timeout: CONFIG_MUTATION_TIMEOUT_MS },
  )
}

export const cancelConfigImportValidate = () => {
  cancelPendingRequestsByUrl('/api/v1/config/imports/validate', 'post')
}

export const validateConfigImport = (file: File, config: RequestConfig = {}) => {
  return Request.upload<ConfigImportValidateData>(
    '/api/v1/config/imports/validate',
    file,
    {},
    {
      ...CONFIG_MUTATION_REQUEST,
      showErrorMessage: false,
      ...config,
    },
  )
}

export const applyConfigImport = (
  importId: string,
  payload: Record<string, never> | { description: string },
) => {
  return Request.post<ConfigApplyData>(
    `/api/v1/config/imports/${importId}/apply`,
    payload,
    {
      ...CONFIG_MUTATION_REQUEST,
      showErrorMessage: false,
    },
  )
}

export const restoreConfigVersion = (
  versionId: string,
  payload: Record<string, never> | { description: string },
) => {
  return Request.post<ConfigApplyData>(
    `/api/v1/config/versions/${versionId}/restore`,
    payload,
    {
      ...CONFIG_MUTATION_REQUEST,
      showErrorMessage: false,
    },
  )
}

export const deleteConfigVersion = (versionId: string) => {
  return Request.delete<ConfigVersionDeleteData>(
    `/api/v1/config/versions/${versionId}`,
    {
      ...CONFIG_MUTATION_REQUEST,
      showErrorMessage: false,
    },
  )
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
