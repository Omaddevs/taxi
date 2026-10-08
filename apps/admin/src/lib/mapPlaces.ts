import type { MapPlaceCategory } from '../types'

// Same labels/colours as the website's Smart xarita (apps/web/src/data/mapPlaceCategories.js).
export const PLACE_CATEGORIES: { value: MapPlaceCategory; label: string; color: string }[] = [
  { value: 'FUEL', label: 'Yoqilg‘i', color: '#f97316' },
  { value: 'SERVICE', label: 'Avtoservis', color: '#16a34a' },
  { value: 'WASH', label: 'Moyka', color: '#0ea5e9' },
  { value: 'PARKING', label: 'Parking', color: '#14b8a6' },
  { value: 'EV', label: 'EV zaryad', color: '#7c3aed' },
  { value: 'FOOD', label: 'Oshxona', color: '#e11d48' },
  { value: 'HELP', label: 'Yordam', color: '#64748b' },
  { value: 'SCOOTER', label: 'Skuter ijara', color: '#00b5c2' },
  { value: 'OTHER', label: 'Boshqa', color: '#2563eb' },
]

export const CATEGORY_LABEL = Object.fromEntries(PLACE_CATEGORIES.map((c) => [c.value, c.label])) as Record<
  MapPlaceCategory,
  string
>
export const CATEGORY_COLOR = Object.fromEntries(PLACE_CATEGORIES.map((c) => [c.value, c.color])) as Record<
  MapPlaceCategory,
  string
>

// Toshkent markazi — the picker opens here when a new place has no coordinates yet.
export const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797]

function valid(lat: number, lng: number): [number, number] | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

/**
 * Pulls coordinates out of whatever the admin pastes: "41.31, 69.27", a Google Maps link
 * (…/@41.31,69.27,17z, ?q=41.31,69.27, !3d41.31!4d69.27) or a Yandex link (?ll=69.27,41.31 /
 * ?pt=69.27,41.31 — Yandex puts longitude first). Returns null if nothing usable is found.
 */
export function parseCoordinates(input: string): [number, number] | null {
  const text = decodeURIComponent(input.trim())
  if (!text) return null

  const yandex = text.match(/[?&](?:ll|pt|whatshere%5Bpoint%5D|whatshere\[point\])=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (yandex && /yandex/i.test(text)) return valid(Number(yandex[2]), Number(yandex[1]))

  const google3d = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (google3d) return valid(Number(google3d[1]), Number(google3d[2]))

  const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) return valid(Number(at[1]), Number(at[2]))

  const query = text.match(/[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (query) return valid(Number(query[1]), Number(query[2]))

  const plain = text.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (plain) return valid(Number(plain[1]), Number(plain[2]))

  return null
}
