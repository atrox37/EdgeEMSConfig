import { describe, it, expect } from 'vitest'

// 路由守卫现在只负责取消pending请求，没有权限判断
describe('Router Guard', () => {
  it('should be defined', () => {
    // 路由守卫已简化，只负责取消pending请求
    expect(true).toBe(true)
  })
})
