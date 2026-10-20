import type { PointType } from '@/types/channelConfiguration'
import type { Iec61850ReportConfig } from '@/types/channelConfiguration'

/** host:port — port 1–65535 */
export function validateIec61850HostPort(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return 'required'
  const colonIdx = raw.lastIndexOf(':')
  if (colonIdx <= 0 || colonIdx === raw.length - 1) return 'must be host:port'
  const host = raw.slice(0, colonIdx).trim()
  const portStr = raw.slice(colonIdx + 1).trim()
  if (!host) return 'host must not be empty'
  const port = Number(portStr)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'port must be 1-65535'
  return ''
}

/** MMS path: domain/item or domain:item */
export function validateIec61850MmsAddress(value: unknown): string {
  const address = String(value ?? '').trim()
  if (!address) return 'required'

  let domain = ''
  let item = ''
  const slashIdx = address.indexOf('/')
  const colonIdx = address.indexOf(':')
  if (slashIdx >= 0) {
    domain = address.slice(0, slashIdx).trim()
    item = address.slice(slashIdx + 1).trim()
  } else if (colonIdx >= 0) {
    domain = address.slice(0, colonIdx).trim()
    item = address.slice(colonIdx + 1).trim()
  } else {
    return "must be 'domain/item' or 'domain:item'"
  }
  if (!domain || !item) return "must be 'domain/item' or 'domain:item'"
  return ''
}

/** RCB ref format: LDInst/LNRef$BR|UR$RCBName */
export function validateIec61850RcbRef(value: unknown): string {
  const ref = String(value ?? '').trim()
  if (!ref) return 'required'
  const parts = ref.split('/')
  if (parts.length !== 2) return 'must match LDInst/LNRef$BR$RCBName or LDInst/LNRef$UR$RCBName'

  const domain = parts[0].trim()
  const objectRef = parts[1].trim()
  const firstDollar = objectRef.indexOf('$')
  const secondDollar = objectRef.indexOf('$', firstDollar + 1)
  if (!domain || firstDollar <= 0 || secondDollar <= firstDollar + 1) {
    return 'must match LDInst/LNRef$BR$RCBName or LDInst/LNRef$UR$RCBName'
  }

  const logicalNode = objectRef.slice(0, firstDollar).trim()
  const functionalConstraint = objectRef.slice(firstDollar + 1, secondDollar).trim()
  const rcbName = objectRef.slice(secondDollar + 1).trim()
  if (!logicalNode || !rcbName || !['BR', 'UR'].includes(functionalConstraint)) {
    return 'must match LDInst/LNRef$BR$RCBName or LDInst/LNRef$UR$RCBName'
  }
  return ''
}

export function validateIec61850DatasetMember(value: unknown): string {
  const member = String(value ?? '').trim()
  if (!member) return 'required'
  if (!member.includes('/')) return 'should contain / (MMS path style)'
  return ''
}

