import type { Request, Response } from 'express'
import type { z } from 'zod'
import * as peopleService from './people.service.js'
import * as peopleEmail from './people.email.js'
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

export async function createPerson(req: Request, res: Response) {
  res.status(201).json(await peopleService.createPerson(req.body, req.user!.id))
}

export async function deletePerson(req: Request, res: Response) {
  res.json(await peopleService.deletePerson(req.params.id, req.user!.id))
}

export async function emailStatus(_req: Request, res: Response) {
  res.json(await peopleEmail.emailStatus())
}

export async function emailAudience(req: Request, res: Response) {
  const { audience } = req.query as { audience: 'google' | 'with_email' }
  res.json({ count: await peopleEmail.audienceCount(audience) })
}

export async function emailPerson(req: Request, res: Response) {
  res.json(await peopleEmail.emailPerson(req.params.id, req.body.subject, req.body.message, req.user!.id))
}

export async function emailBroadcast(req: Request, res: Response) {
  const { audience, subject, message, ids } = req.body
  res.json(await peopleEmail.emailBroadcast(audience, subject, message, ids, req.user!.id))
}
