import { z } from 'zod'

export const updateMeSchema = z.object({
  name: z.string().trim().min(1, 'Ism kiritilishi shart').max(120).optional(),
  // An empty field clears it (the form always sends what's in the box).
  email: z.union([z.string().trim().email('Email noto‘g‘ri'), z.literal('')]).optional(),
  phone: z.string().trim().min(7, 'Telefon raqami noto‘g‘ri').max(20, 'Telefon raqami noto‘g‘ri').optional(),
  avatarUrl: z.string().url().optional(),
  language: z.enum(['uz', 'oz', 'ru', 'en']).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
})
