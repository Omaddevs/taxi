import type { CargoOrder, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { notifyCargoStatus, notifyGroupCargoPosted, notifyUserViaBot } from '../../lib/botNotify.js'
import { formatSom } from '../../lib/format.js'
import { createNotification } from '../notifications/notifications.service.js'

const CARGO_INCLUDE = {
  rider: { select: { id: true, name: true, phone: true, telegramId: true } },
  driver: { include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true, telegramId: true } } } },
} satisfies Prisma.CargoOrderInclude

type CargoWithPeople = Prisma.CargoOrderGetPayload<{ include: typeof CARGO_INCLUDE }>

// Matches apps/web/src/data/mock.js's cargoTypes ids — kept here too since the Telegram
// group message needs a human label, not the raw id, and the bot side shouldn't need its own
// copy of this mapping.
const CARGO_TYPE_LABELS: Record<string, string> = {
  parcel: 'Buyum',
  shopping: 'Xarid',
  flowers: 'Gul',
  docs: 'Hujjat',
  clothes: 'Kiyim',
  food: 'Oziq-ovqat',
  tech: 'Texnika',
  other: 'Boshqa',
}

const CARGO_VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  car: 'Avto',
  van: 'Kichik yuk mashinasi',
}

// ---------------------------------------------------------------------------------------------
// Who sees what
// ---------------------------------------------------------------------------------------------

function stripTelegram<T extends CargoWithPeople>(order: T) {
  const { rider, driver, ...rest } = order
  return {
    ...rest,
    rider: { id: rider.id, name: rider.name, phone: rider.phone },
    driver: driver ? { ...driver, user: { id: driver.user.id, name: driver.user.name, phone: driver.user.phone, avatarUrl: driver.user.avatarUrl } } : null,
  }
}

/**
 * Drivers browsing open cargo don't get anyone's phone number until they take the job — the
 * same rule as the Telegram card. The driver who took it sees everything.
 */
function forDriver(order: CargoWithPeople, driverId: string) {
  const full = stripTelegram(order)
  if (order.driverId === driverId) return { ...full, contactsHidden: false }
  return { ...full, recipientPhone: null, rider: { id: order.rider.id, name: order.rider.name, phone: null }, contactsHidden: true }
}

// ---------------------------------------------------------------------------------------------
// Driver lookup
// ---------------------------------------------------------------------------------------------

async function activeDriverOrThrow(where: Prisma.DriverWhereUniqueInput) {
  const driver = await prisma.driver.findUnique({ where, include: { user: { select: { name: true, phone: true, telegramId: true } } } })
  if (!driver) throw new ForbiddenError('Siz hali tasdiqlangan haydovchi emassiz')
  if (!driver.approved) throw new ForbiddenError('Haydovchi profilingiz hali tasdiqlanmagan')
  if (driver.archivedAt) throw new ForbiddenError('Haydovchi profilingiz faol emas')
  return driver
}

async function driverByTelegram(telegramId: string) {
  const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true } })
  if (!user) throw new ForbiddenError('Avval saytda yoki botda haydovchi sifatida ro‘yxatdan o‘ting')
  return activeDriverOrThrow({ userId: user.id })
}

function routeLine(order: CargoOrder) {
  return `${order.fromLabel} → ${order.toLabel}`
}

// ---------------------------------------------------------------------------------------------
// Rider
// ---------------------------------------------------------------------------------------------

export async function createCargoOrder(
  userId: string,
  data: {
    fromLabel: string
    toLabel: string
    fromRegion?: string
    toRegion?: string
    fromLat?: number
    fromLng?: number
    toLat?: number
    toLng?: number
    cargoType: string
    vehicleType?: string
    weightLabel: string
    recipientName: string
    recipientPhone: string
    note?: string
    price: number
  },
) {
  const order = await prisma.cargoOrder.create({ data: { ...data, riderId: userId }, include: CARGO_INCLUDE })

  await notifyGroupCargoPosted({
    cargoOrderId: order.id,
    fromRegion: order.fromRegion,
    toRegion: order.toRegion,
    fromLabel: order.fromLabel,
    toLabel: order.toLabel,
    cargoType: CARGO_TYPE_LABELS[order.cargoType] || order.cargoType,
    weightLabel: order.weightLabel,
    vehicle: order.vehicleType ? CARGO_VEHICLE_LABELS[order.vehicleType] || order.vehicleType : null,
    note: order.note,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    price: order.price,
  })

  return stripTelegram(order)
}

