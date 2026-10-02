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

export const createGroupSchema = z
  .object({
    kind: z.enum(['CLOSED', 'ROUTE', 'CHANNEL']),
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
  kind: z.enum(['CLOSED', 'ROUTE', 'CHANNEL']).optional(),
  ref: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  fromRegion: z.string().min(1).optional(),
  toRegion: z.string().min(1).optional(),
  includeReverse: z.boolean().optional(),
  topics: z.array(topicSchema).optional(),
})
