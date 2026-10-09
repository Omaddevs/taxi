import { z } from 'zod'
import { blankToUndefined, optionalPassword, optionalTrimmed } from '../../lib/zod.js'

export const listPeopleQuerySchema = z.object({
  q: z.string().optional(),
  kind: z.enum(['all', 'passenger', 'driver']).optional(),
  channel: z.enum(['WEBAPP', 'BOT', 'GROUP', 'GOOGLE']).optional(),
})

export const personIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updatePersonSchema = z.object({
  name: optionalTrimmed(2, 120, 'Ism kamida 2 ta belgidan iborat bo‘lsin'),
  phone: z.preprocess(blankToUndefined, z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20).optional()),
  email: z.preprocess((v) => (v === '' ? null : v), z.string().trim().email('Email noto‘g‘ri').max(160).nullable().optional()),
  password: optionalPassword(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  notes: z.string().max(4000).optional(),
  verified: z.boolean().optional(),
  carModel: z.preprocess(blankToUndefined, z.string().trim().min(1).max(80).optional()),
  plate: z.preprocess(blankToUndefined, z.string().trim().min(1).max(20).optional()),
  licenseNumber: z.string().trim().max(40).nullable().optional(),
})

export const createPersonSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lsin').max(120),
  phone: z.preprocess(blankToUndefined, z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20).optional()),
  email: z.preprocess(blankToUndefined, z.string().trim().email('Email noto‘g‘ri').max(160).optional()),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  notes: z.string().max(4000).optional(),
})

const emailContent = {
  subject: z.string().trim().min(2, 'Mavzuni yozing').max(160),
  message: z.string().trim().min(2, 'Xabar matnini yozing').max(10_000),
}

export const emailPersonSchema = z.object(emailContent)

export const emailBroadcastSchema = z
  .object({
    ...emailContent,
    audience: z.enum(['google', 'with_email', 'selected']),
    ids: z.array(z.string().min(1)).max(1000).optional(),
  })
  .refine((d) => d.audience !== 'selected' || (d.ids && d.ids.length > 0), { message: 'Kamida bitta foydalanuvchini tanlang' })

export const emailAudienceQuerySchema = z.object({
  audience: z.enum(['google', 'with_email']),
})
