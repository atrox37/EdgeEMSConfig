import './assets/main.css'

import { createApp, type DirectiveBinding } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import App from './App.vue'
import router from './router'
import './router/guard' // 注册路由守卫
import { permissionDirective } from './utils/directives'
import { initResponsive } from './utils/responsive'
import { installElMessage } from './plugins/elMessage'

const app = createApp(App)
const pinia = createPinia()

// 配置Pinia持久化插件
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
installElMessage(app)

// 注册自定义指令 v-permission
app.directive('permission', permissionDirective)

// 初始化响应式配置
initResponsive()

// 启动应用
app.mount('#app')

// 应用启动后初始化WebSocket
