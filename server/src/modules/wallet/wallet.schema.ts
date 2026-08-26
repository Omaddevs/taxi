import { z } from 'zod'

export const topupSchema = z.object({
  amount: z.number().int().min(1000).max(50_000_000),
  methodId: z.string().min(1),
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
