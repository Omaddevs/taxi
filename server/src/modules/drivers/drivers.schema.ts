import { z } from 'zod'

export const createApplicationSchema = z.object({
  fullName: z.string().min(2, 'Ism kiritilishi kerak'),
  phone: z.string().min(7, 'Telefon raqami noto‘g‘ri'),
  carModel: z.string().min(1, 'Avtomobil modeli kiritilishi kerak'),
  plate: z.string().min(1, 'Davlat raqami kiritilishi kerak'),
})

export const setOnlineStatusSchema = z.object({
  online: z.boolean(),
})

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const reviewApplicationSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().optional(),
  })
  .refine((data) => data.status !== 'REJECTED' || !!data.rejectionReason, {
    message: 'rejectionReason is required when rejecting an application',
    path: ['rejectionReason'],
  })

export const applicationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listApplicationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export const listDriversQuerySchema = z.object({
  online: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  approved: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})
