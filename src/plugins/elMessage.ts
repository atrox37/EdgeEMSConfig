import type { App } from 'vue'
import { ElMessage } from 'element-plus'

export interface MessageOptions {
  type?: 'success' | 'warning' | 'info' | 'error'
  message: string
  duration?: number
}

export function installElMessage(app: App) {
  app.config.globalProperties.$message = ElMessage
}

export const message = {
  success(msg: string, duration = 2000) {
    ElMessage.success({ message: msg, duration })
  },
  warning(msg: string, duration = 2500) {
    ElMessage.warning({ message: msg, duration })
  },
  info(msg: string, duration = 2000) {
    ElMessage.info({ message: msg, duration })
  },
  error(msg: string, duration = 3000) {
    ElMessage.error({ message: msg, duration })
  },
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $message: typeof ElMessage
  }
}


