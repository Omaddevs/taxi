import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'

const OFFER_INCLUDE = {
  driver: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
  service: true,
} as const

async function getOwnedDriverOrThrow(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } })
  if (!driver) throw new ForbiddenError('Siz hali tasdiqlangan haydovchi emassiz')
  if (!driver.approved) throw new ForbiddenError('Haydovchi profilingiz hali tasdiqlanmagan')
  return driver
}

export async function createOffer(
  userId: string,
  data: {
    serviceId: string
    fromLabel: string
    toLabel: string
    fromAddress: string
    toAddress: string
    fromLat?: number
    fromLng?: number
    toLat?: number
    toLng?: number
    departAt: Date
    arriveAt?: Date
    seatsTotal: number
    luggageCapacity: number
    pricePerSeat: number
    genderPref?: string
  },
) {
  const driver = await getOwnedDriverOrThrow(userId)

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
  if (!service || !service.active) throw new NotFoundError('Xizmat turi topilmadi')

  return prisma.rideOffer.create({
    data: {
      ...data,
      driverId: driver.id,
      seatsAvailable: data.seatsTotal,
    },
    include: OFFER_INCLUDE,
  })
}

export async function listMyOffers(userId: string) {
  const driver = await getOwnedDriverOrThrow(userId)
  return prisma.rideOffer.findMany({
    where: { driverId: driver.id },
    orderBy: { departAt: 'desc' },
    include: OFFER_INCLUDE,
  })
}

export async function updateOffer(
  userId: string,
  offerId: string,
  patch: { status?: 'ACTIVE' | 'CLOSED' | 'CANCELLED'; pricePerSeat?: number; departAt?: Date },
) {
  const driver = await getOwnedDriverOrThrow(userId)
  const offer = await prisma.rideOffer.findUnique({ where: { id: offerId } })
  if (!offer) throw new NotFoundError('Reys topilmadi')
  if (offer.driverId !== driver.id) throw new ForbiddenError('Bu reys sizga tegishli emas')

  if (patch.status === 'CANCELLED') {
    const activeBookings = await prisma.booking.count({
      where: { rideOfferId: offerId, status: { in: ['ACCEPTED', 'ONGOING'] } },
    })
    if (activeBookings > 0) {
      throw new ConflictError('Faol bandlar mavjud bo‘lgan reysni bekor qilib bo‘lmaydi')
    }
    await prisma.booking.updateMany({
      where: { rideOfferId: offerId, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelReason: 'Reys haydovchi tomonidan bekor qilindi' },
    })
  }

  if ((patch.pricePerSeat !== undefined || patch.departAt !== undefined) && offer.seatsAvailable !== offer.seatsTotal) {
    throw new ConflictError('Bandlar mavjud reysning narxi yoki vaqtini o‘zgartirib bo‘lmaydi')
  }

  return prisma.rideOffer.update({ where: { id: offerId }, data: patch, include: OFFER_INCLUDE })
}

export async function getOffer(id: string) {
  const offer = await prisma.rideOffer.findUnique({ where: { id }, include: OFFER_INCLUDE })
  if (!offer) throw new NotFoundError('Reys topilmadi')
  return offer
}

export async function searchOffers(filter: {
  fromLabel?: string
  toLabel?: string
  date?: string
  serviceId?: string
  seats?: number
  gender?: string
}) {
  const where: Record<string, unknown> = { status: 'ACTIVE' }

  if (filter.fromLabel) where.fromLabel = { contains: filter.fromLabel, mode: 'insensitive' }
  if (filter.toLabel) where.toLabel = { contains: filter.toLabel, mode: 'insensitive' }
  if (filter.serviceId) where.serviceId = filter.serviceId
  if (filter.seats) where.seatsAvailable = { gte: filter.seats }
  if (filter.gender) where.genderPref = filter.gender

  if (filter.date) {
    const start = new Date(`${filter.date}T00:00:00`)
    const end = new Date(`${filter.date}T23:59:59.999`)
    where.departAt = { gte: start, lte: end }
  }

  return prisma.rideOffer.findMany({ where, orderBy: { departAt: 'asc' }, include: OFFER_INCLUDE })
}

export async function listAllOffersAdmin(status?: 'ACTIVE' | 'FULL' | 'CLOSED' | 'CANCELLED') {
  return prisma.rideOffer.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: OFFER_INCLUDE,
  })
}
