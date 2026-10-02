import { z } from 'zod'

export const topupSchema = z.object({
  amount: z.number().int().min(1000).max(50_000_000),
  methodId: z.string().min(1),
})

export const payoutSchema = z.object({
  amount: z.number().int().min(1000).max(50_000_000),
  cardId: z.string().min(1),
})

export const addCardSchema = z.object({
  providerToken: z.string().min(1),
  brand: z.string().min(1),
  last4: z.string().length(4),
})

export const cardIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listTransactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})

export const listAdminTransactionsQuerySchema = z.object({
  type: z.enum(['TOPUP', 'RIDE_PAYMENT', 'REFUND', 'PROMO_BONUS', 'PAYOUT']).optional(),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']).optional(),
  q: z.string().optional(),
})

export const adjustBalanceSchema = z.object({
  userId: z.string().min(1),
  amount: z
    .number()
    .int()
    .min(-50_000_000)
    .max(50_000_000)
    .refine((n) => n !== 0, { message: 'Summa 0 bo‘lishi mumkin emas' }),
  title: z.string().min(1).max(120),
})
