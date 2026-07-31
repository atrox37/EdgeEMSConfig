import { router } from '@/router'

export function goToLogin(): void {
  if (router.currentRoute.value.path === '/login') return
  void router.replace('/login')
}
