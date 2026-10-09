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

export async function getBotSettings(_req: Request, res: Response) {
  res.json(await botBridge.getBotSettings())
}

export async function updateBotSettings(req: Request, res: Response) {
  const { values } = req.body as { values: Record<string, unknown> }
  const result = await botBridge.updateBotSettings(values)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_SETTINGS_UPDATED',
    targetType: 'BotSettings',
    meta: { keys: Object.keys(values) },
  })
  res.json(result)
}

export async function listGroupAds(req: Request, res: Response) {
  const { status, limit } = req.query as { status?: string; limit?: string }
  res.json(await botBridge.getBotGroupAds(status, limit ? Number(limit) : undefined))
}

export async function createGroupAd(req: Request, res: Response) {
  const ad = await botBridge.createBotGroupAd(req.body)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_GROUP_AD_CREATED',
    targetType: 'GroupAd',
    targetId: String(ad.id),
    meta: { targetGroupId: req.body.targetGroupId },
  })
  res.json(ad)
}

export async function updateGroupAd(req: Request, res: Response) {
  const id = Number(req.params.id)
  const ad = await botBridge.updateBotGroupAd(id, req.body)
  await writeAudit({
    actorId: req.user!.id,
    action: 'BOT_GROUP_AD_UPDATED',
    targetType: 'GroupAd',
    targetId: String(id),
    meta: { status: req.body.status, textChanged: req.body.text !== undefined },
  })
  res.json(ad)
}

export async function deleteGroupAd(req: Request, res: Response) {
  const id = Number(req.params.id)
  const result = await botBridge.deleteBotGroupAd(id)
  await writeAudit({ actorId: req.user!.id, action: 'BOT_GROUP_AD_DELETED', targetType: 'GroupAd', targetId: String(id) })
  res.json(result)
}
