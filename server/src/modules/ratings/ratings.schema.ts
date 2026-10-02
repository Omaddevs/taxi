import { z } from 'zod'

export const listRatingsQuerySchema = z.object({
  direction: z.enum(['PASSENGER_RATES_DRIVER', 'DRIVER_RATES_PASSENGER']).optional(),
})
