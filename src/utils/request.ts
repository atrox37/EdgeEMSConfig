/**
 * 使用 @tauri-apps/plugin-http 的请求封装
 * - 统一前缀映射到真实后端
 * - 统一超时、鉴权、错误处理
 * - 401 自动刷新与重试
 */

import { fetch } from '@tauri-apps/plugin-http'
// 统一用 any 包一层，避免 TypeScript 将其解析为浏览器 fetch 的 RequestInit 类型
const httpFetch: any = fetch as any
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getItem, setItem, removeItem } from '@/utils/secureStore'

const KEY_REFRESH = 'refresh_token'
const DEFAULT_TIMEOUT = 30000

// 前缀映射（基于 vite.config.ts）
const PROXY_MAP: Array<{ prefix: string; target: string; rewrite: boolean }> = [
  { prefix: '/api', target: 'http://192.168.30.166:6005', rewrite: false },
  { prefix: '/comApi', target: 'http://192.168.30.166:6001', rewrite: true },
  { prefix: '/ruleApi', target: 'http://192.168.30.166:6003', rewrite: true },
  { prefix: '/modApi', target: 'http://192.168.30.166:6002', rewrite: true },
]

// 进行中的请求键集合（避免重复，无法真正取消，只做结果忽略）
const inflight = new Map<string, Promise<any>>()

// 刷新控制
let isRefreshing = false
let failedQueue: Array<{ resolve: () => void; reject: (e: any) => void }> = []
const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve()
  })
  failedQueue = []
}

// 类型定义
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  success: boolean
  [key: string]: any
}

export interface RequestConfig {
  headers?: Record<string, string>
  params?: Record<string, any>
  timeout?: number
  responseType?: 'json' | 'text' | 'binary'
  showErrorMessage?: boolean
  showSuccessMessage?: boolean
  loading?: boolean
  // 兼容 axios 其它字段
  [key: string]: any
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function stripLeadingSlash(s: string): string {
  return s.startsWith('/') ? s.slice(1) : s
}

function resolveUrl(inputUrl: string): string {
  // 绝对地址原样返回
  if (isAbsoluteUrl(inputUrl)) return inputUrl

  // 未以 / 开头，默认归入 /api
  const url = inputUrl.startsWith('/') ? inputUrl : `/api${inputUrl.startsWith('/') ? '' : '/'}${inputUrl}`

  for (const rule of PROXY_MAP) {
    if (url.startsWith(rule.prefix)) {
      const path = rule.rewrite ? `/${stripLeadingSlash(url.slice(rule.prefix.length))}` : url
      return `${rule.target}${path}`
    }
  }
  // 未匹配任何前缀时，默认走 /api 服务器
  return `${PROXY_MAP[0].target}${url}`
}

function appendParams(url: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return url
  const u = new URL(url)
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    u.searchParams.set(k, String(v))
  })
  return u.toString()
}

function buildHeaders(base: Record<string, string> = {}, setDefaultContentType = true): Record<string, string> {
  const headers: Record<string, string> = { ...base }
  if (setDefaultContentType && !headers['Content-Type']) headers['Content-Type'] = 'application/json;charset=UTF-8'
  try {
    const userStore = useUserStore()
    if (userStore.token) headers['Authorization'] = `Bearer ${userStore.token}`
  } catch {}
  return headers
}

