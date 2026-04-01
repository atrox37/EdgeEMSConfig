import { router } from './index'
import { cancelAllPendingRequests } from '@/utils/request'
import { useUserStore } from '@/stores/user'
import { hasGatewayFirstSetupBeenSeen } from '@/utils/firstGatewaySetup'

const WHITE_LIST = ['/login', '/setup']
const debugGuard = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[router-guard]', ...args)
  }
}

router.beforeEach(async (to, _from, next) => {
  // 取消所有pending的请求
  cancelAllPendingRequests()

  const userStore = useUserStore()

  // 未完成首次向导前，除 /setup 外一律先进入网关初始化页
  const gatewaySetupSeen = hasGatewayFirstSetupBeenSeen()
  debugGuard('enter', {
    to: to.fullPath,
    isLoggedIn: userStore.isLoggedIn,
    hasToken: Boolean(userStore.token),
    hasUserInfo: Boolean(userStore.userInfo),
    gatewaySetupSeen,
  })
  if (!gatewaySetupSeen && to.path !== '/setup') {
    debugGuard('redirect -> /setup (first setup not seen)')
    next({ path: '/setup', replace: true })
    return
  }
  const isWhiteListed = WHITE_LIST.includes(to.path)

  // 白名单页面直接放行
  if (isWhiteListed) {
    // 如果已登录，访问登录页则跳转到首页
    if (userStore.isLoggedIn && to.path === '/login') {
      debugGuard('redirect -> channelConfiguration (already logged in on /login)')
      next({ name: 'channelConfiguration' })
      return
    }
    debugGuard('allow white list route')
    next()
    return
  }

  // 非白名单页面需要登录
  if (!userStore.isLoggedIn) {
    debugGuard('redirect -> /login (not logged in)')
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  debugGuard('allow protected route')
  next()
})
