import { router } from './index'
import { useUserStore } from '@/stores/user'
import { ensureRoutesInjected } from './injector'
import { cancelAllPendingRequests } from '@/utils/request'

const WHITE_LIST = ['/login']

router.beforeEach(async (to, from, next) => {
  // 取消所有pending的请求
  cancelAllPendingRequests()

  const user = useUserStore()

  // 未登录：只允许进入白名单（走登录页）
  if (!user.token) {
    if (WHITE_LIST.includes(to.path) || to.meta.public) return next()
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 已有 token 但没有 userInfo：尝试获取用户信息（等价于刷新 token 检测）
  if (!user.userInfo) {
    try {
      const res = await user.getUserInfo()
      if (!res.success) {
        user.clearUserData()
        return next({ path: '/login', query: { redirect: to.fullPath } })
      }
    } catch {
      user.clearUserData()
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
  }

  // 已登录：确保已注入动态路由
  try {
    if (!user.routesInjected) {
      await ensureRoutesInjected()
      return next({ ...to, replace: true }) // 路由重定向
    } else {
      next()
    }
  } catch (e) {
    // 注入失败，保险起见登出
    user.clearUserData()
    next('/login')
  }
})
