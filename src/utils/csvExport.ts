/** 格式化更新时间戳（毫秒）为可读字符串 */
export function formatUpdateTime(ts: number | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '-'
  return new Date(ts).toLocaleString()
}

/** 格式化更新时间戳用于 CSV 导出（ISO 8601） */
export function formatUpdateTimeForCsv(ts: number | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return ''
  return new Date(ts).toISOString()
}

export function sanitizeFileNamePart(value: string, fallback = 'channel'): string {
  const trimmed = String(value || '').trim()
  const safe = trimmed.replace(/[^\w-]+/g, '_')
  return safe || fallback
}

export function getTimestampCompact(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '')
}

export function buildChannelCsvFilename(channelName: string, parts: string[]): string {
  const safeChannel = sanitizeFileNamePart(channelName, 'channel')
  const safeParts = parts.filter((p) => p && String(p).trim().length > 0)
  return `${[safeChannel, ...safeParts].join('_')}.csv`
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
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
