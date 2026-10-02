import { z } from 'zod'

const phoneSchema = z
  .string()
  .min(7, 'Telefon raqami noto‘g‘ri')
  .max(20, 'Telefon raqami noto‘g‘ri')

const otpProfileFields = {
  intent: z.enum(['login', 'register']).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
}

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  ...otpProfileFields,
})

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Kod 6 xonali bo‘lishi kerak'),
  ...otpProfileFields,
})

export const otpPollSchema = z.object({
  otpRequestId: z.string().min(1),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const logoutSchema = refreshSchema

export const telegramExchangeSchema = z.object({
  code: z.string().min(1, 'Kod talab qilinadi'),
})

export const adminLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6),
})
