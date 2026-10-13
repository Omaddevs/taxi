import type { z } from 'zod'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, PhoneRequiredError, ValidationError } from '../../errors/AppError.js'
import * as botBridge from '../../lib/botBridge.js'
import { ONLINE_PAYMENTS_SOON } from '../../middleware/onlinePayments.js'
import type { createPassengerOrderSchema, estimateFareSchema, updatePassengerOrderSchema } from './botOrders.schema.js'
import { estimateFare, resolveRouteKm, tashkentDateTime } from './fare.js'
import { getFareRates } from './fareSettings.service.js'

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

// A slot is half an hour wide, so one that started a few minutes ago can still be booked.
const DEPART_GRACE_MS = 30 * 60 * 1000

/**
 * The departure slot as an instant, or undefined when there is none to store. A new request with
 * a time already gone is still accepted — older clients (the search-results card, the mobile app)
 * send whatever their form last held — it just carries no slot. Moving an existing order to a
 * past time (`strict`) is refused.
 */
function departAtOf(date?: string, time?: string, { strict = false } = {}) {
  if (!date || !time) return undefined
  const at = tashkentDateTime(date, time)
  if (Number.isNaN(at.getTime())) throw new ValidationError('Sana yoki vaqt noto‘g‘ri')
  if (at.getTime() < Date.now() - DEPART_GRACE_MS) {
    if (strict) throw new ValidationError('Jo‘nash vaqti o‘tib ketgan — boshqa vaqtni tanlang')
    return undefined
  }
  return at.toISOString()
}

function assertPaymentMethod(method?: string) {
  if (method && method !== 'cash' && !env.ONLINE_PAYMENTS_ENABLED) throw new ForbiddenError(ONLINE_PAYMENTS_SOON)
}

type CreateInput = z.infer<typeof createPassengerOrderSchema>
type UpdateInput = z.infer<typeof updatePassengerOrderSchema>

export async function getFareEstimate(input: z.infer<typeof estimateFareSchema>) {
  const km = resolveRouteKm(input.from, input.to, input.routeKm)
  return estimateFare({ km, passengers: input.passengers, wholeCar: input.wholeCar }, await getFareRates())
}

export async function createPassengerOrder(userId: string, input: CreateInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramId: true, name: true, phone: true },
  })
  if (!user?.telegramId) {
    throw new ForbiddenError('So‘rov yuborish uchun hisobingizni Telegram bot bilan bog‘lang (bot orqali kiring)')
  }
  if (!user.phone) throw new PhoneRequiredError()
  assertPaymentMethod(input.paymentMethod)

  const { date, time, routeKm, ...rest } = input
  const hasRoute = [rest.pickupLat, rest.pickupLng, rest.toLat, rest.toLng].every((v) => v !== undefined)
  return botBridge.createPassengerBotOrder({
    ...rest,
    telegramId: user.telegramId,
    name: user.name || 'Yo‘lovchi',
    phone: user.phone,
    whenText: formatWhen(date, time),
    departAt: departAtOf(date, time),
    // Stored for the order screen; never trusted blindly (see resolveRouteKm).
    routeKm: hasRoute
      ? resolveRouteKm({ lat: rest.pickupLat!, lng: rest.pickupLng! }, { lat: rest.toLat!, lng: rest.toLng! }, routeKm)
      : undefined,
  })
}

export async function getMyPassengerOrders(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } })
  if (!user?.telegramId) return { orders: [] }
  return botBridge.getPassengerBotOrders(user.telegramId)
}

export async function getMyPassengerOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.getPassengerBotOrder(telegramId, orderId)
}

export async function updateMyPassengerOrder(userId: string, orderId: number, input: UpdateInput) {
  const telegramId = await requireTelegramId(userId)
  const { date, time, ...rest } = input
  return botBridge.updatePassengerBotOrder(telegramId, orderId, {
    ...rest,
    ...(date && time ? { whenText: formatWhen(date, time), departAt: departAtOf(date, time, { strict: true }) } : {}),
  })
}

export async function cancelMyPassengerOrder(userId: string, orderId: number) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.cancelPassengerBotOrder(telegramId, orderId)
}

export async function rateMyPassengerOrder(
  userId: string,
  orderId: number,
  data: { stars: number; tags?: string[]; comment?: string },
) {
  const telegramId = await requireTelegramId(userId)
  return botBridge.ratePassengerBotOrder(telegramId, orderId, data)
}
