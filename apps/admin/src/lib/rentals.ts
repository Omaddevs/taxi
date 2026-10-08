import type { RentalOwnerType, RentalStatus, RentalVehicleType } from '../types'

// Same labels as the website's Skuter ijara market (apps/web/src/data/rentals.js).
export const VEHICLE_TYPES: { value: RentalVehicleType; label: string }[] = [
  { value: 'SCOOTER', label: 'Skuter' },
  { value: 'E_SCOOTER', label: 'Elektr samokat' },
  { value: 'BICYCLE', label: 'Velosiped' },
  { value: 'E_BIKE', label: 'Elektr velosiped' },
  { value: 'MOTORCYCLE', label: 'Mototsikl' },
]

export const VEHICLE_LABEL = Object.fromEntries(VEHICLE_TYPES.map((t) => [t.value, t.label])) as Record<RentalVehicleType, string>

export const OWNER_LABEL: Record<RentalOwnerType, string> = { COMPANY: 'Tashkilot', PERSON: 'Shaxsiy' }

export const STATUS_LABEL: Record<RentalStatus, string> = {
  PENDING: 'Moderatsiyada',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
}

export const STATUS_TONE: Record<RentalStatus, 'amber' | 'green' | 'red'> = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
}

/** "120000" / "120 000" / "" → number | null; NaN for garbage so the form can complain. */
export function parseMoney(text: string): number | null {
  const clean = text.replace(/\s/g, '')
  if (!clean) return null
  const n = Number(clean)
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN
}
