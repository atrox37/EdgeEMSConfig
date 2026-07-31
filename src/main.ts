import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import 'element-plus/dist/index.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import App from './App.vue'
import router from './router'
import './router/guard' // 注册路由守卫
import { useUserStore } from '@/stores/user'
import { permissionDirective } from './utils/directives'
import { installElMessage } from './plugins/elMessage'
import { getApiConfig, setAxiosBaseURL } from './utils/apiConfig'
import { installSelectOverflowTooltip } from './utils/selectTooltip'

const app = createApp(App)
const pinia = createPinia()

// 配置Pinia持久化插件
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
installElMessage(app)

// 注册自定义指令 v-permission
app.directive('permission', permissionDirective)
installSelectOverflowTooltip()

app.use(router)

// 应用启动时初始化
async function initApp() {
  try {
    // 1. 加载API配置
    const apiConfig = await getApiConfig()
    if (apiConfig) {
      await setAxiosBaseURL(apiConfig)
    }

    // 2. 加载refreshToken
    const userStore = useUserStore()
    await userStore.loadRefreshToken()

    // 3. 如果有refreshToken，尝试刷新token和获取用户信息
    if (userStore.refreshToken && apiConfig) {
      const refreshResult = await userStore.refreshUserToken()
      if (refreshResult.success) {
        // Token刷新成功，获取用户信息
        await userStore.getUserInfo()
      } else {
        // Token刷新失败，清除数据
        await userStore.clearUserData()
      }
    }
    // 4. Auth restore succeeded but route may still stay on /login.
    // Auto-redirect after boot when user is already logged in.
    const currentRoute = router.currentRoute.value
    if (userStore.isLoggedIn && (currentRoute.path === '/login' || currentRoute.path === '/setup')) {
      const redirect = typeof currentRoute.query?.redirect === 'string' ? currentRoute.query.redirect : ''
      const target = redirect && redirect !== '/login' && redirect !== '/setup'
        ? redirect
        : '/channelConfiguration'
      await router.replace(target)
    }
  } catch (error) {
    console.error('App initialization failed:', error)
  }
}

// 初始化应用
initApp().then(() => {
  app.mount('#app')
})

// 应用启动后初始化WebSocket
