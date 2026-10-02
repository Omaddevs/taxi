import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as leadsService from './leads.service.js'
import type { createLeadSchema, listLeadsQuerySchema, updateLeadSchema } from './leads.schema.js'

export async function listLeads(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listLeadsQuerySchema>
  res.json(
    await leadsService.listLeads(req.user!.role, req.user!.id, {
      status: query.status,
      leadType: query.leadType,
      channel: query.channel,
      q: query.q,
      dueOnly: query.dueOnly === 'true',
    }),
  )
}

export async function createLead(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createLeadSchema>
  res.status(201).json(await leadsService.createLead(req.user!.role, req.user!.id, body))
}

export async function updateLead(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateLeadSchema>
  res.json(await leadsService.updateLead(req.params.id, req.user!.role, req.user!.id, body))
}

export async function deleteLead(req: Request, res: Response) {
  await leadsService.deleteLead(req.params.id, req.user!.role, req.user!.id)
  res.status(204).end()
}
