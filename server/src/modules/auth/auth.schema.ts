import { z } from 'zod'

const phoneSchema = z
  .string()
  .min(7, 'Telefon raqami noto‘g‘ri')
  .max(20, 'Telefon raqami noto‘g‘ri')

export const otpRequestSchema = z.object({
  phone: phoneSchema,
})

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Kod 6 xonali bo‘lishi kerak'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const logoutSchema = refreshSchema

export const adminLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6),
})
