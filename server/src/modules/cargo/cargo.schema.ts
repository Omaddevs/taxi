import { z } from 'zod'
import { normalizeUzPhone } from '../../lib/phoneUz.js'

export const cargoTypeSchema = z.enum(['parcel', 'shopping', 'docs', 'flowers', 'tech', 'clothes', 'food', 'other'])

export const cargoVehicleSchema = z.enum(['moto', 'car', 'van'])

export const createCargoOrderSchema = z.object({
  fromLabel: z.string().min(1),
  toLabel: z.string().min(1),
  fromRegion: z.string().optional(),
  toRegion: z.string().optional(),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  cargoType: cargoTypeSchema,
  vehicleType: cargoVehicleSchema.optional(),
  weightLabel: z.string().min(1),
  recipientName: z.string().trim().min(1).max(80),
  // Uzbek mobile only, stored as +998XXXXXXXXX.
  recipientPhone: z
    .string()
    .max(30)
    .transform((v, ctx) => {
      const phone = normalizeUzPhone(v)
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Telefon raqami noto‘g‘ri: +998 dan keyin 9 ta raqam bo‘lishi kerak' })
        return z.NEVER
      }
      return phone
    }),
  note: z.string().max(500).optional(),
  price: z.number().int().min(1000),
})

export const cargoOrderIdParamSchema = z.object({
  id: z.string().min(1),
})

export const cancelCargoOrderSchema = z.object({
  reason: z.string().max(300).optional(),
})

export const botCargoActionSchema = z.object({
  cargoOrderId: z.string().min(1),
  telegramId: z.string().min(1),
})
