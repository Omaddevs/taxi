import { z } from 'zod'

export const createBookingSchema = z.object({
  rideOfferId: z.string().min(1),
  seatsBooked: z.number().int().min(1).max(8).default(1),
  luggage: z.number().int().min(0).default(0),
})

export const bookingIdParamSchema = z.object({
  id: z.string().min(1),
})

export const cancelBookingSchema = z.object({
  reason: z.string().min(1).max(500),
})

export const listBookingsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
  role: z.enum(['rider', 'driver']).default('rider'),
})

export const listBookingsAdminQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED']).optional(),
})
