import { describe, expect, it } from 'vitest'
import { kpiPeriodStart, periodRange, reportPeriodLabel, startOfDay } from './period.js'

// Wednesday, 2026-10-07 15:30 local time
const now = new Date(2026, 9, 7, 15, 30)

describe('startOfDay', () => {
  it('drops the time of day without touching the input', () => {
    const input = new Date(now)
    expect(startOfDay(input)).toEqual(new Date(2026, 9, 7))
    expect(input).toEqual(now)
  })
})

describe('periodRange', () => {
  it('day starts at midnight today', () => {
    expect(periodRange('day', now)).toEqual({ from: new Date(2026, 9, 7), to: now })
  })

  it('week starts on Monday', () => {
    expect(periodRange('week', now).from).toEqual(new Date(2026, 9, 5))
  })

  it('week started on Sunday goes back to the previous Monday', () => {
    const sunday = new Date(2026, 9, 11, 10)
    expect(periodRange('week', sunday).from).toEqual(new Date(2026, 9, 5))
  })

  it('month starts on the 1st', () => {
    expect(periodRange('month', now).from).toEqual(new Date(2026, 9, 1))
  })
})

describe('kpiPeriodStart', () => {
  it('maps KPI periods to report periods', () => {
    expect(kpiPeriodStart('DAY', now)).toEqual(new Date(2026, 9, 7))
    expect(kpiPeriodStart('WEEK', now)).toEqual(new Date(2026, 9, 5))
    expect(kpiPeriodStart('MONTH', now)).toEqual(new Date(2026, 9, 1))
  })
})

describe('reportPeriodLabel', () => {
  it('returns the Uzbek label', () => {
    expect(reportPeriodLabel('day')).toBe('kunlik')
    expect(reportPeriodLabel('week')).toBe('haftalik')
    expect(reportPeriodLabel('month')).toBe('oylik')
  })
})
