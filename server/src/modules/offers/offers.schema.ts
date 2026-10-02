import { z } from 'zod'

export const seatPositionSchema = z.enum(['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT'])
export const genderSchema = z.enum(['MALE', 'FEMALE'])

export const createOfferSchema = z.object({
  serviceId: z.string().min(1),
  fromLabel: z.string().min(1),
  toLabel: z.string().min(1),
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  // Not persisted on RideOffer — forwarded only to the Telegram group-notify call so the bot
  // can pick the right regional/route driver group (bot Group.region uses its own dataset,
  // which this doesn't need to match exactly since the bot does a fuzzy lookup with a catch-all).
  fromRegion: z.string().optional(),
  toRegion: z.string().optional(),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  departAt: z.coerce.date(),
  arriveAt: z.coerce.date().optional(),
  luggageCapacity: z.number().int().min(0).default(0),
  pricePerSeat: z.number().int().min(1000),
  genderPref: z.string().optional(),
  notes: z.string().max(500).optional(),
  contactPhones: z.array(z.string().min(5).max(20)).max(3).default([]),
  // The car layout is always the 4 fixed positions — a driver only needs to flag which of
  // them are already occupied (e.g. picked up outside the app) before publishing.
  preOccupiedSeats: z
    .array(z.object({ position: seatPositionSchema, gender: genderSchema }))
    .max(4)
    .default([]),
})

export const updateOfferSchema = z.object({
  status: z.enum(['ACTIVE', 'CLOSED', 'CANCELLED']).optional(),
  pricePerSeat: z.number().int().min(1000).optional(),
  departAt: z.coerce.date().optional(),
})

export const adminUpdateOfferSchema = z.object({
  fromLabel: z.string().min(1).optional(),
  toLabel: z.string().min(1).optional(),
  fromAddress: z.string().min(1).optional(),
  toAddress: z.string().min(1).optional(),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  departAt: z.coerce.date().optional(),
  arriveAt: z.coerce.date().optional(),
  luggageCapacity: z.number().int().min(0).optional(),
  pricePerSeat: z.number().int().min(1000).optional(),
  genderPref: z.string().optional(),
  notes: z.string().max(500).optional(),
  contactPhones: z.array(z.string().min(5).max(20)).max(3).optional(),
})

export const adminSetOfferStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'CLOSED']),
})

export const offerIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listOffersAdminQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'FULL', 'CLOSED', 'CANCELLED']).optional(),
  q: z.string().optional(),
})

export const searchOffersQuerySchema = z.object({
  fromLabel: z.string().optional(),
  toLabel: z.string().optional(),
  date: z.string().optional(), // yyyy-mm-dd
  serviceId: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional(),
  gender: z.string().optional(),
})
