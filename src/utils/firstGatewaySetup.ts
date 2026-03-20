const STORAGE_KEY = 'monarch-first-gateway-setup-seen'

export function hasGatewayFirstSetupBeenSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // 读取失败时按“未初始化”处理，确保首次流程不会被跳过
    return false
  }
}

export function markGatewayFirstSetupSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
