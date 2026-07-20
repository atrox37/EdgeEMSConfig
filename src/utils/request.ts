/**
 * Tauri Http 请求封装
 * 提供统一的HTTP请求配置、拦截器和错误处理
 */

import { fetch as httpFetch } from '@tauri-apps/plugin-http'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'
import type { ApiConfig } from '@/utils/apiConfig'
import { saveBytesWithPreferredPath } from '@/utils/downloadSave'

// 存储所有pending的请求（使用 ref 包装 Map 以确保响应式）
const pendingRequests = ref(new Map<string, AbortController>())

// 存储当前 API 配置的引用（用于同步访问）
let currentApiConfigRef: ApiConfig | null = null

/**
 * 设置 API 配置引用（由 apiConfig.ts 调用）
 */
export function setApiConfigRef(config: ApiConfig | null) {
  currentApiConfigRef = config
}

// 更新全局 loading 状态的函数
const updateGlobalLoading = () => {
  try {
    const globalStore = useGlobalStore()
    globalStore.loading = pendingRequests.value.size > 0
  } catch (error) {
    // Pinia 未初始化时忽略错误
    console.warn('Pinia store not available:', error)
  }
}

// 规范化用于生成请求唯一标识的负载（排除 _t，稳定排序）
const normalizeForKey = (value: any): any => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((v) => normalizeForKey(v))
  if (typeof value === 'object') {
    // 处理 FormData
    if (typeof FormData !== 'undefined' && value instanceof FormData) {
      const obj: Record<string, any> = {}
        ; (value as FormData).forEach((v, k) => {
          // 文件对象不参与去重，只记录占位，避免巨大的序列化
          obj[k] = typeof v === 'string' ? v : '[binary]'
        })
      return normalizeForKey(obj)
    }
    // 普通对象：去除 _t 并按 key 排序
    const sorted: Record<string, any> = {}
    Object.keys(value)
      .filter((k) => k !== '_t')
      .sort()
      .forEach((k) => {
        sorted[k] = normalizeForKey(value[k])
      })
    return sorted
  }
  return value
}

// 根据 config 生成稳定的请求标识，包含 method、url、参数/数据（排除 _t）
const buildRequestKey = (config: any): string => {
  const method = (config?.method || 'get').toLowerCase()
  const url = config?.url || ''
  // GET/DELETE 使用 params，其它使用 data
  const source = method === 'get' || method === 'delete' ? config?.params : config?.data
  const normalized = normalizeForKey(source)
  const payload =
    normalized === ''
      ? ''
      : typeof normalized === 'string'
        ? normalized
        : JSON.stringify(normalized)
  return `${method}-${url}-${payload}`
}

// 定义响应数据的通用接口
export interface ApiResponse<T = any> {
  code: number // 响应状态码
  message: string // 响应消息
  data: T // 响应数据
  success: boolean // 请求是否成功
  [key: string]: any
}

// 定义请求配置的扩展接口
export interface RequestConfig {
  url?: string
  method?: string
  baseURL?: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  timeout?: number
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'
  withCredentials?: boolean
  showErrorMessage?: boolean // 是否显示错误消息，默认true
  showSuccessMessage?: boolean // 是否显示成功消息，默认false
  skipGlobalLoading?: boolean // 是否跳过全局loading，默认false
  _isRefreshTokenRequest?: boolean // 是否为刷新token请求（内部使用，避免重复刷新）
  _retry?: boolean
  _requestKey?: string
  _abortController?: AbortController
  signal?: AbortSignal
  onUploadProgress?: (event: { loaded?: number; total?: number; percent?: number }) => void
}

interface HttpResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: RequestConfig
  request: { responseType?: RequestConfig['responseType'] }
  url?: string
}

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url)

const joinUrl = (baseURL: string, url: string) => {
  if (!baseURL || isAbsoluteUrl(url)) return url
  const trimmedBase = baseURL.replace(/\/+$/, '')
  const trimmedUrl = url.replace(/^\/+/, '')
  return `${trimmedBase}/${trimmedUrl}`
}

