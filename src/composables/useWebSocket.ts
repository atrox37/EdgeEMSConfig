/**
 * WebSocket 连接管理 Composable
 * 提供全局WebSocket连接状态管理和数据订阅功能
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import wsManager from '@/utils/websocket'
import type { ListenerConfig, SubscriptionConfig, DataType } from '@/types/websocket'

/**
 * WebSocket连接管理
 * @returns WebSocket连接状态和方法
 */
export default function useWebSocket(
  pageId: string,
  config: SubscriptionConfig,
  listeners: ListenerConfig,
) {
  // 连接状态
  const status = computed(() => wsManager.status.value)
  const isConnected = computed(() => wsManager.isConnected.value)
  const isConnecting = computed(() => wsManager.isConnecting.value)

  // 连接统计
  const stats = computed(() => wsManager.getStats())

  /**
   * 设置全局监听器
   */
  const setGlobalListeners = (listeners: ListenerConfig) => {
    wsManager.setGlobalListeners(listeners)
  }

  /**
   * 发送控制命令
   */
  const sendControlCommand = (
    channelId: number,
    pointId: number,
    commandType: string,
    value?: number,
    operator?: string,
    reason?: string,
  ) => {
    wsManager.sendControlCommand(channelId, pointId, commandType, value, operator, reason)
  }

  /**
   * 订阅数据（全局订阅）
   */
  const subscribe = (config: SubscriptionConfig) => {
    wsManager.subscribe(config)
  }

  /**
   * 取消订阅（全局订阅）
   */
  const unsubscribe = (channels?: number[]) => {
    wsManager.unsubscribe(channels)
  }

  /**
   * 页面订阅数据
   * @param pageId 页面ID
   * @param config 订阅配置
   * @param listeners 页面监听器
   */
  const subscribePage = (
    customPageId?: string,
    customConfig?: SubscriptionConfig,
    customListeners?: ListenerConfig,
  ) => {
    const finalPageId = customPageId || pageId
    const finalConfig = customConfig || config
    const finalListeners = customListeners || listeners
    return wsManager.subscribePage(finalPageId, finalConfig, finalListeners)
  }

  /**
   * 取消页面订阅
   * @param pageId 页面ID
   * @param channels 可选，指定要取消的频道
   */
  const unsubscribePage = (customPageId?: string, customChannels?: number[]) => {
    const finalPageId = customPageId || pageId
    const finalChannels = customChannels || config.channels
    wsManager.unsubscribePage(finalPageId, finalChannels)
  }

  // 定时器引用
  const reconnectTimer = ref<ReturnType<typeof setInterval> | null>(null)

  /**
   * 尝试连接并订阅
   */
  const tryConnectAndSubscribe = () => {
    if (status.value !== 'connected') {
      // 这里假设wsManager有connect方法，如果没有请补充
      wsManager.connect && wsManager.connect()
    }
    if (status.value === 'connected') {
      subscribePage(pageId, config, listeners)
    }
  }

  onMounted(() => {
    // 立即尝试一次
    tryConnectAndSubscribe()
    // 设置定时器，每2秒检查一次连接状态
    reconnectTimer.value = setInterval(() => {
      if (status.value === 'connected') {
        subscribePage(pageId, config, listeners)
        if (reconnectTimer.value) {
          clearInterval(reconnectTimer.value)
          reconnectTimer.value = null
        }
      }
    }, 1000)
  })

  onUnmounted(() => {
    // 清除定时器
    if (reconnectTimer.value !== null) {
      clearInterval(reconnectTimer.value)
      reconnectTimer.value = null
    } else {
      unsubscribePage(pageId, config.channels)
    }
  })

  return {
    // 状态
    status,
    isConnected,
    isConnecting,
    stats,

    // 全局监听器
    setGlobalListeners,
    // 控制命令
    sendControlCommand,
    // 全局订阅
    subscribe,
    unsubscribe,
    // 页面订阅
    subscribePage,
    unsubscribePage,
  }
}
