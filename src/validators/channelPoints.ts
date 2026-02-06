import type { PointInfo } from '@/types/channelConfiguration'

export interface PointValidationContext {
  channelProtocol: string
  points?: PointInfo[]
}

const isPositiveInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0
const isNonEmptyString = (s: unknown) => typeof s === 'string' && s.length > 0
const isBool = (v: unknown) => typeof v === 'boolean'

export function validatePointRow(point: PointInfo, ctx: PointValidationContext): boolean {
  if ((point as any).rowStatus === 'deleted') {
    ;(point as any).isInvalid = false
    return true
  }

  let valid = true
  if (!isPositiveInt(point.point_id)) {
    valid = false
  } else if (!isNonEmptyString(point.signal_name)) {
    valid = false
  } else if (!isBool(point.reverse)) {
    valid = false
  }

  if (valid && ctx.channelProtocol !== 'di_do') {
    const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
    if (!isNum(point.scale)) {
      valid = false
    } else if (!isNum(point.offset)) {
      valid = false
    }
  }

  ;(point as any).isInvalid = !valid
  return valid
}

export function validatePointField(
  item: any,
  field: string,
  ctx: PointValidationContext,
): string {
  switch (field) {
    case 'point_id': {
      const n = Number(item.point_id)
      if (!Number.isInteger(n) || n <= 0) return 'must positive integer'
      if (Number.isInteger(n) && n > 0 && Array.isArray(ctx.points)) {
        const duplicateCount = ctx.points.filter((p: any) => {
          return (
            p !== item &&
            (p as any).rowStatus !== 'deleted' &&
            Number(p.point_id) === n
          )
        }).length
        if (duplicateCount > 0) return 'duplicate point_id'
      }
      return ''
    }
    case 'signal_name': {
      const v = String(item.signal_name || '')
      if (!v) return 'required'
      return ''
    }
    case 'reverse': {
      const v = item.reverse
      if (!(v === true || v === false)) return 'required (true/false)'
      return ''
    }
    case 'scale': {
      const v = item.scale
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'must be a number'
      return ''
    }
    case 'offset': {
      const v = item.offset
      if (typeof v !== 'number' || !Number.isFinite(v)) return 'must be a number'
      return ''
    }
    case 'unit': {
      return ''
    }
    default:
      return ''
  }
}
