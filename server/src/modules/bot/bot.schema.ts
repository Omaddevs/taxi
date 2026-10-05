import { z } from 'zod'

const phoneSchema = z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20, 'Telefon raqami noto‘g‘ri')

export const resolveUserSchema = z.object({
  phone: phoneSchema,
})

export const linkUserSchema = z.object({
  phone: phoneSchema,
  telegramId: z.string().min(1),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['PASSENGER', 'DRIVER']).optional(),
  source: z.enum(['BOT', 'GROUP', 'WEBAPP']).optional(),
  telegramUsername: z.string().max(64).optional(),
})

export const syncDriverSchema = z.object({
  phone: phoneSchema,
  telegramId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  carModel: z.string().min(1).max(80),
  plate: z.string().min(1).max(20),
  approved: z.boolean(),
  // The bot's own application status. Omitted by older callers: then derived from `approved`.
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  // True only when the driver has just submitted (or re-submitted) the application in the bot.
  newApplication: z.boolean().optional(),
  rejectionReason: z.string().max(500).optional(),
})

export const telegramLoginTokenSchema = z.object({
  telegramId: z.string().min(1),
})

export const touchChannelSchema = z.object({
  telegramId: z.string().min(1),
  source: z.enum(['BOT', 'GROUP', 'WEBAPP']),
})

export const otpConfirmSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Kod 6 xonali bo‘lishi kerak'),
})

export const otpConfirmByIdSchema = z.object({
  otpRequestId: z.string().min(1),
  telegramId: z.string().min(1),
  telegramUsername: z.string().max(64).optional(),
})

export const rateViaBotSchema = z.object({
  raterTelegramId: z.string().min(1),
  rateeTelegramId: z.string().min(1),
  tripRef: z.string().min(1),
  direction: z.enum(['PASSENGER_RATES_DRIVER', 'DRIVER_RATES_PASSENGER']),
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  comment: z.string().max(500).optional(),
})
