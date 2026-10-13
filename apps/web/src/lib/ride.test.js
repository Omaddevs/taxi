import { describe, expect, it } from 'vitest'
import {
  buildOrderPayload,
  clampPrice,
  dayOptions,
  formatMoney,
  isSlotBookable,
  makePoint,
  pointFor,
  seatsComplete,
  seatsSummary,
  slotEnd,
  timeSlots,
} from './ride'

// Tuesday 13 October 2026, 13:04 local time.
const NOW = new Date(2026, 9, 13, 13, 4)

describe('day and time slots', () => {
  it('names the first three days and dates the rest', () => {
    const days = dayOptions(4, NOW)
    expect(days.map((d) => d.iso)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'])
    expect(days.map((d) => d.label)).toEqual(['Bugun', 'Ertaga', 'Indinga', 'Ju, 16 okt'])
  })

  it('keeps a slot bookable until it ends', () => {
    const slots = timeSlots('2026-10-13', NOW)
    expect(slots).toHaveLength(48)
    expect(slots.find((s) => s.time === '12:30').past).toBe(true)
    expect(slots.find((s) => s.time === '13:00').past).toBe(false)
    expect(slots.find((s) => s.time === '13:30').past).toBe(false)
    expect(timeSlots('2026-10-14', NOW).some((s) => s.past)).toBe(false)
  })

  it('rejects past, missing and off-grid times', () => {
    expect(isSlotBookable('2026-10-13', '13:30', NOW)).toBe(true)
    expect(isSlotBookable('2026-10-13', '09:00', NOW)).toBe(false)
    expect(isSlotBookable('2026-10-12', '23:30', NOW)).toBe(false)
    expect(isSlotBookable('2026-10-13', '13:04', NOW)).toBe(false)
    expect(isSlotBookable('2026-10-13', '', NOW)).toBe(false)
  })

  it('ends a slot half an hour later, across midnight too', () => {
    expect(slotEnd('13:30')).toBe('14:00')
    expect(slotEnd('23:30')).toBe('00:00')
  })
})

describe('money', () => {
  it('groups thousands with spaces', () => {
    expect(formatMoney(180000)).toBe('180 000')
    expect(formatMoney(5000)).toBe('5 000')
    expect(formatMoney(1250000)).toBe('1 250 000')
  })

  it('snaps a fare to the step and keeps it in range', () => {
    expect(clampPrice(182400)).toBe(180000)
    expect(clampPrice(0)).toBe(5000)
    expect(clampPrice(99_000_000)).toBe(10_000_000)
  })
})

describe('seats', () => {
  const man = { position: 'FRONT', gender: 'MALE' }
  const woman = { position: 'REAR_LEFT', gender: 'FEMALE' }

  it('needs one seat per passenger, none for a whole car', () => {
    expect(seatsComplete({ passengers: 2, wholeCar: false, seats: [man] })).toBe(false)
    expect(seatsComplete({ passengers: 2, wholeCar: false, seats: [man, woman] })).toBe(true)
    expect(seatsComplete({ passengers: 1, wholeCar: true, seats: [] })).toBe(true)
  })

  it('summarises who travels', () => {
    expect(seatsSummary([man])).toBe('1 erkak')
    expect(seatsSummary([man, woman])).toBe('1 erkak, 1 ayol')
    expect(seatsSummary([])).toBe('')
  })
})

describe('buildOrderPayload', () => {
  const search = {
    service: 'all',
    from: 'Toshkent viloyati, Universitet ko‘chasi, 2',
    fromRegion: 'Toshkent viloyati',
    fromPlace: 'Universitet ko‘chasi, 2',
    fromPoint: makePoint(41.36, 69.34, 'Toshkent viloyati, Universitet ko‘chasi, 2'),
    to: 'Andijon, Andijon',
    toRegion: 'Andijon',
    toPlace: 'Andijon',
    date: '2026-10-13',
    time: '13:30',
    passengers: 1,
    wholeCar: false,
    seats: [{ position: 'FRONT', gender: 'MALE' }],
    luggage: "O'rta",
    car: 'spark',
    landmark: ' darvoza oldi ',
    priceMode: 'offer',
    price: 180000,
  }

  it('sends the pin, the seats and the offered fare', () => {
    expect(buildOrderPayload(search, { routeKm: 362.44, to: { lat: 40.78, lng: 72.34 } })).toMatchObject({
      fromRegion: 'Toshkent viloyati',
      toDistrict: 'Andijon',
      passengers: 1,
      seats: [{ position: 'FRONT', gender: 'MALE' }],
      carBrand: 'Chevrolet Spark',
      pickupLat: 41.36,
      pickupLng: 69.34,
      pickupText: 'darvoza oldi',
      toLat: 40.78,
      routeKm: 362.4,
      price: 180000,
      paymentMethod: 'cash',
    })
  })

  it('drops a pin that belongs to another address', () => {
    const moved = { ...search, from: 'Toshkent shahri, Chilonzor' }
    expect(pointFor(moved.fromPoint, moved.from)).toBe(null)
    expect(buildOrderPayload(moved).pickupLat).toBeUndefined()
  })

  it('books four seats for a whole car and no price when negotiable', () => {
    const payload = buildOrderPayload({ ...search, wholeCar: true, seats: [], priceMode: 'negotiable', price: null })
    expect(payload).toMatchObject({ passengers: 4, wholeCar: true, price: null })
    expect(payload.seats).toBeUndefined()
  })

  it('marks a women-only request', () => {
    expect(buildOrderPayload({ ...search, service: 'women' })).toMatchObject({ womenOnly: true, gender: 'ayol' })
  })
})
