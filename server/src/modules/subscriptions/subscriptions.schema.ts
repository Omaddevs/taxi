import { z } from 'zod'

export const planIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
})

export const driverIdParamSchema = z.object({
  driverId: z.string().min(1),
})

export const renewSubscriptionSchema = z.object({
  planId: z.string().min(1),
  amount: z.number().int().min(0).optional(),
  method: z.enum(['cash', 'transfer', 'other']).default('cash'),
  note: z.string().max(300).optional(),
})

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(300).optional(),
})
