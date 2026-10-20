import { describe, expect, it } from 'vitest'
import {
  iec61850MappingFieldChanges,
  sanitizeIec61850Reports,
  validateIec61850CtrlModel,
  validateIec61850HostPort,
  validateIec61850MmsAddress,
  validateIec61850Reports,
} from '@/validators/iec61850'

describe('validateIec61850HostPort', () => {
  it('accepts valid host:port', () => {
    expect(validateIec61850HostPort('192.168.1.10:102')).toBe('')
  })

  it('rejects missing port', () => {
    expect(validateIec61850HostPort('192.168.1.10')).not.toBe('')
  })

  it('rejects invalid port', () => {
    expect(validateIec61850HostPort('192.168.1.10:0')).not.toBe('')
    expect(validateIec61850HostPort('192.168.1.10:70000')).not.toBe('')
  })
})

describe('validateIec61850MmsAddress', () => {
  it('accepts slash and colon forms', () => {
    expect(validateIec61850MmsAddress('simpleIOGenericIO/GGIO1$MX$AnIn1$mag$f')).toBe('')
    expect(validateIec61850MmsAddress('domain:item$path')).toBe('')
  })

  it('rejects empty and malformed', () => {
    expect(validateIec61850MmsAddress('')).toBe('required')
    expect(validateIec61850MmsAddress('nodomain')).not.toBe('')
  })
})

describe('validateIec61850CtrlModel', () => {
  it('allows C 1-2 and A 1 only', () => {
    expect(validateIec61850CtrlModel(1, 'C')).toBe('')
    expect(validateIec61850CtrlModel(2, 'C')).toBe('')
    expect(validateIec61850CtrlModel(3, 'C')).not.toBe('')
    expect(validateIec61850CtrlModel(1, 'A')).toBe('')
    expect(validateIec61850CtrlModel(2, 'A')).not.toBe('')
  })

  it('ignores T/S', () => {
    expect(validateIec61850CtrlModel(undefined, 'T')).toBe('')
  })
})

describe('validateIec61850Reports', () => {
  it('requires rpt_id when multiple RCBs', () => {
    const result = validateIec61850Reports([
      { rcb_ref: 'ied/LLN0$BR$RCB1', dataset_members: [] },
      { rcb_ref: 'ied/LLN0$BR$RCB2', dataset_members: [] },
    ])
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('sanitizes empty rows', () => {
    const sanitized = sanitizeIec61850Reports([
      { rcb_ref: '', rpt_id: '', dataset_members: [] },
      { rcb_ref: 'ied/LLN0$BR$RCB1', dataset_members: ['a/b'] },
    ])
    expect(sanitized).toHaveLength(1)
    expect(sanitized[0].rcb_ref).toBe('ied/LLN0$BR$RCB1')
  })
})

describe('iec61850MappingFieldChanges', () => {
  it('ignores a control model when the address is still empty', () => {
    expect(iec61850MappingFieldChanges({ address: undefined, ctrl_model: 1 }, null)).toEqual([])
  })

  it('records address and control model together once an address exists', () => {
    expect(
      iec61850MappingFieldChanges(
        { address: 'domain/item', ctrl_model: 1 },
        { address: undefined, ctrl_model: undefined },
      ),
    ).toEqual(['mapping_iec61850_address', 'mapping_ctrl_model'])
  })
})