const appendQueryParams = (url: string, params?: Record<string, any>) => {
  if (!params) return url
  const searchParams = new URLSearchParams()
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item))
        }
      })
    } else {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  if (!queryString) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${queryString}`
}

const buildBody = (data: any): BodyInit | undefined => {
  if (data === undefined || data === null) return undefined
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return data
  }
  if (data instanceof Uint8Array) {
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    return new Blob([buffer])
  }
  if (data instanceof ArrayBuffer) {
    return new Blob([data])
  }
  if (typeof data === 'string') {
    return data
  }
  if (typeof data === 'object') {
    return JSON.stringify(data)
  }
  return String(data)
}

const normalizeHeaders = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

const parseResponseData = async (response: Response, responseType?: RequestConfig['responseType']) => {
  if (responseType === 'text') {
    return response.text()
  }
  if (responseType === 'blob' || responseType === 'arraybuffer') {
    return response.arrayBuffer()
  }
  if (response.status === 204) {
    return null
  }
  // 只读取一次 body，避免 json 解析失败后再次读取导致 "body stream already read"
  const rawText = await response.text()
  if (!rawText) return null
  try {
    return JSON.parse(rawText)
  } catch {
    return rawText
  }
}

/**
 * 将 ArrayBuffer 尝试解码为 UTF-8 文本并解析 JSON 错误体。
 * 典型场景：
 * - 下载接口失败时后端返回 JSON，但客户端按二进制读取；
 * - 某些网关/代理层返回二进制包装的错误响应。
 */
const decodeArrayBufferToJsonMessage = (buffer: ArrayBuffer): string | undefined => {
  try {
    const text = new TextDecoder('utf-8').decode(buffer)
    const parsed = JSON.parse(text)
    return parsed?.detail?.message || parsed?.message || (text || undefined)
  } catch {
    return undefined
  }
}

/**
 * 从后端响应体中提取“可直接展示给用户”的错误信息。
 * 支持三类输入：
 * 1) string：优先按 JSON 字符串解析，失败则原样返回；
 * 2) ArrayBuffer：先解码再尝试 JSON 提取；
 * 3) object：读取 detail.message 或 message。
 */
const extractServerMessage = (responseData: any): string | undefined => {
  if (!responseData) return undefined
  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData)
      return parsed?.detail?.message || parsed?.message || responseData
    } catch {
      return responseData
    }
  }
  if (responseData instanceof ArrayBuffer) {
    return decodeArrayBufferToJsonMessage(responseData)
  }
  return responseData?.detail?.message || responseData?.message || responseData?.error?.message
}

/**
 * HTTP 状态码到默认错误文案的映射。
 * 仅在“后端未返回明确 message”时作为兜底显示。
 */
const getHttpStatusErrorMessage = (status: number, statusText?: string): string => {
  switch (status) {
    case 400:
      return 'Bad request'
    case 403:
      return 'Insufficient permissions. Please contact your administrator.'
    case 404:
      return 'Request URL not found'
    case 408:
      return 'Request timeout'
    case 409:
      return 'Resource conflict'
    case 500:
      return 'Internal server error'
    case 502:
      return 'Bad gateway'
    case 503:
      return 'Service unavailable'
    case 504:
      return 'Gateway timeout'
    default:
      return `Connection error ${status}: ${statusText || ''}`.trim()
  }
}

/**
 * 统一错误文案提取入口（全局使用）。
 *
 * 优先级（从高到低）：
 * 1. 后端明确返回的错误文本（response.data）
 * 2. HTTP 状态码默认文案
 * 3. 网络层文案（超时/连接异常）
 * 4. error.message 或 fallback
 *
 * 这样做的目的：
 * - 尽可能展示后端真实报错，减少“Network request failed”这种无信息提示；
 * - 保证所有请求的错误展示口径一致，避免页面层重复解析。
 */
const getUnifiedErrorMessage = (error: any, fallback: string = 'Network request failed'): string => {
  const serverMessage = extractServerMessage(error?.response?.data)
  if (serverMessage) return serverMessage

  if (error?.response?.status) {
    return getHttpStatusErrorMessage(error.response.status, error.response.statusText)
  }

  if (error?.request) {
    if (error?.code === 'ECONNABORTED') return 'Request timeout'
    return 'Network connection error'
  }

  return error?.message || fallback
}

export const isRequestCanceled = (error: any): boolean => {
  if (!error) return false
  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || error.code === 'ABORT_ERR') {
    return true
  }
  if (error.config?.signal?.aborted || error.config?._abortController?.signal?.aborted) {
    return true
  }
  const reason = error.cause ?? error.config?.signal?.reason
  if (reason === 'request canceled' || reason === 'Request canceled' || reason === 'Request cancelled') {
    return true
  }
  const msg = String(error.message ?? '').toLowerCase()
  return (
    msg === 'request canceled'
    || msg === 'request cancelled'
    || msg === 'canceled'
    || msg === 'cancelled'
    || (msg.includes('abort') && (msg.includes('request') || msg.includes('user')))
  )
}

/**
 * 创建统一的服务实例
 * 设置基础配置项
 */
const service = {
  defaults: {
    baseURL: '',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    withCredentials: false,
  } as RequestConfig,
  interceptors: {
    request: {
      onFulfilled: undefined as undefined | ((config: RequestConfig) => RequestConfig | Promise<RequestConfig>),
      onRejected: undefined as undefined | ((error: any) => any),
      use(onFulfilled: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>, onRejected?: (error: any) => any) {
        this.onFulfilled = onFulfilled
        this.onRejected = onRejected
      },
    },
    response: {
      onFulfilled: undefined as undefined | ((response: HttpResponse) => any),
      onRejected: undefined as undefined | ((error: any) => any),
      use(onFulfilled: (response: HttpResponse) => any, onRejected?: (error: any) => any) {
        this.onFulfilled = onFulfilled
        this.onRejected = onRejected
      },
    },
  },
  async request(config: RequestConfig): Promise<any> {
    let mergedConfig: RequestConfig = {
      ...this.defaults,
      ...config,
      headers: {
        ...(this.defaults.headers || {}),
        ...(config.headers || {}),
      },
    }

    if (this.interceptors.request.onFulfilled) {
      try {
        mergedConfig = await this.interceptors.request.onFulfilled(mergedConfig)
      } catch (error) {
        if (this.interceptors.request.onRejected) {
          return Promise.reject(this.interceptors.request.onRejected(error))
        }
        return Promise.reject(error)
      }
    }

    try {
      const response = await performRequest(mergedConfig)
      if (this.interceptors.response.onFulfilled) {
        return this.interceptors.response.onFulfilled(response)
      }
      return response
    } catch (error) {
      if (this.interceptors.response.onRejected) {
        return this.interceptors.response.onRejected(error)
      }
      throw error
    }
  },
  get(url: string, config?: RequestConfig) {
    return this.request({ ...config, url, method: 'get' })
  },
  delete(url: string, config?: RequestConfig) {
    return this.request({ ...config, url, method: 'delete' })
  },
  post(url: string, data?: any, config?: RequestConfig) {
    return this.request({ ...config, url, data, method: 'post' })
  },
  put(url: string, data?: any, config?: RequestConfig) {
    return this.request({ ...config, url, data, method: 'put' })
  },
  patch(url: string, data?: any, config?: RequestConfig) {
    return this.request({ ...config, url, data, method: 'patch' })
  },
}

const isInvalidArrayLengthError = (err: any) =>
  err?.message === 'Invalid array length' || String(err?.message || '').includes('Invalid array length')

const performRequestWithNativeFetch = async (
  fullUrl: string,
  config: RequestConfig,
  body: BodyInit | undefined,
): Promise<HttpResponse> => {
  // fallback 场景下使用浏览器原生 fetch：
  // 主要用于兜底 tauri plugin-http 在 FormData 特定情况下的兼容性问题。
  const method = (config.method || 'get').toUpperCase()
  const headers = new Headers()
  if (config.headers) {
    Object.entries(config.headers).forEach(([k, v]) => {
      if (v != null && v !== '') headers.set(k, String(v))
    })
  }
  if (body instanceof FormData) {
    headers.delete('Content-Type')
  }

  const controller = new AbortController()
  const timeoutId =
    config.timeout && config.timeout > 0
      ? setTimeout(() => controller.abort(), config.timeout)
      : null
  if (config.signal) {
    config.signal.addEventListener('abort', () => controller.abort())
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body,
    signal: controller.signal,
  })

  if (timeoutId) clearTimeout(timeoutId)

  const responseData = await parseResponseData(response, config.responseType)
  const resultHeaders: Record<string, string> = {}
  response.headers.forEach((v, k) => {
    resultHeaders[k] = v
  })

  const normalizedResponse: HttpResponse = {
    data: responseData,
    status: response.status,
    statusText: response.statusText || '',
    headers: resultHeaders,
    config,
    request: { responseType: config.responseType },
    url: response.url || fullUrl,
  }

  if (normalizedResponse.status < 200 || normalizedResponse.status >= 300) {
    // 保持与主请求路径一致：非 2xx 统一抛出带 response 的错误对象。
    const error: any = new Error(`HTTP error ${normalizedResponse.status}`)
    error.response = normalizedResponse
    error.config = config
    error.request = normalizedResponse.request
    throw error
  }

  return normalizedResponse
}

const performRequest = async (config: RequestConfig): Promise<HttpResponse> => {
  const method = (config.method || 'get').toUpperCase()
  const baseURL = config.baseURL || ''
  const url = config.url || ''
  const fullUrl = appendQueryParams(joinUrl(baseURL, url), config.params)
  const body = method === 'GET' || method === 'DELETE' ? undefined : buildBody(config.data)

  const doRequest = async (): Promise<HttpResponse> => {
    const response = await httpFetch(fullUrl, {
      method,
      headers: config.headers,
      body,
      connectTimeout: config.timeout,
      signal: config.signal,
    })

    const responseData = await parseResponseData(response, config.responseType)

    const normalizedResponse: HttpResponse = {
      data: responseData,
      status: response.status,
      statusText: response.statusText || '',
      headers: normalizeHeaders(response.headers),
      config,
      request: { responseType: config.responseType },
      url: response.url || fullUrl,
    }

    if (normalizedResponse.status < 200 || normalizedResponse.status >= 300) {
      const error: any = new Error(`HTTP error ${normalizedResponse.status}`)
      error.response = normalizedResponse
      error.config = config
      error.request = normalizedResponse.request
      throw error
    }

    return normalizedResponse
  }

  try {
    return await doRequest()
  } catch (error: any) {
    if (isRequestCanceled(error)) {
      error.config = config
      error.request = { responseType: config.responseType }
      throw error
    }

    if (error?.response) {
      error.config = config
      error.request = { responseType: config.responseType }
      throw error
    }

    if (
      isInvalidArrayLengthError(error) &&
      body instanceof FormData &&
      ['POST', 'PUT', 'PATCH'].includes(method)
    ) {
      // tauri plugin-http + FormData 在个别环境会抛 Invalid array length。
      // 这里自动切到 native fetch 重试，避免上传类接口直接失败。
      console.warn('[request] Tauri httpFetch failed with Invalid array length, retrying with native fetch')
      try {
        return await performRequestWithNativeFetch(fullUrl, config, body)
      } catch (fallbackError: any) {
        if (isRequestCanceled(fallbackError)) {
          fallbackError.config = config
          fallbackError.request = { responseType: config.responseType }
          throw fallbackError
        }
        // Preserve HTTP error response from native fetch fallback (e.g. 400/422),
        // otherwise it will be misclassified as a generic network error.
        if (fallbackError?.response) {
          // 关键：保留 fallback 的 HTTP 错误响应。
          // 否则会被误判为纯网络错误，导致丢失后端 message。
          fallbackError.config = config
          fallbackError.request = { responseType: config.responseType }
          throw fallbackError
        }
        const wrappedError: any = new Error(
          fallbackError?.message || error?.message || 'Network request failed',
        )
        wrappedError.config = config
        wrappedError.request = { responseType: config.responseType }
        throw wrappedError
      }
    }

    if (isRequestCanceled(error) || config.signal?.aborted) {
      error.config = config
      error.request = { responseType: config.responseType }
      throw error
    }

    const wrappedError: any = new Error(error?.message || 'Network request failed')
    wrappedError.config = config
    wrappedError.request = { responseType: config.responseType }
    throw wrappedError
  }
}
/**
 * 请求拦截器
 * 在发送请求之前做一些统一处理
 */
const requestInterceptor = (config: any) => {
  const originalUrl = config.url || ''
  let targetBaseURL = config.baseURL || service.defaults.baseURL || ''
  let processedUrl = originalUrl

  // 判断是否为开发环境（Vite 开发模式）
  const isDev = import.meta.env.DEV

  // 处理包含 /comApi、/modApi、/ruleApi、/hisApi、/netApi 的请求路径
  // 使用同步方式获取配置（通过引用）
  const apiConfig = currentApiConfigRef

  /**
   * 多后端路由策略说明：
   * - /comApi /modApi /ruleApi：移除前缀后，按对应 baseURL 转发；
   * - /hisApi /netApi：保留前缀（业务要求），仅切换 baseURL 到 6004/6006。
   *
   * 这样可以在调用层保持统一路径风格，同时支持不同服务端口。
   */
  // 检查并处理特殊 API 路径
  if (originalUrl.startsWith('/comApi')) {
    processedUrl = originalUrl.replace(/^\/comApi/, '')
    if (apiConfig?.comApiURL) {
      targetBaseURL = apiConfig.comApiURL
    }
  } else if (originalUrl.startsWith('/modApi')) {
    processedUrl = originalUrl.replace(/^\/modApi/, '')
    if (apiConfig?.modApiURL) {
      targetBaseURL = apiConfig.modApiURL
    }
  } else if (originalUrl.startsWith('/ruleApi')) {
    processedUrl = originalUrl.replace(/^\/ruleApi/, '')
    if (apiConfig?.ruleApiURL) {
      targetBaseURL = apiConfig.ruleApiURL
    }
  } else if (originalUrl.startsWith('/hisApi')) {
    // Keep /hisApi in the final request path.
    processedUrl = originalUrl
    if (apiConfig?.hisApiURL) {
      targetBaseURL = apiConfig.hisApiURL
    } else if (apiConfig?.ipAddress) {
      targetBaseURL = `http://${apiConfig.ipAddress}:6004`
    }
  } else if (originalUrl.startsWith('/netApi')) {
    // Keep /netApi in the final request path.
    processedUrl = originalUrl
    if (apiConfig?.netApiURL) {
      targetBaseURL = apiConfig.netApiURL
    } else if (apiConfig?.ipAddress) {
      targetBaseURL = `http://${apiConfig.ipAddress}:6006`
    }
  }

  // 如果 URL 被处理过，更新 config
  if (processedUrl !== originalUrl || targetBaseURL !== (config.baseURL || service.defaults.baseURL || '')) {
    config.url = processedUrl
    if (targetBaseURL) {
      config.baseURL = targetBaseURL
    } else {
      config.baseURL = service.defaults.baseURL || ''
    }
    console.log(`[请求拦截器] ${isDev ? '开发模式' : '生产模式'} - 路径转换: ${originalUrl} -> ${processedUrl}`, {
      baseURL: targetBaseURL,
      isDev,
    })
  }

  // 添加时间戳防止缓存 (GET请求) - 在生成 key 之前添加，但 normalizeForKey 会过滤掉 _t
  // 注意：这里使用处理后的 URL 进行比较
  if (
    config.method?.toLowerCase() === 'get' &&
    processedUrl !== '/api/instances/search' &&
    processedUrl !== '/api/channels/search'
  ) {
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
  }

  // 生成请求的唯一标识（_t 会被 normalizeForKey 过滤掉，所以 key 是稳定的）
  // 注意：使用处理后的 URL 生成 key
  const requestKey = buildRequestKey(config)

  // 检查是否跳过全局loading
  const requestConfig = config as any
  const skipGlobalLoading = requestConfig.skipGlobalLoading === true

  // 如果存在相同的pending请求，取消它（但需要检查是否跳过全局loading）
  // 这是“同 key 仅保留最后一次请求”的去抖策略，避免重复点击触发并发请求。
  if (!skipGlobalLoading && pendingRequests.value.has(requestKey)) {
    const cancelController = pendingRequests.value.get(requestKey)
    cancelController?.abort('request canceled')
    pendingRequests.value.delete(requestKey)
    updateGlobalLoading()
  }

  // 创建新的 AbortController
  const abortController = new AbortController()
  config.signal = abortController.signal
  config._abortController = abortController
  // 将 requestKey 保存到 config 中，以便在错误处理时能够清除
  config._requestKey = requestKey

  // 如果配置了 skipGlobalLoading，则不添加到 pendingRequests
  if (!skipGlobalLoading) {
    pendingRequests.value.set(requestKey, abortController)
    updateGlobalLoading()
  }

  // 从内存中获取token并添加到请求头（token存储在内存中，refreshToken存储在localStorage）
  const userStore = useUserStore()
  const token = userStore.token
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 对于 FormData，不设置 Content-Type，让底层 HTTP 客户端自动添加 multipart/form-data; boundary=...
  // 手动设置 multipart/form-data 而不带 boundary 会导致服务器解析失败返回 400
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  } else if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
    // 如果是POST/PUT/PATCH请求且没有设置Content-Type，设置为json
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }
  }

  console.log(`[请求] ${config.method?.toUpperCase()} ${config.url}`, config)
  return config
}

