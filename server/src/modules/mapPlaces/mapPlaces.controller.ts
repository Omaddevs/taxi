import type { Request, Response } from 'express'
import * as mapPlacesService from './mapPlaces.service.js'

export async function listActivePlaces(_req: Request, res: Response) {
  res.json(await mapPlacesService.listActivePlaces())
}

export async function listPlacesAdmin(req: Request, res: Response) {
  res.json(await mapPlacesService.listPlacesAdmin(req.query as Parameters<typeof mapPlacesService.listPlacesAdmin>[0]))
}

export async function createPlace(req: Request, res: Response) {
  res.status(201).json(await mapPlacesService.createPlace(req.body, req.user!.id))
}

export async function updatePlace(req: Request, res: Response) {
  res.json(await mapPlacesService.updatePlace(req.params.id, req.body, req.user!.id))
}

export async function deletePlace(req: Request, res: Response) {
  await mapPlacesService.deletePlace(req.params.id, req.user!.id)
  res.status(204).end()
}
