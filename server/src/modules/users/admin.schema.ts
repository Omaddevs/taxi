import { z } from 'zod'

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']).optional(),
})

export const userIdParamSchema = z.object({
  id: z.string().min(1),
})

export const setVerifiedSchema = z.object({
  verified: z.boolean(),
})