const requestErrorInterceptor = (error: any) => {
  console.error('[请求错误]', error)
  // 如果错误对象有 config，尝试清除 pendingRequests
  const requestErrorConfig = error.config as any
  if (error.config?._requestKey && !requestErrorConfig?.skipGlobalLoading) {
    const requestKey = error.config._requestKey
    if (pendingRequests.value.has(requestKey)) {
      pendingRequests.value.delete(requestKey)
      updateGlobalLoading()
    }
  }
  ElMessage.error('Request configuration error')
  return Promise.reject(error)
}

service.interceptors.request.use(requestInterceptor, requestErrorInterceptor)

// 用于防止重复刷新token的标志
let isRefreshing = false
// 存储等待token刷新的请求队列
let failedQueue: Array<{
  resolve: (value: any) => void
  reject: (error: any) => void
}> = []

// 处理队列中的请求
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })

  failedQueue = []
}

/**
 * 响应拦截器工厂函数
 * 创建统一的响应拦截器，避免代码重复
 */
const createResponseInterceptor = (
  serviceInstance: any,
  logPrefix: string = '',
): [(response: any) => any, (error: any) => any] => {
  // 响应成功时的处理
  const responseSuccessHandler = (response: any) => {
    // 请求完成后，从pendingRequests中移除
    // 优先使用 config._requestKey，如果没有则使用 buildRequestKey 生成
    const requestKey = response.config?._requestKey || buildRequestKey(response.config)
    const responseConfig = response.config as any
    // 如果配置了 skipGlobalLoading，则不需要从 pendingRequests 中移除
    if (!responseConfig?.skipGlobalLoading && requestKey && pendingRequests.value.has(requestKey)) {
      pendingRequests.value.delete(requestKey)
      updateGlobalLoading()
    }

    const { data } = response
    const customConfig = response.config as any
    // 开发模式下分组输出请求/响应，便于在 DevTools Console 中查看
    if (import.meta.env.DEV) {
      const label = `${response.config.method?.toUpperCase()} ${response.config.url}`
      console.groupCollapsed(`[HTTP 响应] ${label}`)
      console.log('URL:', response.url)
      console.log('Status:', response.status, response.statusText)
      console.log('Headers:', response.headers)
      console.log('Response Data:', data)
      console.groupEnd()
    } else {
      console.log(`${logPrefix}[响应] ${response.config.method?.toUpperCase()} ${response.config.url}`, response)
    }

    // 检查业务状态码
    // 如果返回的是blob类型，直接认为请求成功，否则判断业务code或success
    if (
      response.request?.responseType === 'blob' ||
      (data && (data.code === 200 || data.success || data.status === 'success'))
    ) {
      // 请求成功
      if (customConfig.showSuccessMessage && data.message) {
        ElMessage.success(data.message)
      }
      return response
    } else {
      // 业务逻辑错误
      let errorMessage = data.message || 'Request failed'

      // 根据不同的业务状态码进行处理
      switch (data.code) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore401 = useUserStore()
          userStore401.clearUserData()
          errorMessage = 'Login expired, please log in again'
          // 跳转到登录页（使用router，避免页面刷新）
          import('@/router').then(({ router }) => {
            router.push('/login')
          })
          break
        case 403:
          errorMessage = 'Insufficient permissions. Please contact your administrator.'
          ElMessage.warning(errorMessage)
          return Promise.reject(new Error(errorMessage))
        case 404:
          errorMessage = 'Requested resource not found'
          break
        case 500:
          errorMessage = 'Internal server error'
          break
        default:
          break
      }
      if (customConfig.showErrorMessage !== false) {
        ElMessage.error(response.data.message || errorMessage)
      }
      return Promise.reject(new Error(errorMessage))
    }
  }

  // 响应失败时的处理
  const responseErrorHandler = async (error: any) => {
    // 如果是取消请求的错误，尝试清除 pendingRequests
    if (isRequestCanceled(error)) {
      console.log(`${logPrefix}[请求已取消] ${error.message}`)
      // 尝试从 error.config 中获取 requestKey（Cancel 错误可能没有 config）
      const cancelError = error as any
      if (cancelError.config) {
        const requestKey = cancelError.config._requestKey || buildRequestKey(cancelError.config)
        const cancelConfig = cancelError.config as any
        // 如果配置了 skipGlobalLoading，则不需要从 pendingRequests 中移除
        if (
          !cancelConfig?.skipGlobalLoading &&
          requestKey &&
          pendingRequests.value.has(requestKey)
        ) {
          pendingRequests.value.delete(requestKey)
          updateGlobalLoading()
        }
      }
      return Promise.reject(error)
    }

    // 请求完成后，从pendingRequests中移除
    // 优先使用 config._requestKey，如果没有则使用 buildRequestKey 生成
    const requestKey =
      error.config?._requestKey || (error.config ? buildRequestKey(error.config) : null)
    const errorConfig = error.config as any
    // 如果配置了 skipGlobalLoading，则不需要从 pendingRequests 中移除
    if (!errorConfig?.skipGlobalLoading && requestKey && pendingRequests.value.has(requestKey)) {
      pendingRequests.value.delete(requestKey)
      updateGlobalLoading()
    }
    console.error(`${logPrefix}[响应错误]`, error)

    const originalRequest = error.config
    const requestConfig = originalRequest as any

    if (error.response?.status === 403) {
      if (requestConfig?.showErrorMessage !== false) {
        ElMessage.warning('Insufficient permissions. Please contact your administrator.')
      }
      return Promise.reject(error)
    }

    /**
     * 401 处理分两类：
     * 1) 刷新 token 请求本身 401：直接清状态并跳登录，不再重试；
     * 2) 普通业务请求 401：尝试刷新 token，成功后重放原请求。
     */
    // 如果是刷新token请求返回401，直接跳转登录页，不再尝试刷新
    if (error.response?.status === 401 && requestConfig?._isRefreshTokenRequest) {
      console.log('[请求拦截器] 刷新token请求返回401，直接跳转登录页')
      const userStore = useUserStore()
      userStore.clearUserData()

      // 处理队列中的请求（如果有）
      if (isRefreshing) {
        processQueue(new Error('Token refresh failed'), null)
        isRefreshing = false
      }

      if (requestConfig?.showErrorMessage !== false) {
        ElMessage.error('Login expired, please log in again')
      }
      // 跳转到登录页（使用router，避免页面刷新）
      import('@/router').then(({ router }) => {
        router.push('/login')
      })
      return Promise.reject(new Error('Token refresh request returned 401'))
    }

    // 处理401错误 - 自动刷新token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 已有刷新流程时，后续 401 请求进入队列等待，避免并发刷新风暴。
        // 如果正在刷新token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            return serviceInstance.request(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true
      try {
        const userStore = useUserStore()

        // 调用 userStore 的 refreshUserToken 方法
        const result = await userStore.refreshUserToken()

        if (result.success && userStore.token) {
          // 更新当前请求的Authorization头
          originalRequest.headers['Authorization'] = `Bearer ${userStore.token}`

          // 处理队列中的请求
          processQueue(null, userStore.token)

          // 重试原请求
          return serviceInstance.request(originalRequest)
        } else {
          throw new Error(result.message || 'Token refresh failed')
        }
      } catch (refreshError) {
        // 刷新token失败，清除用户数据并跳转到登录页
        const userStoreRefresh = useUserStore()
        userStoreRefresh.clearUserData()

        // 处理队列中的请求
        processQueue(refreshError, null)
        if (requestConfig?.showErrorMessage !== false) {
          ElMessage.error('Login expired, please log in again')
        }
        // 跳转到登录页（使用router，避免页面刷新）
        import('@/router').then(({ router }) => {
          router.push('/login')
        })
        return Promise.reject(refreshError)
      } finally {
        // 无论刷新成功还是失败，都要复位刷新标记。
        isRefreshing = false
      }
    }

    // 处理其他错误：统一走 getUnifiedErrorMessage，确保各页面提示口径一致。
    const errorMessage = getUnifiedErrorMessage(error)
    if (requestConfig?.showErrorMessage !== false) {
      ElMessage.error(errorMessage)
    }
    return Promise.reject(error)
  }

  return [responseSuccessHandler, responseErrorHandler]
}

