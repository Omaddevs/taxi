import { describe, expect, it } from 'vitest'
import { conversionRate, followUpState, phoneDigits, presetFollowUp, relativeAge, withLostReason } from './leads'

const NOW = new Date(2026, 9, 8, 14, 30) // 8-oktabr, 14:30 local

describe('followUpState', () => {
  it('classifies reminders around now', () => {
    expect(followUpState(null, NOW)).toBeNull()
    expect(followUpState(new Date(2026, 9, 8, 9, 0).toISOString(), NOW)).toBe('overdue')
    expect(followUpState(new Date(2026, 9, 8, 18, 0).toISOString(), NOW)).toBe('today')
    expect(followUpState(new Date(2026, 9, 9, 9, 0).toISOString(), NOW)).toBe('later')
  })
})

describe('presetFollowUp', () => {
  it('adds an hour, or lands day presets at 10:00', () => {
    expect(presetFollowUp('hour', NOW)).toEqual(new Date(2026, 9, 8, 15, 30))
    expect(presetFollowUp('tomorrow', NOW)).toEqual(new Date(2026, 9, 9, 10, 0))
    expect(presetFollowUp('threeDays', NOW)).toEqual(new Date(2026, 9, 11, 10, 0))
    expect(presetFollowUp('week', NOW)).toEqual(new Date(2026, 9, 15, 10, 0))
  })
})

describe('relativeAge', () => {
  it('reads minutes, hours and days', () => {
    expect(relativeAge(new Date(2026, 9, 8, 14, 30).toISOString(), NOW)).toBe('hozir')
    expect(relativeAge(new Date(2026, 9, 8, 14, 18).toISOString(), NOW)).toBe('12 daq')
    expect(relativeAge(new Date(2026, 9, 8, 11, 0).toISOString(), NOW)).toBe('3 soat')
    expect(relativeAge(new Date(2026, 9, 6, 14, 0).toISOString(), NOW)).toBe('2 kun')
  })
})

describe('conversionRate', () => {
  it('is the converted share, rounded', () => {
    expect(conversionRate([])).toBe(0)
    expect(conversionRate([{ status: 'CONVERTED' }, { status: 'NEW' }, { status: 'LOST' }])).toBe(33)
  })
})

describe('withLostReason', () => {
  it('puts the reason on top of an existing note', () => {
    expect(withLostReason(null, 'Narx qimmat')).toBe('Yo‘qotish sababi: Narx qimmat')
    expect(withLostReason('Andijon', 'Javob bermadi')).toBe('Yo‘qotish sababi: Javob bermadi\nAndijon')
  })
})

describe('phoneDigits', () => {
  it('strips formatting', () => {
    expect(phoneDigits('+998 90 123-45-67')).toBe('998901234567')
    expect(phoneDigits(null)).toBe('')
  })
})
