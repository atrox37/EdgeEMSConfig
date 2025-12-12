/**
 * WebSocket 连接管理器
 * 提供全局WebSocket连接管理和数据订阅功能
 *
 * 主要功能：
 *  - 管理WebSocket连接的生命周期（连接、断开、重连、心跳等）
 *  - 支持多频道数据订阅与取消订阅
 *  - 支持批量数据、告警、控制命令等多种消息类型
 *  - 提供全局和局部监听器机制
 *  - 连接状态、统计信息响应式
 *  - 智能订阅队列管理，避免重复订阅和取消订阅冲突
 */

import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type {
  ConnectionStatus,
  ClientMessage,
  ServerMessage,
  SubscriptionConfig,
  ListenerConfig,
  SubscribeMessage,
  UnsubscribeMessage,
  ControlMessage,
  PingMessage,
  CommandType,
  UnsubscribeAckMessage,
} from '@/types/websocket'

// WebSocket连接配置
interface WebSocketConfig {
  url: string
  reconnectInterval?: number // 重连间隔(ms)
  maxReconnectAttempts?: number // 最大重连次数
  heartbeatInterval?: number // 心跳间隔(ms)
  heartbeatTimeout?: number // 心跳超时时间(ms)
}

// 待订阅信息结构
interface PendingSubscription {
  id: string
  pageId: string
  config: SubscriptionConfig
  listeners: any
  timestamp: number
}

// 待取消订阅信息结构
interface PendingUnsubscription {
  id: string
  pageId: string
  channels: number[]
  timestamp: number
}

class WebSocketManager {
  // WebSocket实例
  private ws: WebSocket | null = null
  // WebSocket配置
  private config: WebSocketConfig
  // 当前重连次数
  private reconnectAttempts = 0
  // 心跳定时器
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  // 心跳超时定时器
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  // 重连定时器
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  // 消息ID计数器
  private messageIdCounter = 0

  // 响应式连接状态
  public readonly status = ref<ConnectionStatus>('disconnected')
  // 是否已连接
  public readonly isConnected = computed(() => this.status.value === 'connected')
  // 是否正在连接
  public readonly isConnecting = computed(() => this.status.value === 'connecting')

  // 全局监听器配置
  private globalListeners: ListenerConfig = {}

  // 页面订阅管理：页面ID -> 订阅记录
  private pageSubscriptions = new Map<
    string,
    {
      id: string
      config: SubscriptionConfig
      listeners: {
        onDataUpdate?: (data: any) => void
        onBatchDataUpdate?: (data: any) => void
        onAlarm?: (alarm: any) => void
      }
    }
  >()

  // 新增：待订阅信息Map - 管理等待订阅的请求
  private pendingSubscriptionsMap = new Map<string, PendingSubscription>()

  // 新增：待取消订阅信息Map - 管理等待取消订阅的请求
  private pendingUnsubscriptionsMap = new Map<string, PendingUnsubscription>()

  // 连接统计信息（响应式）
  public readonly connectionStats = reactive({
    connectTime: 0, // 上次连接时间戳
    disconnectTime: 0, // 上次断开时间戳
    messageCount: 0, // 收到的消息总数
    errorCount: 0, // 错误次数
    latency: 0, // 最近一次心跳延迟
  })

  /**
   * 构造函数，初始化WebSocket配置
   * @param config WebSocketConfig
   */
  constructor(config: WebSocketConfig) {
    // 合并默认配置和传入配置
    this.config = {
      reconnectInterval: 5000, // 默认重连间隔5秒
      maxReconnectAttempts: Infinity, // 默认最大重连10次
      heartbeatInterval: 5000, // 默认心跳间隔30秒
      heartbeatTimeout: 3000, // 默认心跳超时10秒
      ...config,
    }
  }

  /**
   * 发送订阅消息
   * @param config 订阅配置
   * @param messageId 消息ID
   */
  private sendSubscribeMessage(config: SubscriptionConfig, messageId: string): void {
    const subscribeMessage: SubscribeMessage = {
      id: messageId,
      type: 'subscribe',
      timestamp: '',
      data: {
        channels: config.channels,
        data_types: config.dataTypes,
        interval: config.interval,
      },
    }

    this.sendMessage(subscribeMessage)
    console.log('[WebSocket] 发送订阅消息:', messageId, config)
  }

