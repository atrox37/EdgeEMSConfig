import type { InstancePointRouting } from '@/types/deviceConfiguration'

export type DevicePointCategory = 'measurement' | 'action' | 'property'
export type DevicePointTypeAbbr = 'T' | 'S' | 'C' | 'A'

export function getDeviceRoutingTypeOptions(category: DevicePointCategory) {
  if (category === 'measurement') {
    return [
      { label: 'Telemetry', value: 'T' },
      { label: 'Signal', value: 'S' },
    ]
  }
  if (category === 'action') {
    return [
      { label: 'Control', value: 'C' },
      { label: 'Adjustment', value: 'A' },
    ]
  }
  return [
    { label: 'Telemetry', value: 'T' },
    { label: 'Signal', value: 'S' },
    { label: 'Control', value: 'C' },
    { label: 'Adjustment', value: 'A' },
  ]
}

export function getDeviceRoutingTypeLabel(v?: string) {
  if (!v) return ''
  const map: Record<string, string> = {
    C: 'Control',
    S: 'Signal',
    T: 'Telemetry',
    A: 'Adjustment',
  }
  return map[String(v)] || String(v)
}

export function parseDeviceRoutingTypeStrict(input: unknown): {
  isValidLiteral: boolean
  abbr?: DevicePointTypeAbbr
} {
  const raw = String(input ?? '').trim()
  if (!raw) return { isValidLiteral: false }
  if (raw === 'T' || raw === 'S' || raw === 'C' || raw === 'A')
    return { isValidLiteral: true, abbr: raw }
  const fullToShort: Record<string, DevicePointTypeAbbr> = {
    Telemetry: 'T',
    Signal: 'S',
    Control: 'C',
    Adjustment: 'A',
  }
  if (raw in fullToShort) return { isValidLiteral: true, abbr: fullToShort[raw] }
  return { isValidLiteral: false }
}

export function validateDeviceRoutingRow(
  item: any,
  category: DevicePointCategory,
  meta?: { channelExists?: boolean; pointExists?: boolean },
): boolean {
  const r = item.routing || ({} as InstancePointRouting)
  let valid = true
  const isPositiveInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0
  const allowedTypes = getDeviceRoutingTypeOptions(category).map((o) => o.value)

  if (r.channel_id !== undefined && r.channel_id !== null && r.channel_id !== '') {
    if (!isPositiveInt(r.channel_id)) valid = false
  }
  if (valid && meta?.channelExists === false) valid = false

  if (valid && r.channel_type !== undefined && r.channel_type !== null && r.channel_type !== '') {
    const parsed = parseDeviceRoutingTypeStrict(r.channel_type)
    if (!parsed.isValidLiteral || !parsed.abbr) valid = false
    else if (!allowedTypes.includes(parsed.abbr)) valid = false
  }

  if (
    valid &&
    r.channel_point_id !== undefined &&
    r.channel_point_id !== null &&
    r.channel_point_id !== ''
  ) {
    if (!isPositiveInt(r.channel_point_id)) valid = false
  }
  if (valid && meta?.pointExists === false) valid = false

  if (valid && r.enabled !== undefined && r.enabled !== null && r.enabled !== '') {
    if (!(r.enabled === true || r.enabled === false)) valid = false
  }

  ;(item as any).isInvalid = !valid
  return valid
}

export function validateDeviceRoutingField(
  item: any,
  field: string,
  category: DevicePointCategory,
  meta?: { channelExists?: boolean; pointExists?: boolean },
): string {
  const r = item.routing || {}
  switch (field) {
    case 'channel_id': {
      if (r.channel_id === undefined || r.channel_id === null || r.channel_id === '') return ''
      const v = Number(r.channel_id)
      if (!Number.isInteger(v) || v <= 0) return 'must be positive integer'
      if (meta?.channelExists === false) return 'Does not exist'
      return ''
    }
    case 'channel_type': {
      if (r.channel_type === undefined || r.channel_type === null || r.channel_type === '')
        return ''
      const allowedOptions = getDeviceRoutingTypeOptions(category)
      const allowed = allowedOptions.map((o) => o.value)
      const labels = allowedOptions.map((o) => o.label).join(' / ')
      const parsed = parseDeviceRoutingTypeStrict(r.channel_type)
      if (!parsed.isValidLiteral || !parsed.abbr) return `Must be ${labels}`
      if (!allowed.includes(parsed.abbr)) return `Must be ${labels}`
      return ''
    }
    case 'channel_point_id': {
      if (
        r.channel_point_id === undefined ||
        r.channel_point_id === null ||
        r.channel_point_id === ''
      )
        return ''
      const v = Number(r.channel_point_id)
      if (!Number.isInteger(v) || v <= 0) return 'must be positive integer'
      if (meta?.channelExists === false) return 'Does not exist'
      if (meta?.pointExists === false) return 'Does not exist'
      return ''
    }
    case 'enabled': {
      const v = r.enabled
      if (v === undefined || v === null || v === '') return ''
      if (!(v === true || v === false)) return 'must be boolean'
      return ''
    }
    default:
      return ''
  }
}
