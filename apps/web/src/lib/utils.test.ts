import { describe, it, expect } from 'vitest'
import {
  localPhoneDigitsUz,
  maskPhoneUz,
  maskLocalPhoneUz,
  toE164Uz,
  isCompletePhoneUz,
  formatPhoneUz,
  driverCode,
  inviteCode,
  cn,
  formatDateUz,
  formatDateShortUz,
} from './utils'

describe('localPhoneDigitsUz', () => {
  it('strips the 998 country code and non-digit characters', () => {
    expect(localPhoneDigitsUz('+998 (90) 123-45-67')).toBe('901234567')
  })

  it('leaves a bare local number untouched', () => {
    expect(localPhoneDigitsUz('901234567')).toBe('901234567')
  })

  it('drops digits beyond the 9-digit local length', () => {
    expect(localPhoneDigitsUz('998901234567999')).toBe('901234567')
  })
})

describe('maskPhoneUz / maskLocalPhoneUz', () => {
  it('masks progressively as digits are typed', () => {
    expect(maskPhoneUz('9')).toBe('+998 9')
    expect(maskPhoneUz('90')).toBe('+998 90')
    expect(maskPhoneUz('901234567')).toBe('+998 90 123 45 67')
  })

  it('drops the country code prefix for the local-only mask', () => {
    expect(maskLocalPhoneUz('901234567')).toBe('90 123 45 67')
  })
})

describe('toE164Uz', () => {
  it('produces a +998 E.164 number', () => {
    expect(toE164Uz('90 123 45 67')).toBe('+998901234567')
  })
})

describe('isCompletePhoneUz', () => {
  it('is true only once all 9 local digits are present', () => {
    expect(isCompletePhoneUz('90123')).toBe(false)
    expect(isCompletePhoneUz('901234567')).toBe(true)
  })
})

describe('formatPhoneUz', () => {
  it('masks a complete 12-digit number', () => {
    expect(formatPhoneUz('998901234567')).toBe('+998 90 123 45 67')
  })

  it('returns incomplete input unchanged', () => {
    expect(formatPhoneUz('9012')).toBe('9012')
  })

  it('returns an empty string for nullish input', () => {
    expect(formatPhoneUz(null)).toBe('')
  })
})

describe('driverCode', () => {
  it('derives a code from the last 6 alphanumeric characters of the id, uppercased', () => {
    expect(driverCode('clx1a2b3c4d5')).toBe('TLB3C4D5')
  })

  it('always starts with TL and is 8 characters long', () => {
    const code = driverCode('some-id-123456')
    expect(code.startsWith('TL')).toBe(true)
    expect(code).toHaveLength(8)
  })

  it('pads short ids with zeros', () => {
    expect(driverCode('a1')).toBe('TL0000A1')
  })
})

describe('inviteCode', () => {
  it('falls back to TAXILN when id is missing', () => {
    expect(inviteCode(undefined)).toBe('TAXILN')
  })

  it('pads short ids with X', () => {
    expect(inviteCode('a1')).toBe('XXXXA1')
  })
})

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})

describe('formatDateUz / formatDateShortUz', () => {
  it('formats an ISO date with the Uzbek month name', () => {
    expect(formatDateUz('2026-03-05')).toBe('5 Mart, 2026')
  })

  it('formats a short version with the abbreviated month', () => {
    expect(formatDateShortUz('2026-03-05')).toBe('5 Mar')
  })

  it('returns an empty string for falsy input', () => {
    expect(formatDateUz('')).toBe('')
  })
})