export function normalizeDatasetMembers(members: string[] | undefined): string[] {
  if (!members?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of members) {
    const trimmed = String(m ?? '').trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

export function isEmptyReportEntry(report: Iec61850ReportConfig): boolean {
  const rcb = String(report.rcb_ref ?? '').trim()
  const members = normalizeDatasetMembers(report.dataset_members)
  const rptId = String(report.rpt_id ?? '').trim()
  return !rcb && !rptId && members.length === 0
}

/** Remove blank report rows; normalize members */
export function sanitizeIec61850Reports(
  reports: Iec61850ReportConfig[] | undefined,
): Iec61850ReportConfig[] {
  if (!reports?.length) return []
  return reports
    .filter((r) => !isEmptyReportEntry(r))
    .map((r) => ({
      rcb_ref: String(r.rcb_ref ?? '').trim(),
      rpt_id: String(r.rpt_id ?? '').trim() || undefined,
      dataset_members: normalizeDatasetMembers(r.dataset_members),
    }))
}

export interface Iec61850ReportsValidationResult {
  errors: string[]
  warnings: string[]
}

export function validateIec61850Reports(
  reports: Iec61850ReportConfig[] | undefined,
  mappingAddresses?: string[],
): Iec61850ReportsValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitized = sanitizeIec61850Reports(reports)

  sanitized.forEach((report, index) => {
    const label = `Report ${index + 1}`
    const rcbErr = validateIec61850RcbRef(report.rcb_ref)
    if (rcbErr) errors.push(`${label}: RCB Reference ${rcbErr}`)

    report.dataset_members.forEach((member, mi) => {
      const mErr = validateIec61850DatasetMember(member)
      if (mErr) errors.push(`${label}: Dataset member ${mi + 1} ${mErr}`)
    })
  })

  if (sanitized.length >= 2) {
    const seenRptIds = new Map<string, number>()
    sanitized.forEach((report, index) => {
      const rptId = String(report.rpt_id ?? '').trim()
      if (!rptId) {
        errors.push(`Report ${index + 1}: Report ID is required when multiple RCBs are configured`)
      } else if (seenRptIds.has(rptId)) {
        errors.push(`Report ${index + 1}: Report ID must be unique`)
      } else {
        seenRptIds.set(rptId, index)
      }
    })
  }

  if (mappingAddresses?.length && sanitized.length) {
    const allMembers = new Set(sanitized.flatMap((r) => r.dataset_members))
    const mapped = mappingAddresses.map((a) => String(a).trim()).filter(Boolean)
    const overlap = mapped.some((a) => allMembers.has(a))
    if (!overlap && allMembers.size > 0) {
      warnings.push(
        'Dataset members do not match any configured point MMS Address (mapping may not be set yet)',
      )
    }
  }

  return { errors, warnings }
}

export const IEC61850_CTRL_MODEL_LABELS: Record<number, string> = {
  1: 'Direct (1)',
  2: 'SBO (2)',
}

export function getIec61850CtrlModelOptions(pointType: PointType): Array<{ label: string; value: number }> {
  if (pointType === 'A') {
    return [{ label: IEC61850_CTRL_MODEL_LABELS[1], value: 1 }]
  }
  if (pointType === 'C') {
    return [
      { label: IEC61850_CTRL_MODEL_LABELS[1], value: 1 },
      { label: IEC61850_CTRL_MODEL_LABELS[2], value: 2 },
    ]
  }
  return []
}

export function validateIec61850CtrlModel(value: unknown, pointType: PointType): string {
  if (pointType === 'T' || pointType === 'S') return ''
  if (value === undefined || value === null || value === '') return 'required'
  const model = Number(value)
  if (!Number.isInteger(model) || model < 1 || model > 4) return 'must be 1-4'
  if (pointType === 'C' && model > 2) return 'control ctrl_model must be 1 or 2'
  if (pointType === 'A' && model !== 1) return 'adjustment ctrl_model must be 1'
  return ''
}

export function normalizeBlankToNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

export function normalizeOptionalNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Address-less control models are editor defaults, not a saved mapping change. */
export function iec61850MappingFieldChanges(
  current: { address?: unknown; ctrl_model?: unknown } | null | undefined,
  original: { address?: unknown; ctrl_model?: unknown } | null | undefined,
): string[] {
  const changes: string[] = []
  const currentAddress = normalizeBlankToNull(current?.address)
  const originalAddress = normalizeBlankToNull(original?.address)
  if (currentAddress !== originalAddress) changes.push('mapping_iec61850_address')
  if (currentAddress !== null) {
    const currentModel = normalizeOptionalNumber(current?.ctrl_model)
    const originalModel = normalizeOptionalNumber(original?.ctrl_model)
    if (currentModel !== originalModel) changes.push('mapping_ctrl_model')
  }
  return changes
}

export function validateIec61850MappingAddressField(value: unknown): string {
  const err = validateIec61850MmsAddress(value)
  if (err === 'required') return 'required'
  if (err) return err
  return ''
}
