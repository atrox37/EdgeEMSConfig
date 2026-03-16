import { Request, cancelPendingRequestsByUrl } from '@/utils/request'

export interface NetworkConfigResponse {
  dhcp: boolean
  ip: string
  subnet_mask: string
  gateway: string
  dns1: string
  dns2: string
}

export interface NetworkConfigRequest extends NetworkConfigResponse {
  lan: 1 | 2 | 3 | 4
}

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

export const getNetworkConfig = (lan: 1 | 2 | 3 | 4) => {
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