// The rider-side view: every cargo order this user posted, newest first.
export async function listRiderCargoOrders(userId: string) {
  const rows = await prisma.cargoOrder.findMany({ where: { riderId: userId }, orderBy: { createdAt: 'desc' }, include: CARGO_INCLUDE })
  return rows.map(stripTelegram)
}

export async function getRiderCargoOrder(userId: string, orderId: string) {
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId }, include: CARGO_INCLUDE })
  if (!order || order.riderId !== userId) throw new NotFoundError('Buyurtma topilmadi')
  return stripTelegram(order)
}

/** The sender changes their mind — before delivery. A driver already on it is told. */
export async function cancelByRider(userId: string, orderId: string, reason?: string) {
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId }, include: CARGO_INCLUDE })
  if (!order || order.riderId !== userId) throw new NotFoundError('Buyurtma topilmadi')
  if (order.status !== 'NEW' && order.status !== 'CLAIMED') throw new ConflictError('Bu buyurtmani endi bekor qilib bo‘lmaydi')

  const updated = await prisma.cargoOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', cancelReason: reason || 'Mijoz bekor qildi' },
    include: CARGO_INCLUDE,
  })
  await notifyCargoStatus({ cargoOrderId: orderId, status: 'CANCELLED' })
  if (order.driver) {
    const text = `❌ Yuk buyurtmasi mijoz tomonidan bekor qilindi\n${routeLine(order)}`
    await createNotification(order.driver.userId, 'BOOKING', 'Yuk bekor qilindi', routeLine(order), orderId).catch(() => {})
    await notifyUserViaBot(order.driver.user.telegramId, text)
  }
  return stripTelegram(updated)
}

// ---------------------------------------------------------------------------------------------
// Driver (website)
// ---------------------------------------------------------------------------------------------

export async function listOpenCargoOrders(userId: string) {
  const driver = await activeDriverOrThrow({ userId })
  const rows = await prisma.cargoOrder.findMany({ where: { status: 'NEW' }, orderBy: { createdAt: 'desc' }, include: CARGO_INCLUDE, take: 200 })
  return rows.map((o) => forDriver(o, driver.id))
}

export async function listMyClaimedCargoOrders(userId: string) {
  const driver = await activeDriverOrThrow({ userId })
  const rows = await prisma.cargoOrder.findMany({ where: { driverId: driver.id }, orderBy: { createdAt: 'desc' }, include: CARGO_INCLUDE })
  return rows.map((o) => forDriver(o, driver.id))
}

export async function getDriverCargoOrder(userId: string, orderId: string) {
  const driver = await activeDriverOrThrow({ userId })
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId }, include: CARGO_INCLUDE })
  if (!order || (order.status !== 'NEW' && order.driverId !== driver.id)) throw new NotFoundError('Yuk topilmadi')
  return forDriver(order, driver.id)
}

async function claim(
  driver: { id: string; userId: string; user: { name: string | null; phone: string; telegramId: string | null } },
  orderId: string,
) {
  const { count } = await prisma.cargoOrder.updateMany({
    where: { id: orderId, status: 'NEW' },
    data: { status: 'CLAIMED', driverId: driver.id, claimedAt: new Date() },
  })
  if (count !== 1) {
    const exists = await prisma.cargoOrder.count({ where: { id: orderId } })
    if (!exists) throw new NotFoundError('Yuk topilmadi')
    throw new ConflictError('Bu yuk allaqachon band qilingan')
  }
  const order = await prisma.cargoOrder.findUniqueOrThrow({ where: { id: orderId }, include: CARGO_INCLUDE })

  const driverName = driver.user.name || 'Haydovchi'
  await notifyCargoStatus({ cargoOrderId: orderId, status: 'CLAIMED', driverName, driverTelegramId: driver.user.telegramId })
  await createNotification(order.riderId, 'BOOKING', 'Haydovchi topildi', `${driverName} yukingizni olib ketadi. ${routeLine(order)}`, orderId).catch(() => {})
  await notifyUserViaBot(
    order.rider.telegramId,
    `🚚 Yukingiz uchun haydovchi topildi!\n\n👤 ${driverName}\n📞 ${driver.user.phone}\n📍 ${routeLine(order)}`,
  )
  return order
}

