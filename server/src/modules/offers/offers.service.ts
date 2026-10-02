import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { notifyGroupOfferPosted } from '../../lib/botNotify.js'
import { writeAudit } from '../../lib/audit.js'
import type { Gender, SeatPosition } from '@prisma/client'

const OFFER_INCLUDE = {
  driver: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } } },
  service: true,
  seats: true,
} as const

// The car layout is always these 4 fixed positions (front + 3 rear) — every RideOffer gets
// exactly one OfferSeat per position, provisioned at creation time.
const SEAT_LAYOUT: SeatPosition[] = ['FRONT', 'REAR_LEFT', 'REAR_MIDDLE', 'REAR_RIGHT']

async function getOwnedDriverOrThrow(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { user: { select: { name: true, phone: true } } },
  })
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
    fromRegion?: string
    toRegion?: string
    departAt: Date
    arriveAt?: Date
    luggageCapacity: number
    pricePerSeat: number
    genderPref?: string
    notes?: string
    contactPhones: string[]
    preOccupiedSeats: { position: SeatPosition; gender: Gender }[]
  },
) {
  const driver = await getOwnedDriverOrThrow(userId)

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } })
  if (!service || !service.active) throw new NotFoundError('Xizmat turi topilmadi')

  // A driver can only have one active (not-yet-full) offer at a time — they must fill it (all
  // 4 seats reserved/booked, which flips it to FULL) or close/cancel it before posting again.
  const activeOffer = await prisma.rideOffer.findFirst({ where: { driverId: driver.id, status: 'ACTIVE' } })
  if (activeOffer) {
    throw new ConflictError('Sizda hali to‘lmagan faol elon bor — yangi elon joylashdan oldin uni to‘ldiring yoki yoping')
  }

  const { preOccupiedSeats, fromRegion, toRegion, ...offerData } = data
  const occupiedByPosition = new Map(preOccupiedSeats.map((s) => [s.position, s.gender]))
  const seatsAvailable = SEAT_LAYOUT.length - occupiedByPosition.size

  const offer = await prisma.rideOffer.create({
    data: {
      ...offerData,
      driverId: driver.id,
      seatsTotal: SEAT_LAYOUT.length,
      seatsAvailable,
      seats: {
        create: SEAT_LAYOUT.map((position) => {
          const gender = occupiedByPosition.get(position)
          return gender
            ? { position, status: 'BOOKED' as const, gender }
            : { position, status: 'AVAILABLE' as const }
        }),
      },
    },
    include: OFFER_INCLUDE,
  })

  await notifyGroupOfferPosted({
    offerId: offer.id,
    fromRegion,
    toRegion,
    fromLabel: offer.fromLabel,
    toLabel: offer.toLabel,
    departAt: offer.departAt.toISOString(),
    pricePerSeat: offer.pricePerSeat,
    seatsTotal: offer.seatsTotal,
    driverName: driver.user.name ?? driver.user.phone,
    driverPhone: driver.user.phone,
    carModel: driver.carModel,
    plate: driver.plate,
  })

  return offer
}

