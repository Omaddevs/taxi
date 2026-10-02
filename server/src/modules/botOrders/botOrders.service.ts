import { prisma } from '../../lib/prisma.js'
import { ForbiddenError } from '../../errors/AppError.js'
import * as botBridge from '../../lib/botBridge.js'

async function requireTelegramId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } })
  if (!user?.telegramId) throw new ForbiddenError('Telegram bilan bog‘lanmagan')
  return user.telegramId
}

export async function getMyDriverOrders(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } })
  if (!user?.telegramId) return { registered: false as const }
  return botBridge.getDriverBotOrders(user.telegramId)
}

export async function claimDriverOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.claimBotOrder(telegramId, orderId)
}

export async function enrouteDriverOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.enrouteBotOrder(telegramId, orderId)
}

export async function completeDriverOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.completeBotOrder(telegramId, orderId)
}

export async function cancelDriverOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.cancelBotOrder(telegramId, orderId)
}

export async function getMyPassengerOrders(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } })
  if (!user?.telegramId) return { orders: [] }
  return botBridge.getPassengerBotOrders(user.telegramId)
}

export async function rateMyPassengerOrder(
  userId: string,
  orderId: number,
  data: { stars: number; tags?: string[]; comment?: string },
) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.ratePassengerBotOrder(telegramId, orderId, data)
}
