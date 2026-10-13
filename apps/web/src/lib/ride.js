import { t } from '../i18n'
import { CARS } from '../data/cars'
import { shortMonth } from './utils'

// Everything the "Taxi chaqirish" flow (ride screen, its sheets, the order page) agrees on:
// seat names, the day/time slot grid, money formatting and the request payload.

export const SEAT_POSITIONS = ['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT']

export const SEAT_LABEL = {
  FRONT: 'Old o‘rindiq',
  REAR_LEFT: 'Orqa chap',
  REAR_MIDDLE: 'Orqa o‘rta',
  REAR_RIGHT: 'Orqa o‘ng',
}

// "Bo‘sh mashina" — the whole car, i.e. every passenger seat.
export const WHOLE_CAR_SEATS = 4
export const PARTY_OPTIONS = [1, 2, 3]

export const PRICE_STEP = 5_000
export const MIN_PRICE = 5_000
export const MAX_PRICE = 10_000_000
export const SLOT_MINUTES = 30

export const LUGGAGE = [
  { id: 'Kichik', title: 'Kichik', desc: 'Qo‘l yuki, sumka' },
  { id: "O'rta", title: 'O‘rta', desc: '1–2 chamadon' },
  { id: 'Katta', title: 'Katta', desc: '3+ chamadon' },
]
// The bot stores luggage as S / M / L.
export const LUGGAGE_BY_CODE = { S: 'Kichik', M: "O'rta", L: 'Katta' }

// "Ayollar uchun Taxi" repaints the whole flow pink.
export const RIDE_ACCENTS = {
  brand: {
    hex: '#00c7d4',
    solid: 'bg-brand text-white',
    glow: 'shadow-[0_12px_28px_rgba(0,199,212,0.35)]',
    soft: 'bg-brand-soft',
    softText: 'text-brand-dark',
    text: 'text-brand',
    border: 'border-brand',
  },
  women: {
    hex: '#f5559a',
    solid: 'bg-[#f5559a] text-white',
    glow: 'shadow-[0_12px_28px_rgba(245,85,154,0.35)]',
    soft: 'bg-[#fde7f1]',
    softText: 'text-[#c2185b]',
    text: 'text-[#f5559a]',
    border: 'border-[#f5559a]',
  },
}

const pad = (n) => String(n).padStart(2, '0')
// Monday first, matching Date#getDay() shifted by one.
const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']
const DAY_NAMES = ['Bugun', 'Ertaga', 'Indinga']

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysFromToday(iso, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseDate(iso) - today) / 86_400_000)
}

/** "Bugun" / "Ertaga" / "Indinga" / "Ju, 16 okt". */
export function dayLabel(iso, now = new Date()) {
  const diff = daysFromToday(iso, now)
  if (diff >= 0 && diff < DAY_NAMES.length) return t(DAY_NAMES[diff])
  const d = parseDate(iso)
  return `${t(WEEKDAYS[(d.getDay() + 6) % 7])}, ${d.getDate()} ${shortMonth(d.getMonth(), { lower: true })}`
}

export function dayOptions(count = 7, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const iso = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))
    return { iso, label: dayLabel(iso, now) }
  })
}

export function slotEnd(time) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + SLOT_MINUTES) % (24 * 60)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** The day's half-hour departure slots. A slot stays bookable until it ends. */
export function timeSlots(iso, now = new Date()) {
  const diff = daysFromToday(iso, now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) => {
    const start = i * SLOT_MINUTES
    return {
      time: `${pad(Math.floor(start / 60))}:${pad(start % 60)}`,
      past: diff < 0 || (diff === 0 && start + SLOT_MINUTES <= nowMinutes),
    }
  })
}

export function isSlotBookable(iso, time, now = new Date()) {
  return Boolean(iso && time) && timeSlots(iso, now).some((slot) => slot.time === time && !slot.past)
}

/** "180 000" */
export function formatMoney(value) {
  return String(Math.round(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function clampPrice(value) {
  const stepped = Math.round(value / PRICE_STEP) * PRICE_STEP
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, stepped))
}

/** How many seats the party needs on the seat map; a whole car needs none picked. */
export function seatsRequired({ passengers, wholeCar }) {
  return wholeCar ? 0 : Math.min(Number(passengers) || 1, WHOLE_CAR_SEATS)
}

export function seatsComplete({ passengers, wholeCar, seats = [] }) {
  return wholeCar || seats.length === seatsRequired({ passengers, wholeCar })
}

export function partyLabel({ passengers, wholeCar }) {
  return wholeCar ? t('Bo‘sh mashina') : t('{0} kishi', Number(passengers) || 1)
}

/** "1 erkak" / "2 ayol" / "1 erkak, 1 ayol" */
export function seatsSummary(seats = []) {
  const men = seats.filter((s) => s.gender === 'MALE').length
  const women = seats.length - men
  return [men ? t('{0} erkak', men) : null, women ? t('{0} ayol', women) : null].filter(Boolean).join(', ')
}

export function seatNames(seats = []) {
  return seats.map((s) => t(SEAT_LABEL[s.position])).join(', ')
}

export function priceLabel(price) {
  return price == null ? t('Kelishiladi') : t('{0} so‘m', formatMoney(price))
}

/** "4 soat 33 daq" */
export function durationLabel(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return t('{0} daq', m)
  return m ? t('{0} soat {1} daq', h, m) : t('{0} soat', h)
}

/** Coordinates picked for `label` on a map or by GPS: { lat, lng, for: label }. */
export function makePoint(lat, lng, label) {
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, for: label } : null
}

/** The point, but only while it still belongs to `label`. */
export function pointFor(point, label) {
  return point && point.for === label ? { lat: point.lat, lng: point.lng } : null
}

/**
 * POST /bot-orders/mine body from the ride screen's state. The pickup pin is sent only when the
 * passenger really placed one — a geocoded region centre must never reach the driver as an
 * "exact location". `to` (any resolved destination point) is only drawn on the order's map.
 */
export function buildOrderPayload(search, { paymentMethod = 'cash', routeKm, to } = {}) {
  const womenOnly = search.service === 'women'
  const pickup = pointFor(search.fromPoint, search.from)
  return {
    fromRegion: search.fromRegion,
    fromDistrict: search.fromPlace || undefined,
    toRegion: search.toRegion,
    toDistrict: search.toPlace || undefined,
    date: search.date,
    time: search.time,
    passengers: search.wholeCar ? WHOLE_CAR_SEATS : Number(search.passengers) || 1,
    wholeCar: search.wholeCar || undefined,
    seats: search.seats?.length ? search.seats : undefined,
    luggage: search.luggage || undefined,
    womenOnly: womenOnly || undefined,
    gender: womenOnly ? 'ayol' : undefined,
    carBrand: CARS.find((c) => c.id === search.car)?.title,
    pickupLat: pickup?.lat,
    pickupLng: pickup?.lng,
    pickupText: search.landmark?.trim() || undefined,
    toLat: Number.isFinite(to?.lat) ? to.lat : undefined,
    toLng: Number.isFinite(to?.lng) ? to.lng : undefined,
    routeKm: routeKm ? Math.round(routeKm * 10) / 10 : undefined,
    price: search.priceMode === 'offer' ? search.price : null,
    paymentMethod,
  }
}