export async function listMyOffers(userId: string) {
  const driver = await getOwnedDriverOrThrow(userId)
  return prisma.rideOffer.findMany({
    where: { driverId: driver.id, deletedAt: null },
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
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')
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

export async function getOffer(id: string, opts?: { includeDeleted?: boolean }) {
  const offer = await prisma.rideOffer.findUnique({ where: { id }, include: OFFER_INCLUDE })
  if (!offer) throw new NotFoundError('Reys topilmadi')
  if (offer.deletedAt && !opts?.includeDeleted) throw new NotFoundError('Reys topilmadi')
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
  const where: Record<string, unknown> = { status: 'ACTIVE', deletedAt: null }

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

export async function listAllOffersAdmin(filter: {
  status?: 'ACTIVE' | 'FULL' | 'CLOSED' | 'CANCELLED'
  q?: string
}) {
  return prisma.rideOffer.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { fromLabel: { contains: filter.q, mode: 'insensitive' } },
              { toLabel: { contains: filter.q, mode: 'insensitive' } },
              { driver: { user: { phone: { contains: filter.q } } } },
              { driver: { user: { name: { contains: filter.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: OFFER_INCLUDE,
  })
}

export async function adminCancelOffer(offerId: string) {
  const offer = await prisma.rideOffer.findUnique({ where: { id: offerId } })
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')
  if (offer.status === 'CANCELLED') throw new ConflictError('Reys allaqachon bekor qilingan')

  const activeBookings = await prisma.booking.count({
    where: { rideOfferId: offerId, status: { in: ['ACCEPTED', 'ONGOING'] } },
  })
  if (activeBookings > 0) {
    throw new ConflictError('Faol bandlar mavjud bo‘lgan reysni bekor qilib bo‘lmaydi')
  }

  await prisma.booking.updateMany({
    where: { rideOfferId: offerId, status: 'PENDING' },
    data: { status: 'CANCELLED', cancelReason: 'Reys admin tomonidan bekor qilindi' },
  })

  return prisma.rideOffer.update({
    where: { id: offerId },
    data: { status: 'CANCELLED' },
    include: OFFER_INCLUDE,
  })
}

export async function adminUpdateOffer(
  actorId: string,
  offerId: string,
  patch: {
    fromLabel?: string
    toLabel?: string
    fromAddress?: string
    toAddress?: string
    fromLat?: number
    fromLng?: number
    toLat?: number
    toLng?: number
    departAt?: Date
    arriveAt?: Date
    luggageCapacity?: number
    pricePerSeat?: number
    genderPref?: string
    notes?: string
    contactPhones?: string[]
  },
) {
  const offer = await prisma.rideOffer.findUnique({ where: { id: offerId } })
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')

  if ((patch.pricePerSeat !== undefined || patch.departAt !== undefined) && offer.seatsAvailable !== offer.seatsTotal) {
    throw new ConflictError('Bandlar mavjud reysning narxi yoki vaqtini o‘zgartirib bo‘lmaydi')
  }

  const updated = await prisma.rideOffer.update({ where: { id: offerId }, data: patch, include: OFFER_INCLUDE })

  await writeAudit({
    actorId,
    action: 'OFFER_UPDATED',
    targetType: 'RideOffer',
    targetId: offerId,
    meta: { patch },
  })

  return updated
}

export async function adminSetOfferStatus(actorId: string, offerId: string, status: 'ACTIVE' | 'CLOSED') {
  const offer = await prisma.rideOffer.findUnique({ where: { id: offerId } })
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')
  if (offer.status === 'CANCELLED') throw new ConflictError('Bekor qilingan reysni nashr qilib bo‘lmaydi')

  const updated = await prisma.rideOffer.update({ where: { id: offerId }, data: { status }, include: OFFER_INCLUDE })

  await writeAudit({
    actorId,
    action: 'OFFER_STATUS_CHANGED',
    targetType: 'RideOffer',
    targetId: offerId,
    meta: { status },
  })

  return updated
}

export async function adminDeleteOffer(actorId: string, offerId: string) {
  const offer = await prisma.rideOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      seats: { select: { id: true } },
      bookings: { select: { id: true } },
    },
  })
  if (!offer) throw new NotFoundError('Reys topilmadi')

  const bookingIds = offer.bookings.map((b) => b.id)
  const seatIds = offer.seats.map((s) => s.id)

  await prisma.$transaction(async (tx) => {
    if (seatIds.length) {
      await tx.bookingSeat.deleteMany({ where: { offerSeatId: { in: seatIds } } })
    }
    if (bookingIds.length) {
      await tx.transaction.updateMany({
        where: { bookingId: { in: bookingIds } },
        data: { bookingId: null },
      })
      await tx.booking.deleteMany({ where: { id: { in: bookingIds } } })
    }
    await tx.rideOffer.delete({ where: { id: offerId } })
  })

  await writeAudit({
    actorId,
    action: 'OFFER_DELETED',
    targetType: 'RideOffer',
    targetId: offerId,
    meta: { hardDeleted: true, bookingsRemoved: bookingIds.length },
  })

  return { hardDeleted: true }
}
