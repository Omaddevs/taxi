import { z } from 'zod'

export const createServiceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().min(1),
  basePrice: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
})

export const updateServiceSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().min(1).optional(),
  basePrice: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const serviceIdParamSchema = z.object({
  id: z.string().min(1),
})
