import { z } from 'zod'

export const validatePromoSchema = z.object({
  code: z.string().min(1),
  bookingId: z.string().optional(),
})

export const applyPromoSchema = z.object({
  code: z.string().min(1),
  bookingId: z.string().min(1),
})

export const createPromoSchema = z.object({
  code: z.string().min(3).max(30),
  title: z.string().min(1),
  discountType: z.enum(['FIXED', 'PERCENT']),
  discountValue: z.number().int().min(1),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
  maxUses: z.number().int().min(1).optional(),
})

export const updatePromoSchema = z.object({
  title: z.string().min(1).optional(),
  discountType: z.enum(['FIXED', 'PERCENT']).optional(),
  discountValue: z.number().int().min(1).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  maxUses: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
})

export const promoIdParamSchema = z.object({
  id: z.string().min(1),
})
