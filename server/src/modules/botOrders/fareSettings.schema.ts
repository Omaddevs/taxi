import { z } from 'zod'
import { FARE_RATE_LIMITS } from './fare.js'

const L = FARE_RATE_LIMITS
const int = (limits: { min: number; max: number }, label: string) =>
  z
    .number({ invalid_type_error: `${label}: son kiriting` })
    .int(`${label}: butun son kiriting`)
    .min(limits.min, `${label}: kamida ${limits.min}`)
    .max(limits.max, `${label}: ko‘pi bilan ${limits.max}`)

const rates = {
  perKm: int(L.perKm, '1 km narxi'),
  minPerSeat: int(L.minPerSeat, 'Eng kam narx'),
  spreadPercent: int(L.spreadPercent, 'Narx oralig‘i'),
  wholeCarDiscountPercent: int(L.wholeCarDiscountPercent, 'Butun mashina chegirmasi'),
}

export const updateFareSettingsSchema = z
  .object(rates)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'O‘zgartirish kiritilmagan')

export const previewFareSchema = z.object({
  km: z.number().positive().max(5000),
  rates: z.object(rates),
})
