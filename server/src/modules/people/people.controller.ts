import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as peopleService from './people.service.js'
import type { listPeopleQuerySchema, updatePersonSchema } from './people.schema.js'

export async function listPeople(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listPeopleQuerySchema>
  res.json(await peopleService.listPeople(query))
}

export async function getPerson(req: Request, res: Response) {
  res.json(await peopleService.getPerson(req.params.id, req.user!.role))
}

export async function updatePerson(req: Request, res: Response) {
  const body = req.body as z.infer<typeof updatePersonSchema>
  res.json(await peopleService.updatePerson(req.params.id, req.user!.role, body, req.user!.id))
}
