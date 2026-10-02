import { z } from 'zod'
import { optionalPassword, optionalTrimmed } from '../../lib/zod.js'

export const staffKindSchema = z.enum(['ADMIN', 'SALES', 'SUPPORT'])
export const kpiPeriodSchema = z.enum(['DAY', 'WEEK', 'MONTH'])
export const activityKindSchema = z.enum(['NEW_USER', 'NEW_DRIVER', 'BOOKING', 'REVENUE', 'CALL', 'NOTE'])

export const listStaffQuerySchema = z.object({
  kind: staffKindSchema.optional(),
  q: z.string().optional(),
})

export const createStaffSchema = z.object({
  phone: z.string().min(7).max(20),
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lsin').max(120),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo‘lsin').max(72),
  kind: z.enum(['SALES', 'SUPPORT', 'ADMIN']),
})

export const staffIdParamSchema = z.object({
  id: z.string().min(1),
})

export const staffSessionParamSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
})

export const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1),
})

export const setBusySchema = z.object({
  busy: z.boolean(),
})

export const updateStaffSchema = z.object({
  name: optionalTrimmed(2, 120, 'Ism kamida 2 ta belgidan iborat bo‘lsin'),
  kind: z.enum(['SALES', 'SUPPORT', 'ADMIN']).optional(),
  staffActive: z.boolean().optional(),
  password: optionalPassword(),
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20).optional(),
  ),
})

export const updateMeSchema = z.object({
  name: optionalTrimmed(2, 120, 'Ism kamida 2 ta belgidan iborat bo‘lsin'),
  password: optionalPassword(),
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(7, 'Telefon raqami noto‘g‘ri').max(20).optional(),
  ),
})

export const upsertKpiSchema = z.object({
  period: kpiPeriodSchema,
  newUsers: z.coerce.number().int().min(0).max(100000).optional(),
  newDrivers: z.coerce.number().int().min(0).max(100000).optional(),
  bookings: z.coerce.number().int().min(0).max(100000).optional(),
  revenue: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
  calls: z.coerce.number().int().min(0).max(100000).optional(),
})

export const salesDashboardQuerySchema = z.object({
  period: kpiPeriodSchema.optional(),
})

export const createActivitySchema = z.object({
  kind: activityKindSchema,
  title: z.string().trim().min(2).max(200),
  note: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
  refId: z.string().max(80).optional(),
})
