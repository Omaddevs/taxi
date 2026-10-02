import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as ticketsService from './tickets.service.js'
import type {
  addTicketMessageSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  lookupQuerySchema,
  submitSatisfactionSchema,
  updateTicketSchema,
} from './tickets.schema.js'

export async function listTickets(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listTicketsQuerySchema>
  res.json(
    await ticketsService.listTickets({
      status: query.status,
      category: query.category,
      q: query.q,
      mine: query.mine === 'true',
      userId: req.user!.id,
    }),
  )
}

export async function getTicket(req: Request, res: Response) {
  res.json(await ticketsService.getTicket(req.params.id))
}

export async function createTicket(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createTicketSchema>
  res.status(201).json(await ticketsService.createTicket(req.user!.id, body))
}

export async function updateTicket(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateTicketSchema>
  res.json(await ticketsService.updateTicket(req.params.id, req.user!.id, body))
}

export async function addMessage(req: Request, res: Response) {
  const body = req.body as z.infer<typeof addTicketMessageSchema>
  res.status(201).json(await ticketsService.addMessage(req.params.id, req.user!.id, body.body, body.internal))
}

export async function stats(_req: Request, res: Response) {
  res.json(await ticketsService.ticketStats())
}

export async function lookupBookings(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof lookupQuerySchema>
  res.json(await ticketsService.lookupBookings(query.q))
}

export async function lookupDrivers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof lookupQuerySchema>
  res.json(await ticketsService.lookupDrivers(query.q))
}

export async function submitSatisfaction(req: Request, res: Response) {
  const body = req.body as z.infer<typeof submitSatisfactionSchema>
  res.json(await ticketsService.submitSatisfaction(req.params.id, req.user!.id, body.rating, body.comment))
}
