import { z } from 'zod'

export const createBookingSchema = z.object({
  rideOfferId: z.string().min(1),
  seats: z
    .array(z.object({ offerSeatId: z.string().min(1), gender: z.enum(['MALE', 'FEMALE']) }))
    .min(1)
    .max(4),
  luggage: z.number().int().min(0).default(0),
})

export const bookingIdParamSchema = z.object({
  id: z.string().min(1),
})

export const cancelBookingSchema = z.object({
  reason: z.string().min(1).max(500),
})

export const rateBookingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  comment: z.string().max(500).optional(),
})

export const listBookingsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  role: z.enum(['rider', 'driver']).default('rider'),
})

export const listBookingsAdminQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  q: z.string().optional(),
})
