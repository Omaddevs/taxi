import type { Request, Response } from 'express'
import * as botOrdersService from './botOrders.service.js'

export async function getDriverOrders(req: Request, res: Response) {
  const result = await botOrdersService.getMyDriverOrders(req.user!.id)
  res.json(result)
}

export async function claimOrder(req: Request, res: Response) {
  const result = await botOrdersService.claimDriverOrder(req.user!.id, Number(req.params.id))
  res.json(result)
}

export async function enrouteOrder(req: Request, res: Response) {
  const result = await botOrdersService.enrouteDriverOrder(req.user!.id, Number(req.params.id))
  res.json(result)
}

export async function completeOrder(req: Request, res: Response) {
  const result = await botOrdersService.completeDriverOrder(req.user!.id, Number(req.params.id))
  res.json(result)
}

export async function cancelOrder(req: Request, res: Response) {
  const result = await botOrdersService.cancelDriverOrder(req.user!.id, Number(req.params.id))
  res.json(result)
}

export async function getPassengerOrders(req: Request, res: Response) {
  const result = await botOrdersService.getMyPassengerOrders(req.user!.id)
  res.json(result)
}

export async function ratePassengerOrder(req: Request, res: Response) {
  const result = await botOrdersService.rateMyPassengerOrder(req.user!.id, Number(req.params.id), req.body)
  res.json(result)
}
