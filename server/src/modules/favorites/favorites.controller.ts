import type { Request, Response } from 'express'
import * as favoritesService from './favorites.service.js'

export async function listFavorites(req: Request, res: Response) {
  const favorites = await favoritesService.listFavorites(req.user!.id)
  res.json(favorites)
}

export async function addFavorite(req: Request, res: Response) {
  await favoritesService.addFavorite(req.user!.id, req.params.rideOfferId)
  res.status(201).end()
}

export async function removeFavorite(req: Request, res: Response) {
  await favoritesService.removeFavorite(req.user!.id, req.params.rideOfferId)
  res.status(204).end()
}
