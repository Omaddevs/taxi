import type { Request, Response } from 'express'
import * as usersService from './users.service.js'
import type { z } from 'zod'
import type { listUsersQuerySchema } from './admin.schema.js'

export async function getMe(req: Request, res: Response) {
  const user = await usersService.getMe(req.user!.id)
  res.json(user)
}

export async function updateMe(req: Request, res: Response) {
  const user = await usersService.updateMe(req.user!.id, req.body)
  res.json(user)
}

export async function listUsers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listUsersQuerySchema>
  res.json(await usersService.listUsers(query))
}

export async function getUserById(req: Request, res: Response) {
  res.json(await usersService.getAdminUserDetail(req.params.id))
}

export async function setVerified(req: Request, res: Response) {
  res.json(await usersService.setVerified(req.params.id, req.body.verified))
}
