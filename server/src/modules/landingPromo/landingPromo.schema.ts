import { z } from 'zod'

export const promoPeriodSchema = z.enum(['haftalik', 'oylik', 'doimiy'])

const prizeSchema = z.object({
  place: z.string().trim().min(1).max(60),
  reward: z.string().trim().min(1).max(80),
  tail: z.string().trim().max(120).optional(),
})

export const createLandingPromoSchema = z.object({
  period: promoPeriodSchema,
  prizes: z.array(prizeSchema).min(1).max(5),
  terms: z.string().trim().min(2).max(600),
  termsBold: z.string().trim().max(200).optional(),
  soon: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

export const updateLandingPromoSchema = createLandingPromoSchema.partial()

export const landingPromoIdParamSchema = z.object({
  id: z.string().min(1),
})
