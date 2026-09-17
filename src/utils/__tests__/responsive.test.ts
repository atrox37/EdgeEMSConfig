import { describe, it, expect } from 'vitest'
import { pxToResponsive, getCurrentScale, getCurrentFontSize } from '../responsive'

// 自适应已禁用：统一使用 px，缩放恒为 1、根字号恒为 16
describe('Responsive Utils', () => {
  describe('pxToResponsive', () => {
    it('should return the original px value without scaling', () => {
      expect(pxToResponsive(100)).toBe(100)
      expect(pxToResponsive(0)).toBe(0)
    })
  })

  describe('getCurrentScale', () => {
    it('should always return 1 (adaptive disabled)', () => {
      expect(getCurrentScale()).toBe(1)
    })
  })

  describe('getCurrentFontSize', () => {
    it('should always return 16 (browser default)', () => {
      expect(getCurrentFontSize()).toBe(16)
    })
  })
})
