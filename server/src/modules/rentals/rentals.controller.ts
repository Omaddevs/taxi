import type { Request, Response } from 'express'
import * as rentalsService from './rentals.service.js'

export async function listPublic(req: Request, res: Response) {
  res.json(await rentalsService.listPublic(req.query as Parameters<typeof rentalsService.listPublic>[0]))
}

export async function getPublic(req: Request, res: Response) {
  res.json(await rentalsService.getPublic(req.params.id))
}

export async function listMine(req: Request, res: Response) {
  res.json(await rentalsService.listMine(req.user!.id))
}

export async function createMine(req: Request, res: Response) {
  res.status(201).json(await rentalsService.createMine(req.user!.id, req.body))
}

export async function updateMine(req: Request, res: Response) {
  res.json(await rentalsService.updateMine(req.user!.id, req.params.id, req.body))
}

export async function deleteMine(req: Request, res: Response) {
  await rentalsService.deleteMine(req.user!.id, req.params.id)
  res.status(204).end()
}

export async function listAdmin(req: Request, res: Response) {
  res.json(await rentalsService.listAdmin(req.query as Parameters<typeof rentalsService.listAdmin>[0]))
}

export async function getAdmin(req: Request, res: Response) {
  res.json(await rentalsService.getAdmin(req.params.id))
}

export async function createAdmin(req: Request, res: Response) {
  res.status(201).json(await rentalsService.createAdmin(req.body, req.user!.id))
}

export async function updateAdmin(req: Request, res: Response) {
  res.json(await rentalsService.updateAdmin(req.params.id, req.body, req.user!.id))
}

export async function deleteAdmin(req: Request, res: Response) {
  await rentalsService.deleteAdmin(req.params.id, req.user!.id)
  res.status(204).end()
}
