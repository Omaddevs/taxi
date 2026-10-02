import { z } from 'zod'

export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const ticketCategorySchema = z.enum(['TECHNICAL', 'PAYMENT', 'BOOKING', 'ACCOUNT', 'OTHER'])

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  q: z.string().optional(),
  mine: z.enum(['true', 'false']).optional(),
})

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(4000),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema.optional(),
  requesterPhone: z.string().max(20).optional(),
  requesterName: z.string().trim().max(120).optional(),
})

export const ticketIdParamSchema = z.object({
  id: z.string().min(1),
})

export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  claim: z.boolean().optional(),
  bookingId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
})

export const addTicketMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  internal: z.boolean().optional(),
})

export const lookupQuerySchema = z.object({
  q: z.string().trim().min(2),
})

export const submitSatisfactionSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})
