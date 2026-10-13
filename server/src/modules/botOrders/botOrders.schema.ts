import { z } from 'zod'
import { FARE } from './fare.js'

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const text = (max: number) => z.string().trim().max(max).optional()
const lat = z.number().min(-90).max(90)
const lng = z.number().min(-180).max(180)
const point = z.object({ lat, lng })

const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana noto‘g‘ri')
const time = z.string().trim().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Vaqt noto‘g‘ri')

// Who sits where, from the seat map. One entry per passenger.
const seatPick = z.object({
  position: z.enum(['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT']),
  gender: z.enum(['MALE', 'FEMALE']),
})
const seats = z
  .array(seatPick)
  .max(FARE.wholeCarSeats)
  .refine((list) => new Set(list.map((s) => s.position)).size === list.length, 'Bir xil o‘rindiq ikki marta tanlangan')

// The fare the passenger offers for the whole party; null = "Kelishiladi".
const price = z
  .number()
  .int()
  .min(FARE.minPrice, 'Narx juda past')
  .max(FARE.maxPrice, 'Narx juda yuqori')
  .nullable()

const paymentMethod = z.enum(['cash', 'click', 'payme', 'uzum', 'wallet'])

function seatsMatchParty(value: { seats?: unknown[]; passengers?: number; wholeCar?: boolean }, ctx: z.RefinementCtx) {
  if (value.wholeCar || !value.seats?.length || value.passengers == null) return
  if (value.seats.length !== Math.min(value.passengers, FARE.wholeCarSeats)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['seats'], message: 'Har bir yo‘lovchi uchun o‘rindiq tanlang' })
  }
}

// A passenger's "mashina qidiryapman" request from the website's ride screen.
export const createPassengerOrderSchema = z
  .object({
    fromRegion: z.string().trim().min(1, 'Qayerdan ketishni tanlang').max(80),
    fromDistrict: text(120),
    toRegion: z.string().trim().min(1, 'Qayerga borishni tanlang').max(80),
    toDistrict: text(120),
    date: date.optional(),
    time: time.optional(),
    passengers: z.number().int().min(1).max(8).default(1),
    // "Bo‘sh mashina": the whole car for this party.
    wholeCar: z.boolean().optional(),
    seat: text(20),
    seats: seats.optional(),
    luggage: text(20),
    gender: text(20),
    // "Ayollar uchun taxi": dispatched to (and claimable by) female drivers only.
    womenOnly: z.boolean().optional(),
    carBrand: text(60),
    // The pickup pin and the landmark ("Mo‘ljal") written for the driver.
    pickupLat: lat.optional(),
    pickupLng: lng.optional(),
    pickupText: text(200),
    toLat: lat.optional(),
    toLng: lng.optional(),
    routeKm: z.number().positive().max(5000).optional(),
    price: price.optional(),
    paymentMethod: paymentMethod.default('cash'),
    note: text(300),
  })
  .superRefine(seatsMatchParty)

// Edits to an order nobody has taken yet. `price: null` switches it to "Kelishiladi".
export const updatePassengerOrderSchema = z
  .object({
    date: date.optional(),
    time: time.optional(),
    passengers: z.number().int().min(1).max(8).optional(),
    wholeCar: z.boolean().optional(),
    seats: seats.optional(),
    luggage: text(20),
    carBrand: text(60),
    pickupText: text(200),
    price: price.optional(),
  })
  .superRefine(seatsMatchParty)
  .refine((value) => Object.values(value).some((v) => v !== undefined), 'O‘zgartirish kiritilmagan')
  .refine((value) => (value.date === undefined) === (value.time === undefined), 'Sana va vaqtni birga yuboring')

export const estimateFareSchema = z.object({
  from: point,
  to: point,
  routeKm: z.number().positive().max(5000).optional(),
  passengers: z.number().int().min(1).max(8).default(1),
  wholeCar: z.boolean().optional(),
})

export const rateBotOrderSchema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  comment: z.string().max(500).optional(),
})
