import { z } from 'zod'

export const rideOfferIdParamSchema = z.object({
  rideOfferId: z.string().min(1),
})
