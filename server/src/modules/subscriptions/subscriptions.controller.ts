import type { Request, Response } from 'express'
import * as subscriptionsService from './subscriptions.service.js'

export async function listPlans(_req: Request, res: Response) {
  res.json(await subscriptionsService.listPlans())
}

export async function updatePlan(req: Request, res: Response) {
  res.json(await subscriptionsService.updatePlan(req.params.id, req.body))
}

export async function getDriverSubscription(req: Request, res: Response) {
  res.json(await subscriptionsService.getDriverSubscription(req.params.driverId))
}

export async function renewSubscription(req: Request, res: Response) {
  const result = await subscriptionsService.renewSubscription(req.params.driverId, req.user!.id, req.body)
  res.status(201).json(result)
}

export async function cancelSubscription(req: Request, res: Response) {
  res.json(await subscriptionsService.cancelSubscription(req.params.driverId, req.body.reason))
}
