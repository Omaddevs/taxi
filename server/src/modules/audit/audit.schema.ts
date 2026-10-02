import { z } from 'zod'

export const listAuditQuerySchema = z.object({
  q: z.string().optional(),
  action: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
})
