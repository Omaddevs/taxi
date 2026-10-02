import { z } from 'zod'

export const updateMeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
})
