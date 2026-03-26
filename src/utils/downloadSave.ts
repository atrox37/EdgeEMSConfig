import { invoke } from '@tauri-apps/api/core'
import { ensureDefaultDownloadPath } from '@/utils/downloadPath'

function fallbackBrowserDownload(bytes: Uint8Array, filename: string, mimeType?: string) {
  const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function saveBytesWithPreferredPath(
  bytes: Uint8Array,
  filename: string,
  mimeType?: string,
): Promise<{ mode: 'custom_path' | 'browser_default'; savedPath?: string; displayPath: string }> {
  const preferredPath = await ensureDefaultDownloadPath()
  if (!preferredPath) {
    fallbackBrowserDownload(bytes, filename, mimeType)
    return { mode: 'browser_default', displayPath: `System default/${filename}` }
  }

  try {
    const savedPath = await invoke<string>('save_file_to_path', {
      directory: preferredPath,
      fileName: filename,
      bytes: Array.from(bytes),
    })
    return { mode: 'custom_path', savedPath, displayPath: savedPath }
  } catch (error) {
    // If native save fails, fallback to browser download so user still gets file.
    fallbackBrowserDownload(bytes, filename, mimeType)
    return { mode: 'browser_default', displayPath: `System default/${filename}` }
  }
}
