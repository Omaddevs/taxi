import { z } from 'zod'

export const reportPeriodSchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional(),
})
