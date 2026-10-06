import { z } from 'zod'

const name = z.string().trim().min(2, 'Kamida 2 ta harf').max(60)
const chatRef = z
  .string()
  .trim()
  .max(100)
  .regex(/^(@[A-Za-z0-9_]{4,}|-?\d{5,})$/, 'Kanal/guruh: @username yoki -100… ko‘rinishidagi ID')
  .or(z.literal(''))
const url = z.string().trim().url('To‘g‘ri havola kiriting').max(300).or(z.literal(''))

export const giveawayPrizeSchema = z.enum(['GOING', 'RETURN'])

export const createEntrySchema = z.object({
  firstName: name,
  lastName: name,
  phone: z.string().min(9).max(20),
})

export const entryTokenParamSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{12,40}$/),
})

export const botLinkSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{12,40}$/),
  telegramId: z.string().regex(/^\d+$/),
  telegramUsername: z.string().max(64).optional(),
})

export const botRecheckSchema = z.object({
  telegramId: z.string().regex(/^\d+$/),
})

export const updateSettingsSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  prizeText: z.string().trim().max(300).optional(),
  channelChatId: chatRef.optional(),
  channelUrl: url.optional(),
  groupChatId: chatRef.optional(),
  groupUrl: url.optional(),
  entriesOpen: z.boolean().optional(),
})

export const listEntriesQuerySchema = z.object({
  filter: z.enum(['all', 'eligible', 'not_subscribed', 'unlinked', 'winners']).default('all'),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
})

export const checkEntriesSchema = z.object({
  ids: z.array(z.string()).max(500).optional(),
})

export const drawSchema = z.object({
  count: z.number().int().min(1).max(50),
  prize: giveawayPrizeSchema,
  excludePastWinners: z.boolean().default(true),
})

export const idParamSchema = z.object({ id: z.string().min(1) })

export const updateWinnerSchema = z.object({ paid: z.boolean() })
