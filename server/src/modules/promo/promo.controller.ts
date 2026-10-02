import type { Request, Response } from 'express'
import * as promoService from './promo.service.js'

export async function validatePromo(req: Request, res: Response) {
  const result = await promoService.validatePromo(req.body.code)
  res.json(result)
}

export async function applyPromo(req: Request, res: Response) {
  const booking = await promoService.applyPromo(req.user!.id, req.body.code, req.body.bookingId)
  res.json(booking)
}

export async function listPromos(_req: Request, res: Response) {
  const promos = await promoService.listPromos()
  res.json(promos)
}

export async function createPromo(req: Request, res: Response) {
  const promo = await promoService.createPromo(req.body)
  res.status(201).json(promo)
}

export async function updatePromo(req: Request, res: Response) {
  const promo = await promoService.updatePromo(req.params.id, req.body)
  res.json(promo)
}

export async function listAvailablePromos(_req: Request, res: Response) {
  res.json(await promoService.listAvailablePromos())
}
