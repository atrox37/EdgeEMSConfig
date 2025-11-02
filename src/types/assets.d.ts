// 全局静态资源类型声明，避免在 TS 中导入资源时报错

declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.jpeg' {
  const src: string
  export default src
}
declare module '*.gif' {
  const src: string
  export default src
}
declare module '*.webp' {
  const src: string
  export default src
}
declare module '*.avif' {
  const src: string
  export default src
}

declare module '*.css' {
  const content: any
  export default content
}
declare module '*.scss' {
  const content: any
  export default content
}
declare module '*.sass' {
  const content: any
  export default content
}
declare module '*.less' {
  const content: any
  export default content
}

// 常见资源导入查询参数支持
declare module '*?raw' {
  const src: string
  export default src
}
declare module '*?url' {
  const src: string
  export default src
}
declare module '*.svg?component' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

