import { router } from './index'
import { cancelAllPendingRequests } from '@/utils/request'
import { useUserStore } from '@/stores/user'

const WHITE_LIST = ['/login']

router.beforeEach(async (to, _from, next) => {
  // 取消所有pending的请求
  cancelAllPendingRequests()

  const userStore = useUserStore()
  const isWhiteListed = WHITE_LIST.includes(to.path)

  // 白名单页面直接放行
  if (isWhiteListed) {
    // 如果已登录，访问登录页则跳转到首页
    if (userStore.isLoggedIn && to.path === '/login') {
      next({ name: 'channelConfiguration' })
      return
    }
    next()
    return
  }

  // 非白名单页面需要登录
  if (!userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  next()
})
