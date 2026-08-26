import { z } from 'zod'

export const chargeSchema = z.object({
  bookingId: z.string().min(1),
  methodId: z.string().min(1),
})
