import { z } from 'zod'

export const leadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'])
export const leadTypeSchema = z.enum(['PASSENGER', 'DRIVER'])
export const leadChannelSchema = z.enum(['MANUAL', 'INSTAGRAM_DM', 'INSTAGRAM_LEAD_AD', 'WEBSITE'])

export const listLeadsQuerySchema = z.object({
  status: leadStatusSchema.optional(),
  leadType: leadTypeSchema.optional(),
  channel: leadChannelSchema.optional(),
  q: z.string().optional(),
  dueOnly: z.enum(['true', 'false']).optional(),
})

export const createLeadSchema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: z.string().min(7).max(20),
  source: z.string().trim().max(60).optional(),
  note: z.string().trim().max(2000).optional(),
  followUpAt: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  leadType: leadTypeSchema.optional(),
})

export const leadIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updateLeadSchema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  source: z.string().trim().max(60).optional(),
  note: z.string().trim().max(2000).optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  status: leadStatusSchema.optional(),
  leadType: leadTypeSchema.optional(),
})

export const sendLeadMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

// Landing sahifadagi ochiq "Haydovchi bo‘ling" formasi
export const websiteLeadSchema = z.object({
  name: z.string().trim().min(2, 'Ism familiyangizni kiriting').max(120),
  phone: z.string().min(9).max(20),
  city: z.string().trim().max(80).optional(),
  activity: z.enum(['driver', 'courier', 'passenger']).default('driver'),
})
