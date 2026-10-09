import { z } from 'zod'

export const listGroupsQuerySchema = z.object({
  kind: z.enum(['CLOSED', 'ROUTE', 'CHANNEL', 'MAIN']).optional(),
})

export const groupIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const topicSchema = z.object({
  fromRegion: z.string().min(1),
  toRegion: z.string().min(1),
  ref: z.string().min(1).optional(),
  threadId: z.number().int().optional(),
  label: z.string().optional(),
})

const groupSettingsSchema = z.record(z.string(), z.boolean())

export const createGroupSchema = z
  .object({
    kind: z.enum(['CLOSED', 'ROUTE', 'CHANNEL', 'MAIN']),
    settings: groupSettingsSchema.optional(),
    linkedGroupId: z.number().int().positive().nullable().optional(),
    ref: z.string().min(1),
    title: z.string().min(1).optional(),
    fromRegion: z.string().min(1).optional(),
    toRegion: z.string().min(1).optional(),
    includeReverse: z.boolean().optional(),
    topics: z.array(topicSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'CHANNEL' && !data.title) {
      ctx.addIssue({ code: 'custom', message: 'Kanalga nom qo‘ying', path: ['title'] })
    }
    if (data.kind === 'CLOSED' && (!data.fromRegion || !data.toRegion)) {
      ctx.addIssue({ code: 'custom', message: 'Qayerdan va qayerga viloyatni tanlang', path: ['fromRegion'] })
    }
  })

export const updateGroupSchema = z.object({
  kind: z.enum(['CLOSED', 'ROUTE', 'CHANNEL', 'MAIN']).optional(),
  settings: groupSettingsSchema.optional(),
  linkedGroupId: z.number().int().positive().nullable().optional(),
  ref: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  fromRegion: z.string().min(1).optional(),
  toRegion: z.string().min(1).optional(),
  includeReverse: z.boolean().optional(),
  topics: z.array(topicSchema).optional(),
})

export const updateBotSettingsSchema = z.object({
  values: z.record(z.string(), z.union([z.string().max(2000), z.number(), z.boolean()])),
})

export const listGroupAdsQuerySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'TAKEN', 'DRIVER', 'EXPIRED', 'CANCELLED']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})
