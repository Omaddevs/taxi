import { z } from 'zod'

const phone = z.string().trim().regex(/^\+998\d{9}$/, 'Telefon +998XXXXXXXXX ko‘rinishida bo‘lsin')

export const GROUP_AD_FEATURES = ['CARGO', 'AIRCON', 'LUGGAGE', 'WIFI', 'WOMEN'] as const

// taxiline-bot → POST /bot/group-driver-ads: a driver's ad it just reposted in a group, with what
// ad_format.parse_ad recognised. Everything but the source and text is a best guess.
export const ingestGroupAdSchema = z.object({
  chatId: z.string().min(1).max(32),
  chatTitle: z.string().max(200).optional(),
  chatUsername: z.string().max(64).optional(),
  messageId: z.string().max(32).optional(),
  authorTelegramId: z.string().regex(/^\d{1,20}$/),
  authorName: z.string().trim().min(1).max(200),
  authorUsername: z.string().max(64).optional(),
  // A group admin posting as the group itself: the author name is the group's, not a driver's.
  anonymous: z.boolean().optional(),
  text: z.string().trim().min(1).max(4096),
  origins: z.array(z.string().max(60)).max(10).default([]),
  destinations: z.array(z.string().max(60)).max(10).default([]),
  phones: z.array(phone).max(5).default([]),
  departure: z.string().max(80).optional(),
  seats: z.number().int().min(1).max(8).optional(),
  car: z.string().max(60).optional(),
  features: z.array(z.enum(GROUP_AD_FEATURES)).max(GROUP_AD_FEATURES.length).default([]),
})

export const groupAdIdParamSchema = z.object({ id: z.string().min(1).max(40) })

export const listGroupAdsQuerySchema = z.object({
  status: z.enum(['PENDING', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'ALL']).default('PENDING'),
  q: z.string().trim().max(80).optional(),
})

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null))

// The admin's corrections. Every field is optional; null clears it.
export const updateGroupAdSchema = z.object({
  fromLabel: nullableText(80).optional(),
  toLabel: nullableText(80).optional(),
  departAt: z.coerce.date().nullable().optional(),
  departNote: nullableText(80).optional(),
  seats: z.number().int().min(1).max(8).nullable().optional(),
  pricePerSeat: z.number().int().min(1000).max(10_000_000).nullable().optional(),
  carModel: nullableText(60).optional(),
  driverName: nullableText(120).optional(),
  phones: z.array(phone).max(5).optional(),
  features: z.array(z.enum(GROUP_AD_FEATURES)).max(GROUP_AD_FEATURES.length).optional(),
  notes: nullableText(600).optional(),
})

export const rejectGroupAdSchema = z.object({ reason: z.string().trim().max(200).optional() })
