import type { Request, Response } from 'express'
import * as botBridge from '../../lib/botBridge.js'
import { writeAudit } from '../../lib/audit.js'

export async function listOrders(req: Request, res: Response) {
  const { status, q, women } = req.query as { status?: string; q?: string; women?: string }
  res.json(await botBridge.getAdminBotOrders({ status, q, women: women === '1' || women === 'true' }))
}

export async function getOrder(req: Request, res: Response) {
  res.json(await botBridge.getAdminBotOrder(Number(req.params.id)))
}

export async function updateOrder(req: Request, res: Response) {
  const orderId = Number(req.params.id)
  const order = await botBridge.updateAdminBotOrder(orderId, req.body)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_ORDER_UPDATED',
    targetType: 'Order',
    targetId: String(orderId),
    meta: { patch: req.body },
  })
  res.json(order)
}

export async function setOrderStatus(req: Request, res: Response) {
  const orderId = Number(req.params.id)
  const order = await botBridge.setAdminBotOrderStatus(orderId, req.body.status)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_ORDER_STATUS_CHANGED',
    targetType: 'Order',
    targetId: String(orderId),
    meta: { status: req.body.status },
  })
  res.json(order)
}

export async function deleteOrder(req: Request, res: Response) {
  const orderId = Number(req.params.id)
  const result = await botBridge.deleteAdminBotOrder(orderId)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_ORDER_DELETED',
    targetType: 'Order',
    targetId: String(orderId),
  })
  res.json(result)
}
