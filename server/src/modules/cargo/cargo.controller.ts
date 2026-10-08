import type { Request, Response } from 'express'
import * as cargoService from './cargo.service.js'

// Rider
export async function createCargoOrder(req: Request, res: Response) {
  res.status(201).json(await cargoService.createCargoOrder(req.user!.id, req.body))
}

export async function listRiderCargoOrders(req: Request, res: Response) {
  res.json(await cargoService.listRiderCargoOrders(req.user!.id))
}

export async function getRiderCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.getRiderCargoOrder(req.user!.id, req.params.id))
}

export async function cancelByRider(req: Request, res: Response) {
  res.json(await cargoService.cancelByRider(req.user!.id, req.params.id, req.body?.reason))
}

// Driver (website)
export async function listOpenCargoOrders(req: Request, res: Response) {
  res.json(await cargoService.listOpenCargoOrders(req.user!.id))
}

export async function listMyCargoOrders(req: Request, res: Response) {
  res.json(await cargoService.listMyClaimedCargoOrders(req.user!.id))
}

export async function getDriverCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.getDriverCargoOrder(req.user!.id, req.params.id))
}

export async function claimCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.claimCargoOrder(req.user!.id, req.params.id))
}

export async function completeCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.completeCargoOrder(req.user!.id, req.params.id))
}

export async function releaseCargoOrder(req: Request, res: Response) {
  res.json(await cargoService.releaseCargoOrder(req.user!.id, req.params.id, req.body?.reason))
}

// Driver (Telegram buttons, via the bot)
export async function claimViaBot(req: Request, res: Response) {
  res.json(await cargoService.claimViaBot(req.body.telegramId, req.body.cargoOrderId))
}

export async function completeViaBot(req: Request, res: Response) {
  res.json(await cargoService.completeViaBot(req.body.telegramId, req.body.cargoOrderId))
}
