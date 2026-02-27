import { Request, cancelPendingRequestsByUrl } from '@/utils/request'

export const importConfigFile = (formData: FormData) => {
  // 不显式设置 Content-Type，让请求层自动为 FormData 生成 multipart/form-data; boundary=...
  return Request.post('/api/v1/config/import', formData)
}

export const downloadConfigExport = (filename: string) => {
  return Request.download('/api/v1/config/export', {}, filename)
}

export const uploadUpgradePackage = (file: File, config: Record<string, any> = {}) => {
  return Request.upload('/api/v1/config/upgrade', file, {}, { timeout: 10 * 60 * 1000, ...config })
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
