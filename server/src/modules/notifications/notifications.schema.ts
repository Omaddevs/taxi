import { z } from 'zod'

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(1000),
  type: z.enum(['BOOKING', 'PROMO', 'SYSTEM', 'WALLET']).default('SYSTEM'),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).optional(),
})
