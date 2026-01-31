import { describe, it, expect } from 'vitest'
import { staticRoutes } from '../static-routes'

describe('Static Routes', () => {
  it('should have correct route structure', () => {
    expect(Array.isArray(staticRoutes)).toBe(true)
    expect(staticRoutes.length).toBeGreaterThanOrEqual(2)
  })

  it('should contain login route', () => {
    const loginRoute = staticRoutes.find((route) => route.path === '/login')
    expect(loginRoute).toBeDefined()
    expect(loginRoute?.name).toBe('login')
    expect(loginRoute?.meta?.activeNav).toBe('/login')
  })

  it('should contain main route with children', () => {
    const mainRoute = staticRoutes.find((route) => route.path === '/')
    expect(mainRoute).toBeDefined()
    expect(mainRoute?.name).toBe('main')
    expect(mainRoute?.meta?.activeNav).toBe('/')
    expect(mainRoute?.children).toBeDefined()
    expect(mainRoute?.children?.length).toBeGreaterThan(0)
    expect(mainRoute?.redirect).toBe('/channelConfiguration')
  })

  it('should have correct component imports', () => {
    const loginRoute = staticRoutes.find((route) => route.path === '/login')
    const mainRoute = staticRoutes.find((route) => route.path === '/')

    expect(loginRoute?.component).toBeDefined()
    expect(mainRoute?.component).toBeDefined()
  })

  it('should contain channelConfiguration route', () => {
    const mainRoute = staticRoutes.find((route) => route.path === '/')
    const channelRoute = mainRoute?.children?.find((route) => route.path === '/channelConfiguration')
    expect(channelRoute).toBeDefined()
    expect(channelRoute?.name).toBe('channelConfiguration')
  })
})
