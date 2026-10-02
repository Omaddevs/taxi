import { describe, it, expect } from 'vitest'
import {
  cn,
  localPhoneDigitsUz,
  maskLocalPhoneUz,
  toE164Uz,
  formatPhoneUz,
  isCompletePhoneUz,
  formatSom,
  formatTime,
  initials,
  displayName,
  startOfToday,
  daysAgo,
} from './utils.js'

const NBSP = String.fromCharCode(160)

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})

describe('phone helpers', () => {
  it('localPhoneDigitsUz strips the country code and formatting', () => {
    expect(localPhoneDigitsUz('+998 (90) 123-45-67')).toBe('901234567')
  })

  it('maskLocalPhoneUz groups the local digits without a country code', () => {
    expect(maskLocalPhoneUz('901234567')).toBe('90 123 45 67')
  })

  it('toE164Uz always prefixes +998', () => {
    expect(toE164Uz('90 123 45 67')).toBe('+998901234567')
  })

  it('formatPhoneUz masks a complete number and passes through an incomplete one', () => {
    expect(formatPhoneUz('998901234567')).toBe('+998 90 123 45 67')
    expect(formatPhoneUz('123')).toBe('123')
    expect(formatPhoneUz(null)).toBe('—')
  })

  it('isCompletePhoneUz requires exactly 9 local digits', () => {
    expect(isCompletePhoneUz('90123')).toBe(false)
    expect(isCompletePhoneUz('901234567')).toBe(true)
  })
})

describe('formatSom', () => {
  it('formats an amount with the som suffix', () => {
    expect(formatSom(15000)).toBe(`15${NBSP}000 so'm`)
  })
})

describe('formatTime', () => {
  it('converts a UTC ISO timestamp to Asia/Tashkent HH:mm', () => {
    expect(formatTime('2026-03-05T10:30:00Z')).toBe('15:30')
  })

  it('returns an em dash for missing input', () => {
    expect(formatTime(null)).toBe('—')
  })
})

describe('initials', () => {
  it('takes the first letter of up to two words, uppercased', () => {
    expect(initials('Ism Familiya')).toBe('IF')
    expect(initials('yolgiz')).toBe('Y')
  })

  it('falls back when the name is empty', () => {
    expect(initials('', '?')).toBe('?')
    expect(initials(null)).toBe('?')
  })
})

describe('displayName', () => {
  it('prefers name, then phone, then an em dash', () => {
    expect(displayName({ name: 'Ali', phone: '+998901234567' })).toBe('Ali')
    expect(displayName({ phone: '+998901234567' })).toBe('+998901234567')
    expect(displayName(null)).toBe('—')
  })
})

describe('startOfToday / daysAgo', () => {
  it('startOfToday has zeroed time components', () => {
    const d = startOfToday()
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0])
  })

  it('daysAgo(n) is exactly n days before startOfToday', () => {
    const today = startOfToday()
    const threeDaysAgo = daysAgo(3)
    expect(today.getTime() - threeDaysAgo.getTime()).toBe(3 * 24 * 60 * 60 * 1000)
  })
})
