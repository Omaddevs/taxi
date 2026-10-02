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
  const includeDeleted = req.baseUrl.startsWith('/admin')
  const offer = await offersService.getOffer(req.params.id, { includeDeleted })
  res.json(offer)
}

export async function searchOffers(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof searchOffersQuerySchema>
  const offers = await offersService.searchOffers(query)
  res.json(offers)
}

export async function listAllOffersAdmin(req: Request, res: Response) {
  const query = req.query as unknown as z.infer<typeof listOffersAdminQuerySchema>
  res.json(await offersService.listAllOffersAdmin(query))
}

export async function adminCancelOffer(req: Request, res: Response) {
  res.json(await offersService.adminCancelOffer(req.params.id))
}

export async function adminUpdateOffer(req: Request, res: Response) {
  res.json(await offersService.adminUpdateOffer(req.user!.id, req.params.id, req.body))
}

export async function adminSetOfferStatus(req: Request, res: Response) {
  res.json(await offersService.adminSetOfferStatus(req.user!.id, req.params.id, req.body.status))
}

export async function adminDeleteOffer(req: Request, res: Response) {
  res.json(await offersService.adminDeleteOffer(req.user!.id, req.params.id))
}