  /**
   * 发送取消订阅消息
   * @param channels 频道列表
   * @param messageId 消息ID
   */
  private sendUnsubscribeMessage(channels: number[], messageId: string): void {
    const unsubscribeMessage: UnsubscribeMessage = {
      id: messageId,
      type: 'unsubscribe',
      timestamp: '',
      data: {
        channels: channels,
      },
    }

    this.sendMessage(unsubscribeMessage)
    console.log('[WebSocket] 发送取消订阅消息:', messageId, channels)
  }

  /**
   * 生成唯一消息ID
   * @returns 唯一ID字符串
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`
  }

  /**
   * 检查两个订阅配置是否相同
   * @param config1 订阅配置1
   * @param config2 订阅配置2
   * @returns 是否相同
   */
  private isSameSubscription(config1: SubscriptionConfig, config2: SubscriptionConfig): boolean {
    return (
      JSON.stringify(config1.channels.sort()) === JSON.stringify(config2.channels.sort()) &&
      JSON.stringify(config1.dataTypes.sort()) === JSON.stringify(config2.dataTypes.sort()) &&
      config1.interval === config2.interval
    )
  }

  /**
   * 处理待取消订阅队列
   * 当待取消订阅Map中有数据时，优先处理取消订阅
   */
  private processPendingUnsubscriptions(): void {
    if (this.pendingUnsubscriptionsMap.size === 0) {
      return
    }

    console.log('[WebSocket] 处理待取消订阅队列，数量:', this.pendingUnsubscriptionsMap.size)

    // 遍历所有待取消订阅的请求
    for (const [id, unsubInfo] of this.pendingUnsubscriptionsMap) {
      // 检查是否有相同的待订阅信息
      let hasMatchingSubscription = false

      for (const [subId, subInfo] of this.pendingSubscriptionsMap) {
        if (subInfo.pageId === unsubInfo.pageId) {
          console.log('[WebSocket] 发现匹配的待订阅信息，跳过取消订阅:', subId)
          // 清除待订阅信息
          this.pendingSubscriptionsMap.delete(subId)
          hasMatchingSubscription = true
          break
        }
      }

      if (!hasMatchingSubscription) {
        // 发送取消订阅请求，但不立即清除Map
        this.sendUnsubscribeMessage(unsubInfo.channels, id)
        console.log('[WebSocket] 发送取消订阅请求，等待确认:', id)
      } else {
        // 如果有匹配的订阅信息，直接清除取消订阅请求
        this.pendingUnsubscriptionsMap.delete(id)
      }
    }
  }

  /**
   * 处理待订阅队列
   * 只有当待取消订阅Map为空时才处理订阅
   */
  private processPendingSubscriptions(): void {
    if (this.pendingUnsubscriptionsMap.size > 0) {
      console.log('[WebSocket] 有待取消订阅请求，延迟处理订阅')
      return
    }

    if (this.pendingSubscriptionsMap.size === 0) {
      return
    }

    console.log('[WebSocket] 处理待订阅队列，数量:', this.pendingSubscriptionsMap.size)

    // 遍历所有待订阅的请求
    for (const [id, subInfo] of this.pendingSubscriptionsMap) {
      // 发送订阅消息，但不立即清除Map
      this.sendSubscribeMessage(subInfo.config, id)

      // 记录页面订阅
      this.pageSubscriptions.set(subInfo.pageId, {
        id: subInfo.id,
        config: subInfo.config,
        listeners: subInfo.listeners,
      })

      console.log('[WebSocket] 发送订阅请求，等待确认:', id)
      // 不从待订阅Map中移除，等待确认消息
    }
  }

