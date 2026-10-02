import type { Request, Response } from 'express'
import * as notificationsService from './notifications.service.js'

export async function listNotifications(req: Request, res: Response) {
  const notifications = await notificationsService.listNotifications(req.user!.id)
  res.json(notifications)
}

export async function markRead(req: Request, res: Response) {
  const notification = await notificationsService.markRead(req.user!.id, req.params.id)
  res.json(notification)
}

export async function markAllRead(req: Request, res: Response) {
  await notificationsService.markAllRead(req.user!.id)
  res.status(204).end()
}

export async function broadcast(req: Request, res: Response) {
  res.json(await notificationsService.broadcast(req.body))
}