export async function claimCargoOrder(userId: string, orderId: string) {
  const driver = await activeDriverOrThrow({ userId })
  return forDriver(await claim(driver, orderId), driver.id)
}

async function complete(driverId: string, orderId: string) {
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId } })
  if (!order) throw new NotFoundError('Yuk topilmadi')
  if (order.driverId !== driverId) throw new ForbiddenError('Bu yuk sizga tegishli emas')
  if (order.status !== 'CLAIMED') throw new ConflictError('Bu yuk hozir yetkazilayotgan holatda emas')

  const updated = await prisma.cargoOrder.update({
    where: { id: orderId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
    include: CARGO_INCLUDE,
  })
  await notifyCargoStatus({ cargoOrderId: orderId, status: 'DELIVERED' })
  await createNotification(order.riderId, 'BOOKING', 'Yuk yetkazildi', `${routeLine(order)} · ${formatSom(order.price)}`, orderId).catch(() => {})
  await notifyUserViaBot(updated.rider.telegramId, `✅ Yukingiz yetkazildi!\n📍 ${routeLine(order)}\n\nTaxiLine'dan foydalanganingiz uchun rahmat.`)
  return updated
}

export async function completeCargoOrder(userId: string, orderId: string) {
  const driver = await activeDriverOrThrow({ userId })
  return forDriver(await complete(driver.id, orderId), driver.id)
}

/**
 * The driver backs out: the order goes back to NEW (not cancelled — the sender still needs it
 * delivered), every Telegram copy gets its claim button back, and the sender is told.
 */
export async function releaseCargoOrder(userId: string, orderId: string, reason?: string) {
  const driver = await activeDriverOrThrow({ userId })
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId }, include: CARGO_INCLUDE })
  if (!order) throw new NotFoundError('Yuk topilmadi')
  if (order.driverId !== driver.id) throw new ForbiddenError('Bu yuk sizga tegishli emas')
  if (order.status !== 'CLAIMED') throw new ConflictError('Bu yuk hozir sizda emas')

  const updated = await prisma.cargoOrder.update({
    where: { id: orderId },
    data: { status: 'NEW', driverId: null, claimedAt: null, cancelReason: reason ?? null },
    include: CARGO_INCLUDE,
  })
  await notifyCargoStatus({ cargoOrderId: orderId, status: 'NEW' })
  await createNotification(order.riderId, 'BOOKING', 'Haydovchi voz kechdi', `Yangi haydovchi qidirilmoqda. ${routeLine(order)}`, orderId).catch(() => {})
  await notifyUserViaBot(order.rider.telegramId, `ℹ️ Haydovchi yukingizdan voz kechdi. Yangi haydovchi qidirilmoqda.\n📍 ${routeLine(order)}`)
  return forDriver(updated, driver.id)
}

// ---------------------------------------------------------------------------------------------
// Driver (Telegram) — the bot's "Qabul qilish" / "Yetkazildi" buttons
// ---------------------------------------------------------------------------------------------

export async function claimViaBot(telegramId: string, orderId: string) {
  const driver = await driverByTelegram(telegramId)
  return stripTelegram(await claim(driver, orderId))
}

export async function completeViaBot(telegramId: string, orderId: string) {
  const driver = await driverByTelegram(telegramId)
  return stripTelegram(await complete(driver.id, orderId))
}
