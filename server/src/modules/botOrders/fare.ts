// Fare guidance for a passenger's ride request ("Yo‘l haqqi" sheet): a suggested range per seat
// from the road distance. The passenger still names their own price or leaves it "Kelishiladi" —
// this only tells them what drivers usually agree to.

export interface LatLng {
  lat: number
  lng: number
}

/** The part of the formula an admin tunes (admin panel → "Yo‘l haqi tariflari"; FareSettings row). */
export interface FareRates {
  /** so‘m per seat per road kilometre */
  perKm: number
  /** the least one seat is ever suggested for */
  minPerSeat: number
  /** how far "Tejamkor" / "Tez topiladi" sit from the middle price, in percent */
  spreadPercent: number
  /** taken off the four-seat total when the passenger books the whole car, in percent */
  wholeCarDiscountPercent: number
}

export const DEFAULT_FARE_RATES: FareRates = {
  perKm: 500,
  minPerSeat: 10_000,
  spreadPercent: 14,
  wholeCarDiscountPercent: 0,
}

// What an admin may set — one source for the API's validation and the admin form's hints.
export const FARE_RATE_LIMITS = {
  perKm: { min: 50, max: 10_000 },
  minPerSeat: { min: 1_000, max: 500_000 },
  spreadPercent: { min: 0, max: 50 },
  wholeCarDiscountPercent: { min: 0, max: 50 },
} as const satisfies Record<keyof FareRates, { min: number; max: number }>

// Fixed by the product, not tunable: fares move in 5 000 so‘m steps (the sheet's − / + buttons),
// a car has four passenger seats, and an offered fare must stay within sane bounds.
export const FARE = {
  step: 5_000,
  wholeCarSeats: 4,
  /** straight line → road, when the client could not get a real route */
  roadFactor: 1.25,
  minPrice: 5_000,
  maxPrice: 10_000_000,
} as const

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/**
 * Road distance to price from. The client's routed distance is used only while it is believable
 * for these two points (a road is never shorter than the straight line, and rarely 2.5× longer);
 * otherwise we fall back to the straight line stretched by `roadFactor`.
 */
export function resolveRouteKm(from: LatLng, to: LatLng, routeKm?: number | null) {
  const straight = haversineKm(from, to)
  if (routeKm != null && routeKm >= straight * 0.98 && routeKm <= Math.max(straight * 2.5, straight + 5)) return routeKm
  return straight * FARE.roadFactor
}

const toStep = (value: number) => Math.round(value / FARE.step) * FARE.step

export interface FareRange {
  min: number
  mid: number
  max: number
}

export interface FareEstimate {
  km: number
  seats: number
  perSeat: FareRange
  total: FareRange
}

export function seatsFor(passengers: number, wholeCar?: boolean) {
  return wholeCar ? FARE.wholeCarSeats : Math.max(1, Math.min(passengers, FARE.wholeCarSeats))
}

export function estimateFare(
  input: { km: number; passengers: number; wholeCar?: boolean },
  rates: FareRates = DEFAULT_FARE_RATES,
): FareEstimate {
  const seats = seatsFor(input.passengers, input.wholeCar)
  const mid = Math.max(FARE.step, toStep(Math.max(rates.minPerSeat, input.km * rates.perKm)))
  // With a spread the three suggestions must differ by at least one step; with none they coincide.
  const delta = rates.spreadPercent > 0 ? Math.max(FARE.step, toStep((mid * rates.spreadPercent) / 100)) : 0
  const perSeat = { min: Math.max(FARE.step, mid - delta), mid, max: mid + delta }
  const share = input.wholeCar ? 1 - rates.wholeCarDiscountPercent / 100 : 1
  const total = (seat: number) => Math.max(FARE.step, toStep(seat * seats * share))
  return {
    km: Math.round(input.km),
    seats,
    perSeat,
    total: { min: total(perSeat.min), mid: total(perSeat.mid), max: total(perSeat.max) },
  }
}

/** "2026-10-13" + "13:30" in Tashkent (UTC+5, no DST) → the instant. */
export function tashkentDateTime(date: string, time: string) {
  const [h, m] = time.split(':')
  return new Date(`${date}T${h.padStart(2, '0')}:${m}:00+05:00`)
}
