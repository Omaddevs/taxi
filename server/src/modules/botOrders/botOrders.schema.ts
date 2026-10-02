import { z } from 'zod'

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const rateBotOrderSchema = z.object({
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(40)).max(6).optional(),
  comment: z.string().max(500).optional(),
})
