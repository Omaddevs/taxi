import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as ticketsController from './tickets.controller.js'
import {
  addTicketMessageSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  lookupQuerySchema,
  submitSatisfactionSchema,
  ticketIdParamSchema,
  updateTicketSchema,
} from './tickets.schema.js'

const staff = ['ADMIN', 'SUPPORT_OPERATOR'] as const

export const adminTicketsRouter = Router()

adminTicketsRouter.get(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ query: listTicketsQuerySchema }),
  asyncRoute(ticketsController.listTickets),
)
adminTicketsRouter.get('/stats', requireAuth, requireRole(...staff), asyncRoute(ticketsController.stats))
adminTicketsRouter.get(
  '/lookup/bookings',
  requireAuth,
  requireRole(...staff),
  validate({ query: lookupQuerySchema }),
  asyncRoute(ticketsController.lookupBookings),
)
adminTicketsRouter.get(
  '/lookup/drivers',
  requireAuth,
  requireRole(...staff),
  validate({ query: lookupQuerySchema }),
  asyncRoute(ticketsController.lookupDrivers),
)
adminTicketsRouter.post(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ body: createTicketSchema }),
  asyncRoute(ticketsController.createTicket),
)
adminTicketsRouter.get(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: ticketIdParamSchema }),
  asyncRoute(ticketsController.getTicket),
)
adminTicketsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: ticketIdParamSchema, body: updateTicketSchema }),
  asyncRoute(ticketsController.updateTicket),
)
adminTicketsRouter.post(
  '/:id/messages',
  requireAuth,
  requireRole(...staff),
  validate({ params: ticketIdParamSchema, body: addTicketMessageSchema }),
  asyncRoute(ticketsController.addMessage),
)

// Customer-facing: the ticket's own requester submits a 1-5 satisfaction rating once resolved
// (see updateTicket's satisfaction-request notification). Any authenticated app role may hit
// this — ownership is enforced in the service by comparing ticket.userId to the caller.
export const ticketSatisfactionRouter = Router()
ticketSatisfactionRouter.post(
  '/:id/satisfaction',
  requireAuth,
  validate({ params: ticketIdParamSchema, body: submitSatisfactionSchema }),
  asyncRoute(ticketsController.submitSatisfaction),
)
