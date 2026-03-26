const DOWNLOAD_PATH_STORAGE_KEY = 'monarch-download-path'

export function getDownloadPath(): string {
  try {
    return localStorage.getItem(DOWNLOAD_PATH_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setDownloadPath(path: string): void {
  try {
    localStorage.setItem(DOWNLOAD_PATH_STORAGE_KEY, path.trim())
  } catch {
    // Ignore storage failures and keep app usable.
  }
}

export async function ensureDefaultDownloadPath(): Promise<string> {
  const existing = getDownloadPath()
  if (existing) return existing

  try {
    const { downloadDir } = await import('@tauri-apps/api/path')
    const systemDownloads = await downloadDir()
    if (systemDownloads) {
      setDownloadPath(systemDownloads)
      return systemDownloads
    }
  } catch {
    // Ignore when path API is unavailable and let callers fallback gracefully.
  }

  return ''
}
