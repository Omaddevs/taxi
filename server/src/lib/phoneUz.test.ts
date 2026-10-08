import { describe, expect, it } from 'vitest'
import { normalizeUzPhone } from './phoneUz.js'

describe('normalizeUzPhone', () => {
  it('accepts the usual ways of writing an Uzbek mobile number', () => {
    expect(normalizeUzPhone('87 735 36 36')).toBe('+998877353636')
    expect(normalizeUzPhone('+998 87 735 36 36')).toBe('+998877353636')
    expect(normalizeUzPhone('998877353636')).toBe('+998877353636')
    expect(normalizeUzPhone('+998 (90) 123-45-67')).toBe('+998901234567')
  })

  it('rejects too short, too long and foreign numbers', () => {
    expect(normalizeUzPhone('87 735 36')).toBeNull()
    expect(normalizeUzPhone('+998 9988885558555')).toBeNull()
    expect(normalizeUzPhone('+7 912 345 67 89')).toBeNull()
    expect(normalizeUzPhone('')).toBeNull()
  })
})
