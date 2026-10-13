import { describe, expect, it } from 'vitest'
import { DEFAULT_FARE_RATES, estimateFare, haversineKm, resolveRouteKm, tashkentDateTime } from './fare.js'

const TASHKENT = { lat: 41.2995, lng: 69.2401 }
const ANDIJON = { lat: 40.7821, lng: 72.3442 }

describe('estimateFare', () => {
  it('prices one seat from the road distance', () => {
    expect(estimateFare({ km: 362, passengers: 1 })).toEqual({
      km: 362,
      seats: 1,
      perSeat: { min: 155_000, mid: 180_000, max: 205_000 },
      total: { min: 155_000, mid: 180_000, max: 205_000 },
    })
  })

  it('multiplies by the party size, a whole car being four seats', () => {
    expect(estimateFare({ km: 362, passengers: 3 }).total.mid).toBe(540_000)
    expect(estimateFare({ km: 362, passengers: 1, wholeCar: true })).toMatchObject({ seats: 4, total: { mid: 720_000 } })
    expect(estimateFare({ km: 362, passengers: 6 }).seats).toBe(4)
  })

  it('keeps short trips at the minimum fare with a usable range', () => {
    expect(estimateFare({ km: 3, passengers: 1 }).perSeat).toEqual({ min: 5_000, mid: 10_000, max: 15_000 })
  })
})

describe('estimateFare with admin-set rates', () => {
  const rates = (patch: Partial<typeof DEFAULT_FARE_RATES>) => ({ ...DEFAULT_FARE_RATES, ...patch })

  it('follows the per-kilometre rate and the minimum', () => {
    expect(estimateFare({ km: 362, passengers: 1 }, rates({ perKm: 600 })).perSeat.mid).toBe(215_000)
    expect(estimateFare({ km: 10, passengers: 1 }, rates({ minPerSeat: 30_000 })).perSeat.mid).toBe(30_000)
  })

  it('widens, narrows or removes the range', () => {
    expect(estimateFare({ km: 362, passengers: 1 }, rates({ spreadPercent: 25 })).perSeat).toEqual({ min: 135_000, mid: 180_000, max: 225_000 })
    expect(estimateFare({ km: 362, passengers: 1 }, rates({ spreadPercent: 1 })).perSeat).toEqual({ min: 175_000, mid: 180_000, max: 185_000 })
    expect(estimateFare({ km: 362, passengers: 1 }, rates({ spreadPercent: 0 })).perSeat).toEqual({ min: 180_000, mid: 180_000, max: 180_000 })
  })

  it('discounts a whole car only', () => {
    const discounted = rates({ wholeCarDiscountPercent: 10 })
    expect(estimateFare({ km: 362, passengers: 1, wholeCar: true }, discounted).total).toEqual({ min: 560_000, mid: 650_000, max: 740_000 })
    expect(estimateFare({ km: 362, passengers: 3 }, discounted).total.mid).toBe(540_000)
  })
})

describe('resolveRouteKm', () => {
  const straight = haversineKm(TASHKENT, ANDIJON)

  it('trusts a believable routed distance', () => {
    expect(resolveRouteKm(TASHKENT, ANDIJON, 362)).toBe(362)
  })

  it('falls back to the stretched straight line otherwise', () => {
    expect(resolveRouteKm(TASHKENT, ANDIJON)).toBeCloseTo(straight * 1.25)
    expect(resolveRouteKm(TASHKENT, ANDIJON, 12)).toBeCloseTo(straight * 1.25)
    expect(resolveRouteKm(TASHKENT, ANDIJON, 4000)).toBeCloseTo(straight * 1.25)
  })
})

describe('tashkentDateTime', () => {
  it('reads the time as UTC+5', () => {
    expect(tashkentDateTime('2026-10-13', '13:30').toISOString()).toBe('2026-10-13T08:30:00.000Z')
    expect(tashkentDateTime('2026-10-13', '1:05').toISOString()).toBe('2026-10-12T20:05:00.000Z')
  })
})
