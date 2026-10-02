import { z } from 'zod'

export const sendMessageSchema = z
  .object({
    type: z.enum(['TEXT', 'LOCATION']).optional(),
    text: z.string().max(2000).optional(),
    lat: z.number().gte(-90).lte(90).optional(),
    lng: z.number().gte(-180).lte(180).optional(),
    locationLabel: z.string().max(200).optional(),
  })
  .superRefine((val, ctx) => {
    const type = val.type || 'TEXT'
    if (type === 'LOCATION') {
      if (typeof val.lat !== 'number' || typeof val.lng !== 'number') {
        ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Lokatsiya koordinatasi kerak' })
      }
      return
    }
    if (!val.text?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'Xabar bo‘sh bo‘lmasligi kerak' })
    }
  })

export const conversationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(80),
})
