import type { Request, Response } from 'express'
import * as cargoService from './cargo.service.js'

export async function createCargoOrder(req: Request, res: Response) {
  const order = await cargoService.createCargoOrder(req.user!.id, req.body)
  res.status(201).json(order)
}

export async function listRiderCargoOrders(req: Request, res: Response) {
  res.json(await cargoService.listRiderCargoOrders(req.user!.id))
}

export async function listOpenCargoOrders(_req: Request, res: Response) {
  res.json(await cargoService.listOpenCargoOrders())
}

export async function listMyCargoOrders(req: Request, res: Response) {
  res.json(await cargoService.listMyClaimedCargoOrders(req.user!.id))
}

export async function claimCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.claimCargoOrder(req.user!.id, req.params.id))
}

export async function completeCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.completeCargoOrder(req.user!.id, req.params.id))
}

export async function cancelCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.cancelCargoOrder(req.user!.id, req.params.id, req.body?.reason))
}
