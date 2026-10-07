import { z } from 'zod'

export const createApplicationSchema = z.object({
  fullName: z.string().min(2, 'Ism kiritilishi kerak'),
  phone: z.string().min(7, 'Telefon raqami noto‘g‘ri'),
  carModel: z.string().min(1, 'Avtomobil modeli kiritilishi kerak'),
  plate: z.string().min(1, 'Davlat raqami kiritilishi kerak'),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'Jinsingizni tanlang' }),
})

export const setOnlineStatusSchema = z.object({
  online: z.boolean(),
})

export const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const updateDriverMeSchema = z.object({
  carModel: z.string().min(1).max(80).optional(),
  plate: z.string().min(1).max(20).optional(),
  licenseNumber: z.string().min(1).max(40).optional(),
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
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

export const driverIdParamSchema = z.object({
  id: z.string().min(1),
})

export const setApprovedSchema = z.object({
  approved: z.boolean(),
})

export const setDriverGenderSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE']).nullable(),
})

export const archiveDriverSchema = z.object({
  reason: z.string().max(300).optional(),
})
