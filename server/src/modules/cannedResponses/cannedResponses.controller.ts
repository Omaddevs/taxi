import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as cannedService from './cannedResponses.service.js'
import type { createCannedSchema, listCannedQuerySchema, updateCannedSchema } from './cannedResponses.schema.js'

export async function listCanned(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listCannedQuerySchema>
  res.json(await cannedService.listCanned(query.category))
}

export async function createCanned(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createCannedSchema>
  res.status(201).json(await cannedService.createCanned(req.user!.id, body))
}

export async function updateCanned(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updateCannedSchema>
  res.json(await cannedService.updateCanned(req.params.id, body))
}

export async function deleteCanned(req: Request, res: Response) {
  await cannedService.deleteCanned(req.params.id)
  res.status(204).end()
}
