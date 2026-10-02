import type { Request, Response } from 'express'
import * as botBridge from '../../lib/botBridge.js'
import { writeAudit } from '../../lib/audit.js'

export async function listGroups(req: Request, res: Response) {
  const { kind } = req.query as { kind?: string }
  res.json(await botBridge.getAdminBotGroups(kind))
}

export async function createGroup(req: Request, res: Response) {
  const group = await botBridge.createAdminBotGroup(req.body)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_GROUP_CREATED',
    targetType: 'Group',
    targetId: String(group.id),
    meta: { kind: group.kind, title: group.title, chatId: group.chatId },
  })
  res.json(group)
}

export async function updateGroup(req: Request, res: Response) {
  const groupId = Number(req.params.id)
  const group = await botBridge.updateAdminBotGroup(groupId, req.body)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_GROUP_UPDATED',
    targetType: 'Group',
    targetId: String(groupId),
    meta: { patch: req.body },
  })
  res.json(group)
}

export async function deleteGroup(req: Request, res: Response) {
  const groupId = Number(req.params.id)
  const result = await botBridge.deleteAdminBotGroup(groupId)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_GROUP_DELETED',
    targetType: 'Group',
    targetId: String(groupId),
  })
  res.json(result)
}
