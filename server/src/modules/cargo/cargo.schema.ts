import { z } from 'zod'

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
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(5).max(20),
  note: z.string().max(500).optional(),
  price: z.number().int().min(1000),
})

export const cargoOrderIdParamSchema = z.object({
  id: z.string().min(1),
})

export const cancelCargoOrderSchema = z.object({
  reason: z.string().max(300).optional(),
})
