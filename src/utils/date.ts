import dayjs from 'dayjs'

export type TimeRange = {
  start?: string
  end?: string
}

const isNumericString = (value: string) => /^-?\d+(\.\d+)?$/.test(value.trim())

export const toDateFromTimestamp = (
  value: number | string | Date | null | undefined,
): Date | null => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  if (typeof value === 'number') {
    const millis = Math.abs(value) < 1e11 ? value * 1000 : value
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const trimmed = value.trim()
  if (trimmed === '') return null

  if (isNumericString(trimmed)) {
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) return null
    const millis = Math.abs(numeric) < 1e11 ? numeric * 1000 : numeric
    const date = new Date(millis)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value: number | string | Date | null | undefined): string => {
  const date = toDateFromTimestamp(value)
  if (!date) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 最近 X 小时
export const getRecentHoursRange = (hours: number): TimeRange => {
  const end = dayjs()
  const start = end.subtract(hours, 'hour')
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

// 最近 X 天
export const getRecentDaysRange = (days: number): TimeRange => {
  const end = dayjs()
  const start = end.subtract(days, 'day')
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

// 最近一周
export const getRecentWeekRange = () => getRecentDaysRange(7)