  /**
   * 建立WebSocket连接
   * @returns Promise<void>
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查用户登录状态和token
      const userStore = useUserStore()
      if (!userStore.isLoggedIn || !userStore.token) {
        console.log('[WebSocket] 用户未登录或token无效，跳过连接')
        reject(new Error('User not logged in or token invalid'))
        return
      }

      // 已连接则直接resolve
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      // 设置状态为连接中
      this.status.value = 'connecting'
      this.connectionStats.connectTime = Date.now()

      try {
        // 创建WebSocket实例
        this.ws = new WebSocket(this.config.url)
        // 设置事件处理器
        this.setupEventHandlers(resolve, reject)
      } catch (error) {
        // 连接异常处理
        this.handleError(error as Error)
        reject(error)
      }
    })
  }

  /**
   * 设置WebSocket事件处理器
   * @param onConnect 连接成功回调
   * @param onError 连接错误回调
   */
  private setupEventHandlers(onConnect: () => void, onError: (error: Error) => void): void {
    if (!this.ws) return

    // 连接成功事件
    this.ws.onopen = () => {
      console.log('[WebSocket] 连接成功')
      this.status.value = 'connected'
      this.reconnectAttempts = 0
      this.connectionStats.connectTime = Date.now()
      this.startHeartbeat() // 启动心跳
      this.globalListeners.onConnect?.() // 全局连接回调

      //连接成功后处理队列
      this.processPendingUnsubscriptions()
      this.processPendingSubscriptions()

      onConnect()
    }

    // 收到消息事件
    this.ws.onmessage = (event) => {
      try {
        // 解析消息
        const message: ServerMessage = JSON.parse(event.data)
        this.handleMessage(message)
        this.connectionStats.messageCount++
      } catch (error) {
        // 消息解析失败
        console.error('[WebSocket] 消息解析失败:', error)
        this.connectionStats.errorCount++
      }
    }

    // 连接关闭事件
    this.ws.onclose = (event) => {
      console.log('[WebSocket] 连接关闭:', event.code, event.reason)
      this.status.value = 'disconnected'
      this.connectionStats.disconnectTime = Date.now()
      this.stopHeartbeat() // 停止心跳
      this.globalListeners.onDisconnect?.() // 全局断开回调

      // 如果不是主动关闭且未超最大重连次数，则尝试重连
      if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
        this.scheduleReconnect()
      }
    }

