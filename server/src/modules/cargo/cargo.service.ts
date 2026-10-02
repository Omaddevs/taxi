import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { notifyGroupCargoPosted } from '../../lib/botNotify.js'

const CARGO_INCLUDE = {
  rider: { select: { id: true, name: true, phone: true } },
  driver: { include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } } },
} as const

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

async function getOwnedDriverOrThrow(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } })
  if (!driver) throw new ForbiddenError('Siz hali tasdiqlangan haydovchi emassiz')
  if (!driver.approved) throw new ForbiddenError('Haydovchi profilingiz hali tasdiqlanmagan')
  return driver
}

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
  const order = await prisma.cargoOrder.create({
    data: { ...data, riderId: userId },
    include: CARGO_INCLUDE,
  })

  await notifyGroupCargoPosted({
    cargoOrderId: order.id,
    fromRegion: order.fromRegion,
    toRegion: order.toRegion,
    fromLabel: order.fromLabel,
    toLabel: order.toLabel,
    cargoType: CARGO_TYPE_LABELS[order.cargoType] || order.cargoType,
    // The bot payload has no vehicle field — fold it into the weight line so drivers still see it.
    weightLabel: order.vehicleType
      ? `${order.weightLabel} · ${CARGO_VEHICLE_LABELS[order.vehicleType] || order.vehicleType}`
      : order.weightLabel,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    price: order.price,
  })

  return order
}

export async function listOpenCargoOrders() {
  return prisma.cargoOrder.findMany({
    where: { status: 'NEW' },
    orderBy: { createdAt: 'desc' },
    include: CARGO_INCLUDE,
  })
}

// The rider-side view: every cargo order this user posted, newest first.
export async function listRiderCargoOrders(userId: string) {
  return prisma.cargoOrder.findMany({
    where: { riderId: userId },
    orderBy: { createdAt: 'desc' },
    include: CARGO_INCLUDE,
  })
}

export async function listMyClaimedCargoOrders(userId: string) {
  const driver = await getOwnedDriverOrThrow(userId)
  return prisma.cargoOrder.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: 'desc' },
    include: CARGO_INCLUDE,
  })
}

export async function claimCargoOrder(userId: string, orderId: string) {
  const driver = await getOwnedDriverOrThrow(userId)

  const { count } = await prisma.cargoOrder.updateMany({
    where: { id: orderId, status: 'NEW' },
    data: { status: 'CLAIMED', driverId: driver.id, claimedAt: new Date() },
  })
  if (count !== 1) throw new ConflictError('Bu yuk allaqachon band qilingan')

  return prisma.cargoOrder.findUniqueOrThrow({ where: { id: orderId }, include: CARGO_INCLUDE })
}

export async function completeCargoOrder(userId: string, orderId: string) {
  const driver = await getOwnedDriverOrThrow(userId)
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId } })
  if (!order) throw new NotFoundError('Yuk topilmadi')
  if (order.driverId !== driver.id) throw new ForbiddenError('Bu yuk sizga tegishli emas')
  if (order.status !== 'CLAIMED') throw new ConflictError('Bu yuk hali band qilinmagan')

  return prisma.cargoOrder.update({
    where: { id: orderId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
    include: CARGO_INCLUDE,
  })
}

export async function cancelCargoOrder(userId: string, orderId: string, reason?: string) {
  const driver = await getOwnedDriverOrThrow(userId)
  const order = await prisma.cargoOrder.findUnique({ where: { id: orderId } })
  if (!order) throw new NotFoundError('Yuk topilmadi')
  if (order.driverId !== driver.id) throw new ForbiddenError('Bu yuk sizga tegishli emas')
  if (order.status !== 'CLAIMED') throw new ConflictError('Bu yuk hali band qilinmagan')

  return prisma.cargoOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', cancelReason: reason },
    include: CARGO_INCLUDE,
  })
}