// 为服务实例添加响应拦截器
const [responseSuccessHandler, responseErrorHandler] = createResponseInterceptor(service)
service.interceptors.response.use(responseSuccessHandler, responseErrorHandler)

/**
 * 封装的请求方法类
 */
class Request {
  /**
   * GET请求
   * @param url 请求地址（已包含完整路径，如 /api/v1/users 或 /alarmApi/alarms）
   * @param params 请求参数
   * @param config 请求配置
   */
  static async get<T = any>(
    url: string,
    params?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await service.get(url, { params, ...config })
    return response.data
  }

  /**
   * POST请求
   * @param url 请求地址（已包含完整路径，如 /api/v1/users 或 /alarmApi/alarms）
   * @param data 请求数据
   * @param config 请求配置
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await service.post(url, data, config)
    return response.data
  }

  /**
   * PUT请求
   * @param url 请求地址（已包含完整路径，如 /api/v1/users 或 /alarmApi/alarms）
   * @param data 请求数据
   * @param config 请求配置
   */
  static async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await service.put(url, data, config)
    return response.data
  }

  /**
   * DELETE请求
   * @param url 请求地址（已包含完整路径，如 /api/v1/users 或 /alarmApi/alarms）
   * @param config 请求配置
   */
  static async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    const response = await service.delete(url, config)
    return response.data
  }

  /**
   * PATCH请求
   * @param url 请求地址（已包含完整路径，如 /api/v1/users 或 /alarmApi/alarms）
   * @param data 请求数据
   * @param config 请求配置
   */
  static async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await service.patch(url, data, config)
    return response.data
  }

  /**
   * 文件上传
   * @param url 上传地址（已包含完整路径，如 /api/v1/upload 或 /alarmApi/upload）
   * @param file 文件对象
   * @param data 额外数据
   * @param config 请求配置
   */
  static async upload<T = any>(
    url: string,
    file: File,
    data?: any,
    config?: RequestConfig,
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    // 添加额外数据
    if (data) {
      Object.keys(data).forEach((key) => {
        formData.append(key, data[key])
      })
    }

    const response = await service.post(url, formData, config)
    return response.data
  }

  /**
   * 下载文件
   * @param url 下载地址（已包含完整路径，如 /api/v1/export 或 /alarmApi/export）
   * @param params 请求参数
   * @param filename 文件名
   * @param config 额外请求配置（如 timeout）
   */
  static async download(
    url: string,
    params?: any,
    filename?: string,
    config?: RequestConfig,
  ): Promise<void> {
    try {
      const response = await service.get(url, {
        params,
        responseType: 'blob',
        showErrorMessage: false,
        ...config,
      })
      const blob = new Blob([response.data])
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const result = await saveBytesWithPreferredPath(
        bytes,
        filename || `download_${Date.now()}`,
        blob.type || 'application/octet-stream',
      )

      ElMessage.success(`File downloaded: ${result.displayPath}`)
    } catch (error) {
      if (isRequestCanceled(error)) return

      const status = (error as any)?.response?.status
      const errorMessage =
        status === 404 ? 'File not found' : getUnifiedErrorMessage(error as any, 'File download failed')

      console.error('File download failed:', error)
      ElMessage.error(errorMessage || 'File download failed')
    }
  }
}

// 取消所有pending请求的方法
export const cancelAllPendingRequests = () => {
  pendingRequests.value.forEach((cancelController) => {
    cancelController.abort('request canceled')
  })
  pendingRequests.value.clear()
  updateGlobalLoading()
}

// 取消指定 URL 的 pending 请求（按 method 前缀匹配）
export const cancelPendingRequestsByUrl = (url: string, method: string = 'post') => {
  const prefix = `${method.toLowerCase()}-${url}-`
  pendingRequests.value.forEach((cancelController, key: string) => {
    if (key.startsWith(prefix)) {
      cancelController.abort('request canceled')
      pendingRequests.value.delete(key)
    }
  })
  updateGlobalLoading()
}

// 导出服务实例和Request类
export { service, Request }
export default Request
