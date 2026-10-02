import { z } from 'zod'

export const ticketCategorySchema = z.enum(['TECHNICAL', 'PAYMENT', 'BOOKING', 'ACCOUNT', 'OTHER'])

export const listCannedQuerySchema = z.object({
  category: ticketCategorySchema.optional(),
})

export const createCannedSchema = z.object({
  category: ticketCategorySchema.optional(),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(4000),
})

export const cannedIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updateCannedSchema = z.object({
  category: ticketCategorySchema.nullable().optional(),
  title: z.string().trim().min(2).max(160).optional(),
  body: z.string().trim().min(2).max(4000).optional(),
})
