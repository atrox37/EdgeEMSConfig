/**
 * API配置管理
 * 根据IP地址动态设置API基础URL
 */

import { setItem, getItem, removeItem } from '@/utils/secureStore'

const API_CONFIG_KEY = 'api_config'

// API端口配置（从vite.config.ts中提取）
export const API_PORTS = {
  main: 6005, // /api
  com: 6001,  // /comApi
  rule: 6002, // /ruleApi
  mod: 6002,  // /modApi
  his: 6004,  // /hisApi
  net: 6006,  // /netApi
} as const

export interface ApiConfig {
  ipAddress: string
  baseURL: string
  comApiURL: string
  ruleApiURL: string
  modApiURL: string
  hisApiURL: string
  netApiURL: string
}

/**
 * 根据IP地址生成API配置
 */
export function createApiConfig(ipAddress: string): ApiConfig {
  const baseURL = `http://${ipAddress}:${API_PORTS.main}`
  const comApiURL = `http://${ipAddress}:${API_PORTS.com}`
  const ruleApiURL = `http://${ipAddress}:${API_PORTS.rule}`
  const modApiURL = `http://${ipAddress}:${API_PORTS.mod}`
  const hisApiURL = `http://${ipAddress}:${API_PORTS.his}`
  const netApiURL = `http://${ipAddress}:${API_PORTS.net}`

  return {
    ipAddress,
    baseURL,
    comApiURL,
    ruleApiURL,
    modApiURL,
    hisApiURL,
    netApiURL,
  }
}

/**
 * 保存API配置
 */
export async function saveApiConfig(config: ApiConfig): Promise<void> {
  await setItem(API_CONFIG_KEY, config, { asJson: true })
}

/**
 * 获取保存的API配置
 */
export async function getApiConfig(): Promise<ApiConfig | null> {
  try {
    const result = await getItem<ApiConfig>(API_CONFIG_KEY, { asJson: true })
    // 确保返回的是 ApiConfig 类型
    if (result && typeof result === 'object' && 'ipAddress' in result) {
      return result as ApiConfig
    }
    return null
  } catch (error) {
    console.error('Failed to load API config:', error)
    return null
  }
}

/**
 * 清除API配置
 */
export async function clearApiConfig(): Promise<void> {
  await removeItem(API_CONFIG_KEY)
}

/**
 * 设置HTTP的baseURL
 */
export async function setAxiosBaseURL(config: ApiConfig): Promise<void> {
  // 动态导入避免循环依赖
  const requestModule = await import('@/utils/request')
  const service = (requestModule as any).service
  const setApiConfigRef = (requestModule as any).setApiConfigRef
  
  if (service && service.defaults) {
    service.defaults.baseURL = config.baseURL
    console.log('[API配置] BaseURL已设置为:', config.baseURL)
  }
  
  // 设置配置引用，供请求拦截器使用
  if (setApiConfigRef) {
    setApiConfigRef(config)
    console.log('[API配置] 配置引用已设置:', {
      comApiURL: config.comApiURL,
      modApiURL: config.modApiURL,
      ruleApiURL: config.ruleApiURL,
      hisApiURL: config.hisApiURL,
      netApiURL: config.netApiURL,
    })
  }
}
