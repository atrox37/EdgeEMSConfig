/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string
  // 添加其他环境变量类型定义
  [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

