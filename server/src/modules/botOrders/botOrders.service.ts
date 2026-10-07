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

function formatWhen(date?: string, time?: string) {
  if (!date && !time) return 'Kelishiladi'
  const day = date ? date.split('-').reverse().join('.') : ''
  return [day, time].filter(Boolean).join(' ')
}

export async function createPassengerOrder(
  userId: string,
  input: {
    fromRegion: string
    fromDistrict?: string
    toRegion: string
    toDistrict?: string
    date?: string
    time?: string
    passengers: number
    seat?: string
    luggage?: string
    gender?: string
    womenOnly?: boolean
    carBrand?: string
    pickupText?: string
    note?: string
  },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, name: true, phone: true },
  })
  if (!user?.telegramId) {
    throw new ForbiddenError('So‘rov yuborish uchun hisobingizni Telegram bot bilan bog‘lang (bot orqali kiring)')
  }
  const { date, time, ...rest } = input
  return botBridge.createPassengerBotOrder({
    ...rest,
    telegramId: user.telegramId,
    name: user.name || 'Yo‘lovchi',
    phone: user.phone,
    whenText: formatWhen(date, time),
  })
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