async function doFetch(method: string, url: string, data?: any, config: RequestConfig = {}): Promise<any> {
  const absUrlBase = resolveUrl(url)
  const isGet = method.toUpperCase() === 'GET'

  // GET 合并参数 + 缓存穿透时间戳
  const params = { ...(config.params || {}), ...(isGet ? { _t: Date.now() } : {}) }
  const absUrl = appendParams(absUrlBase, params)

  const headers = buildHeaders(config.headers)
  const key = `${method}-${absUrl}`

  // 避免重复请求：如果存在，复用同一个 Promise
  if (inflight.has(key)) {
    return inflight.get(key)!
  }

  // 构建 body
  let body: any = undefined
  if (!isGet && data !== undefined) {
    const contentType = headers['Content-Type']?.toLowerCase() || ''
    if (contentType.includes('application/json')) {
      body = JSON.stringify(data)
    } else if (contentType.includes('text/plain')) {
      body = typeof data === 'string' ? data : JSON.stringify(data)
    } else {
      // 默认走 JSON
      body = JSON.stringify(data)
    }
  }

  const controller = new AbortController()
  const signal = controller.signal
  const runtime = async () => {
    const resp: Response = await httpFetch(absUrl, {
      method,
      headers,
      body,
      signal,
    })
    return resp
  }

  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  let timer: ReturnType<typeof setTimeout>
  const withTimeout = Promise.race([
    runtime().finally(() => clearTimeout(timer)),
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('Request timeout'))
      }, timeout)
    }),
  ]) as Promise<any>

  inflight.set(key, withTimeout)

  try {
    const resp: Response = await withTimeout

    // HTTP 401：触发刷新流程
    if (resp.status === 401) {
      return await handle401AndRetry({ method, url, data, config, absUrl })
    }

    // 解析响应
    if (config.responseType === 'binary') {
      const buffer = await resp.arrayBuffer()
      return { ok: resp.ok, status: resp.status, data: buffer }
    }

    let result: any
    if (config.responseType === 'text') {
      result = await resp.text()
    } else {
      try {
        result = await resp.json()
      } catch {
        result = await resp.text()
      }
    }
    const success =
      resp.ok && (result?.success === true || result?.code === 200 || result?.status === 'success')

    if (success) {
      if (config.showSuccessMessage && result?.message) {
        ElMessage.success(result.message)
      }
      return result
    }

    // 业务错误提示
    const msg =
      (result && typeof result === 'object' ? result?.message : undefined) ||
      resp.statusText ||
      'Request failed'
    if (config.showErrorMessage !== false) ElMessage.error(msg)
    // 特别处理业务 401（有些后端以 200 包装 401）
    if (result?.code === 401) {
      return await handle401AndRetry({ method, url, data, config, absUrl })
    }
    throw new Error(msg)
  } catch (error: any) {
    // 超时或网络错误
    if (config.showErrorMessage !== false) {
      ElMessage.error(error?.message || 'Network request failed')
    }
    throw error
  } finally {
    inflight.delete(key)
  }
}

async function handle401AndRetry(args: {
  method: string
  url: string
  data?: any
  config: RequestConfig
  absUrl: string
}): Promise<any> {
  const { method, url, data, config } = args

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({
        resolve: () => {
          // token 已更新，重试原请求
          doFetch(method, url, data, config).then(resolve).catch(reject)
        },
        reject,
      })
    })
  }

  isRefreshing = true
  try {
    const refreshToken = await getItem<string>(KEY_REFRESH, { asJson: false })
    if (!refreshToken) throw new Error('No refresh token available')

    // 刷新 token（默认走 /api）
    const refreshResp: Response = await httpFetch(resolveUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const refreshData = await refreshResp.json().catch(() => ({} as any))
    if (!refreshResp.ok || !(refreshData?.success || refreshData?.code === 200)) {
      throw new Error(refreshData?.message || 'Token refresh failed')
    }

    const newAccess = refreshData.data?.access_token
    const newRefresh = refreshData.data?.refresh_token
    if (!newAccess || !newRefresh) throw new Error('Invalid refresh response')

    try {
      const userStore = useUserStore()
      userStore.token = newAccess
    } catch {}
    await setItem(KEY_REFRESH, newRefresh, { asJson: false })

    processQueue(null)
    // 重试原请求
    return await doFetch(method, url, data, config)
  } catch (e) {
    processQueue(e as any)
    try {
      await removeItem(KEY_REFRESH)
    } catch {}
    try {
      const userStore = useUserStore()
      userStore?.clearUserData?.()
    } catch {}
    ElMessage.error('Login expired, please log in again')
    window.location.href = '/login'
    throw e
  } finally {
    isRefreshing = false
  }
}

class Request {
  static async get<T = any>(url: string, params?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const res = await doFetch('GET', url, undefined, { ...(config || {}), params })
    return res
  }

  static async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const res = await doFetch('POST', url, data, config)
    return res
  }

  static async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const res = await doFetch('PUT', url, data, config)
    return res
  }

  static async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const res = await doFetch('DELETE', url, undefined, config)
    return res
  }

  static async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    const res = await doFetch('PATCH', url, data, config)
    return res
  }

  static async upload<T = any>(
    url: string,
    file: File,
    data?: Record<string, any>,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const form = new FormData()
    form.append('file', file, file.name)
    if (data) {
      Object.entries(data).forEach(([k, v]) => form.append(k, String(v)))
    }
    // 交给 fetch 自动设置 multipart 边界
    const headers = { ...(config?.headers || {}) }
    delete headers['Content-Type']
    const resp: Response = await httpFetch(resolveUrl(url), {
      method: 'POST',
      headers: buildHeaders(headers, false),
      body: form,
    })
    return (await resp.json()) as any
  }

  static async download(url: string, params?: any, filename?: string): Promise<void> {
    const absUrl = appendParams(resolveUrl(url), params)
    const resp: Response = await httpFetch(absUrl, {
      method: 'GET',
      headers: buildHeaders(),
    })
    const buffer = await resp.arrayBuffer()
    const blob = new Blob([buffer])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || `download_${Date.now()}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    ElMessage.success('File downloaded successfully')
  }
}

export const cancelAllPendingRequests = () => {
  inflight.clear()
}

export { Request }
export default Request
