import { z } from 'zod'

export const createOfferSchema = z.object({
  serviceId: z.string().min(1),
  fromLabel: z.string().min(1),
  toLabel: z.string().min(1),
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  departAt: z.coerce.date(),
  arriveAt: z.coerce.date().optional(),
  seatsTotal: z.number().int().min(1).max(8),
  luggageCapacity: z.number().int().min(0).default(0),
  pricePerSeat: z.number().int().min(1000),
  genderPref: z.string().optional(),
})

export const updateOfferSchema = z.object({
  status: z.enum(['ACTIVE', 'CLOSED', 'CANCELLED']).optional(),
  pricePerSeat: z.number().int().min(1000).optional(),
  departAt: z.coerce.date().optional(),
})

export const offerIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listOffersAdminQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'FULL', 'CLOSED', 'CANCELLED']).optional(),
})

export const searchOffersQuerySchema = z.object({
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  date: z.string().optional(), // yyyy-mm-dd
  serviceId: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional(),
  gender: z.string().optional(),
})
