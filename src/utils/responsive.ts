// 响应式配置工具（已禁用自适应，统一使用 px）

/**
 * 将设计稿中的px值转换为当前响应式下的px值
 * 注意：已禁用自适应，直接返回原值
 * @param designPx 设计稿中的px值
 * @returns 当前响应式下的px值（直接返回原值，不再缩放）
 */
export function pxToResponsive(designPx: number): number {
  // 不再进行缩放，直接返回原值
  return designPx
}

/**
 * 获取当前屏幕的缩放比例
 * 注意：已禁用自适应，始终返回 1
 * @returns 当前屏幕相对于设计稿的缩放比例（固定为 1）
 */
export function getCurrentScale(): number {
  return 1
}

/**
 * 获取当前根字体大小
 * 注意：已禁用自适应，返回固定值 16px（浏览器默认）
 * @returns 当前根字体大小（px）
 */
export function getCurrentFontSize(): number {
  return 16
}