    // 连接错误事件
    this.ws.onerror = (error) => {
      console.error('[WebSocket] 连接错误:', error)
      this.status.value = 'error'
      this.connectionStats.errorCount++
      const wsError = new Error('WebSocket连接错误')
      this.handleError(wsError)
      onError(wsError)
    }
  }

  /**
   * 处理接收到的服务器消息
   * @param message 服务器消息
   */
  private handleMessage(message: ServerMessage): void {
    console.log('[WebSocket] 收到消息:', message)

    // 根据消息类型分发处理
    switch (message.type) {
      case 'connection_established':
        // 连接成功
        // console.log('[WebSocket] 连接成功')
        break
      case 'data_update':
        // 单条数据更新
        this.handleDataUpdate((message as any).data)
        break
      case 'data_batch':
        // 批量数据更新
        this.handleBatchDataUpdate((message as any).data)
        break
      case 'alarm':
        // 告警消息
        this.handleAlarm((message as any).data)
        break
      case 'subscribe_ack':
        // 订阅确认
        this.handleSubscribeAck((message as any).data)
        break
      case 'unsubscribe_ack':
        // 取消订阅确认
        this.handleUnsubscribeAck((message as any).data)
        break
      case 'control_ack':
        // 控制命令确认
        this.handleControlAck((message as any).data)
        break
      case 'error':
        // 服务器错误
        this.handleServerError((message as any).data)
        break
      case 'pong':
        // 心跳响应
        this.handlePong((message as any).data)
        break
      case 'alarm_num':
        // 告警数量更新
        this.handleAlarmNum((message as any).data)
        break
      default:
        // 未知类型
        console.warn('[WebSocket] 未知消息类型:', (message as any).type)
    }
  }

  /**
   * 处理单条数据更新
   * @param data 数据内容
   */
  private handleDataUpdate(data: any): void {
    // 通知全局数据更新监听器
    this.globalListeners.onDataUpdate?.(data)

    // 通知相关页面订阅者
    this.pageSubscriptions.forEach((record) => {
      if (record.config.channels.includes(data.channel_id)) {
        record.listeners.onDataUpdate?.(data)
      }
    })
  }

  /**
   * 处理批量数据更新
   * @param data 批量数据内容
   */
  private handleBatchDataUpdate(data: any): void {
    // 通知全局批量数据监听器
    this.globalListeners.onBatchDataUpdate?.(data)

    // 通知相关页面订阅者
    this.pageSubscriptions.forEach((record) => {
      const relevantUpdates = data.updates.filter((update: any) =>
        record.config.channels.includes(update.channel_id),
      )
      if (relevantUpdates.length > 0) {
        record.listeners.onBatchDataUpdate?.({ updates: relevantUpdates })
      }
    })
  }

  /**
   * 处理告警消息
   * @param alarm 告警内容
   */
  private handleAlarm(alarm: any): void {
    // 通知全局告警监听器
    this.globalListeners.onAlarm?.(alarm)

    // 通知所有页面订阅者
    this.pageSubscriptions.forEach((record) => {
      record.listeners.onAlarm?.(alarm)
    })
  }

  /**
   * 处理订阅确认消息
   * @param data 订阅确认内容
   */
  private handleSubscribeAck(data: any): void {
    console.log('[WebSocket] 订阅确认:', data)

    // 通过request_id查找对应的待订阅信息并清理
    const requestId = data.request_id
    if (requestId) {
      // 查找并清理待订阅Map中对应的信息
      for (const [id, subInfo] of this.pendingSubscriptionsMap) {
        if (id === requestId) {
          console.log('[WebSocket] 清理已确认的订阅请求:', id)
          this.pendingSubscriptionsMap.delete(id)
          break
        }
      }
    }

    // 如果有订阅失败的频道，弹出警告
    if (data.failed.length > 0) {
      ElMessage.warning(`部分频道订阅失败: ${data.failed.join(', ')}`)
    }

    // 订阅确认后，检查是否可以处理待订阅队列
    if (this.pendingSubscriptionsMap.size > 0) {
      console.log('[WebSocket] 订阅确认后，继续处理待订阅队列')
      this.processPendingSubscriptions()
    }
  }

  /**
   * 处理取消订阅确认消息
   * @param data 取消订阅确认内容
   */
  private handleUnsubscribeAck(data: any): void {
    console.log('[WebSocket] 取消订阅确认:', data)

    // 通过request_id查找对应的待取消订阅信息并清理
    const requestId = data.request_id
    if (requestId) {
      // 查找并清理待取消订阅Map中对应的信息
      for (const [id, unsubInfo] of this.pendingUnsubscriptionsMap) {
        if (id === requestId) {
          console.log('[WebSocket] 清理已确认的取消订阅请求:', id)
          this.pendingUnsubscriptionsMap.delete(id)
          break
        }
      }
    }

    // 处理取消订阅确认后的逻辑
    if (data.unsubscribed.length > 0) {
      console.log('[WebSocket] 成功取消订阅的频道:', data.unsubscribed)
    }

    if (data.failed.length > 0) {
      ElMessage.warning(`部分频道取消订阅失败: ${data.failed.join(', ')}`)
    }

    // 处理完取消订阅确认后，检查是否可以处理待订阅队列
    if (this.pendingUnsubscriptionsMap.size === 0 && this.pendingSubscriptionsMap.size > 0) {
      console.log('[WebSocket] 取消订阅确认后，开始处理待订阅队列')
      this.processPendingSubscriptions()
    }
  }

  /**
   * 处理控制命令确认消息
   * @param data 控制命令确认内容
   */
  private handleControlAck(data: any): void {
    console.log('[WebSocket] 控制命令确认:', data)
    // 控制命令执行失败时弹出错误
    if (!data.result.success) {
      ElMessage.error(`控制命令执行失败: ${data.result.error_message}`)
    }
  }

  /**
   * 处理告警数量更新消息
  /**
   * 处理告警数量更新消息
   * @param data 告警数量更新内容
   */
  private handleAlarmNum(data: any): void {
    console.log('[WebSocket] 告警数量更新:', data)
    this.globalListeners.onAlarmNum?.(data)
  }

  /**
   * 处理服务器错误消息
   * @param error 错误内容
   */
  private handleServerError(error: any): void {
    console.error('[WebSocket] 服务器错误:', error)
    this.globalListeners.onError?.(error)
    ElMessage.error(`WebSocket错误: ${error.message}`)
  }

  /**
   * 处理心跳响应消息
   * @param data 心跳响应内容
   */
  private handlePong(data: any): void {
    // 更新延迟统计
    this.connectionStats.latency = data.latency

    // 新增：收到pong后关闭心跳超时定时器
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /**
   * 发送消息到服务器
   * @param message 客户端消息
   */
  private sendMessage(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket未连接')
    }
    // 添加时间戳
    message.timestamp = new Date().toISOString()

    const messageStr = JSON.stringify(message)
    this.ws.send(messageStr)
    console.log('[WebSocket] 发送消息:', message)
  }

  /**
   * 订阅数据频道（全局订阅）
   * @param config 订阅配置
   */
  public subscribe(config: SubscriptionConfig): void {
    // 检查是否有待取消订阅的请求
    if (this.pendingUnsubscriptionsMap.size > 0) {
      console.log('[WebSocket] 有待取消订阅请求，将订阅请求添加到队列')
      // 添加到待订阅队列
      const messageId = this.generateMessageId()
      this.pendingSubscriptionsMap.set(messageId, {
        id: messageId,
        pageId: 'global',
        config,
        listeners: {},
        timestamp: Date.now(),
      })
      return
    }

    // 直接发送订阅消息，并添加到待订阅队列等待确认
    const messageId = this.generateMessageId()
    this.pendingSubscriptionsMap.set(messageId, {
      id: messageId,
      pageId: 'global',
      config,
      listeners: {},
      timestamp: Date.now(),
    })
    this.sendSubscribeMessage(config, messageId)
    console.log('[WebSocket] 发送全局订阅请求，等待确认:', messageId)
  }

  /**
   * 页面订阅数据频道
   * @param pageId 页面ID
   * @param config 订阅配置
   * @param listeners 页面监听器
   * @returns 订阅ID
   */
  public subscribePage(
    pageId: string,
    config: SubscriptionConfig,
    listeners: {
      onDataUpdate?: (data: any) => void
      onBatchDataUpdate?: (data: any) => void
      onAlarm?: (alarm: any) => void
    },
  ): string {
    const subscriptionId = `page_${pageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 检查是否有待取消订阅的请求
    if (this.pendingUnsubscriptionsMap.size > 0) {
      console.log('[WebSocket] 有待取消订阅请求，将页面订阅请求添加到队列:', pageId)
      // 添加到待订阅队列
      const messageId = this.generateMessageId()
      this.pendingSubscriptionsMap.set(messageId, {
        id: messageId,
        pageId,
        config,
        listeners,
        timestamp: Date.now(),
      })
      return subscriptionId
    }

    // 记录页面订阅
    this.pageSubscriptions.set(pageId, {
      id: subscriptionId,
      config,
      listeners,
    })

    // 直接发送订阅消息，并添加到待订阅队列等待确认
    const messageId = this.generateMessageId()
    this.pendingSubscriptionsMap.set(messageId, {
      id: messageId,
      pageId,
      config,
      listeners,
      timestamp: Date.now(),
    })
    this.sendSubscribeMessage(config, messageId)
    console.log(`[WebSocket] 页面订阅成功: ${pageId}，等待确认:`, messageId)
    return subscriptionId
  }

  /**
   * 取消订阅（全局订阅）
   * @param channels 可选，指定要取消的频道
   */
  public unsubscribe(channels?: number[]): void {
    const messageId = this.generateMessageId()

    // 添加到待取消订阅队列
    this.pendingUnsubscriptionsMap.set(messageId, {
      id: messageId,
      pageId: 'global',
      channels: channels || [],
      timestamp: Date.now(),
    })

    console.log('[WebSocket] 取消订阅请求已添加到队列:', messageId, channels)

    // 如果连接已建立，立即处理队列
    if (this.isConnected.value) {
      this.processPendingUnsubscriptions()
    }
  }

  /**
   * 取消页面订阅
   * @param pageId 页面ID
   * @param channels 可选，指定要取消的频道
   */
  public unsubscribePage(pageId: string, channels?: number[]): void {
    const record = this.pageSubscriptions.get(pageId)
    if (!record) return

    const messageId = this.generateMessageId()
    const channelsToUnsubscribe = channels || record.config.channels

    // 添加到待取消订阅队列
    this.pendingUnsubscriptionsMap.set(messageId, {
      id: messageId,
      pageId,
      channels: channelsToUnsubscribe,
      timestamp: Date.now(),
    })

    console.log(`[WebSocket] 页面取消订阅请求已添加到队列: ${pageId}`, channelsToUnsubscribe)

    // 如果指定了部分频道，只移除这些频道
    if (channels) {
      record.config.channels = record.config.channels.filter(
        (channel) => !channels.includes(channel),
      )
    } else {
      // 否则完全移除该页面订阅
      this.pageSubscriptions.delete(pageId)
    }

    // 如果连接已建立，立即处理队列
    if (this.isConnected.value) {
      this.processPendingUnsubscriptions()
    }
  }

  /**
   * 发送控制命令
   * @param channelId 频道ID
   * @param pointId 点位ID
   * @param commandType 命令类型
   * @param value 可选，命令值
   * @param operator 操作人，默认'system'
   * @param reason 可选，操作原因
   */
  public sendControlCommand(
    channelId: number,
    pointId: number,
    commandType: string,
    value?: number,
    operator: string = 'system',
    reason?: string,
  ): void {
    // 构造控制命令消息
    const controlMessage: ControlMessage = {
      id: this.generateMessageId(),
      type: 'control',
      timestamp: '',
      data: {
        channel_id: channelId,
        point_id: pointId,
        command_type: commandType as any,
        value,
        operator,
        reason,
      },
    }

    this.sendMessage(controlMessage)
  }

  /**
   * 发送心跳ping消息
   */
  public sendPing(): void {
    const pingMessage: PingMessage = {
      id: this.generateMessageId(),
      type: 'ping',
      timestamp: '',
    }

    this.sendMessage(pingMessage)
  }

  /**
   * 设置全局监听器
   * @param listeners 监听器配置
   */
  public setGlobalListeners(listeners: ListenerConfig): void {
    // 合并新旧监听器
    this.globalListeners = { ...this.globalListeners, ...listeners }
  }

  /**
   * 启动心跳机制
   * 定时发送ping消息，并设置超时检测
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    // 定时发送心跳
    this.heartbeatTimer = setInterval(() => {
      this.sendPing()
      console.log('[WebSocket] 发送心跳')
      // 设置心跳超时定时器
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer)
      }

      this.heartbeatTimeoutTimer = setTimeout(() => {
        // 超时未收到pong，断开连接并触发重连
        console.warn('[WebSocket] 心跳超时，关闭连接并尝试重连')
        this.disconnect()
        // 触发重连机制
        if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
          this.scheduleReconnect()
        }
      }, this.config.heartbeatTimeout)
    }, this.config.heartbeatInterval)
  }

  /**
   * 停止心跳机制
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  /**
   * 安排重连
   * 使用指数退避算法延迟重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    // 指数退避计算重连延迟
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`[WebSocket] ${delay}ms后尝试重连 (第${this.reconnectAttempts}次)`)

    this.reconnectTimer = setTimeout(() => {
      this.globalListeners.onReconnect?.()
      this.connect().catch((error) => {
        console.error('[WebSocket] 重连失败:', error)
      })
    }, delay)
  }

  /**
   * 处理连接或消息错误
   * @param error 错误对象
   */
  private handleError(error: Error): void {
    console.error('[WebSocket] 错误:', error)
    this.globalListeners.onError?.({ code: 'CONNECTION_ERROR', message: error.message })
  }

  /**
   * 主动断开WebSocket连接
   */
  public disconnect(): void {
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 停止心跳
    this.stopHeartbeat()

    // 关闭WebSocket连接
    if (this.ws) {
      this.ws.close(1000, '主动断开连接')
      this.ws = null
    }
    // 清理所有订阅和监听器
    this.globalListeners = {}
    this.pageSubscriptions.clear()
    this.pendingSubscriptionsMap.clear()
    this.pendingUnsubscriptionsMap.clear()
    this.status.value = 'disconnected'
  }

  /**
   * 获取当前连接统计信息
   * @returns 统计信息对象
   */
  public getStats() {
    return {
      status: this.status.value,
      isConnected: this.isConnected.value,
      pageSubscriptions: this.pageSubscriptions.size,
      ...this.connectionStats,
    }
  }
}
console.log(import.meta.env.VITE_WS_URL, 'import.meta.env.VITE_WS_URL')
// 创建全局WebSocket管理器实例
const wsManager = new WebSocketManager({
  url: import.meta.env.VITE_WS_URL || 'ws://192.168.30.62:8080/ws',
})

export default wsManager
