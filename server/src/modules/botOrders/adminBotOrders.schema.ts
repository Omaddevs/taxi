import { z } from 'zod'

export const adminOrderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const listAdminOrdersQuerySchema = z.object({
  status: z.enum(['OPEN', 'CLAIMED', 'COMPLETED', 'CLOSED', 'CANCELLED']).optional(),
  q: z.string().optional(),
  // "Ayol yo'lovchilar": women-only orders plus any order with a female passenger.
  women: z.enum(['1', 'true']).optional(),
})

export const adminUpdateOrderSchema = z.object({
  passengerName: z.string().min(1).optional(),
  passengerPhone: z.string().min(5).optional(),
  fromRegion: z.string().min(1).optional(),
  fromDistrict: z.string().min(1).optional(),
  toRegion: z.string().min(1).optional(),
  toDistrict: z.string().min(1).optional(),
  carBrand: z.string().min(1).optional(),
  seat: z.string().min(1).optional(),
  passengers: z.number().int().min(1).optional(),
  luggageSize: z.string().min(1).optional(),
  whenText: z.string().min(1).optional(),
  pickupLat: z.number().nullable().optional(),
  pickupLng: z.number().nullable().optional(),
  pickupText: z.string().nullable().optional(),
})

export const adminSetOrderStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']),
})
