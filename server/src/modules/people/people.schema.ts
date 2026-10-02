import { z } from 'zod'
import { blankToUndefined, optionalPassword, optionalTrimmed } from '../../lib/zod.js'

export const listPeopleQuerySchema = z.object({
  q: z.string().optional(),
  kind: z.enum(['all', 'passenger', 'driver']).optional(),
  channel: z.enum(['WEBAPP', 'BOT', 'GROUP']).optional(),
})

export const personIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updatePersonSchema = z.object({
  name: optionalTrimmed(2, 120, 'Ism kamida 2 ta belgidan iborat bo‘lsin'),
  phone: z.preprocess(blankToUndefined, z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20).optional()),
  password: optionalPassword(),
  language: z.enum(['uz', 'ru', 'en']).optional(),
  notes: z.string().max(4000).optional(),
  verified: z.boolean().optional(),
  carModel: z.preprocess(blankToUndefined, z.string().trim().min(1).max(80).optional()),
  plate: z.preprocess(blankToUndefined, z.string().trim().min(1).max(20).optional()),
  licenseNumber: z.string().trim().max(40).nullable().optional(),
})
