import { z } from 'zod'

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const conversationIdParamSchema = z.object({
  id: z.string().min(1),
})

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
