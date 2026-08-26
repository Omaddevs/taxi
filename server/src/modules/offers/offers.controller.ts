import type { Request, Response } from 'express'
import * as offersService from './offers.service.js'
import type { z } from 'zod'
import type { listOffersAdminQuerySchema, searchOffersQuerySchema } from './offers.schema.js'

export async function createOffer(req: Request, res: Response) {
  const offer = await offersService.createOffer(req.user!.id, req.body)
  res.status(201).json(offer)
}

export async function listMyOffers(req: Request, res: Response) {
  const offers = await offersService.listMyOffers(req.user!.id)
  res.json(offers)
}

export async function updateOffer(req: Request, res: Response) {
  const offer = await offersService.updateOffer(req.user!.id, req.params.id, req.body)
  res.json(offer)
}

export async function getOffer(req: Request, res: Response) {
  const offer = await offersService.getOffer(req.params.id)
  res.json(offer)
}

export async function searchOffers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof searchOffersQuerySchema>
  const offers = await offersService.searchOffers(query)
  res.json(offers)
}

export async function listAllOffersAdmin(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listOffersAdminQuerySchema>
  res.json(await offersService.listAllOffersAdmin(query.status))
}
