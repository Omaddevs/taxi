import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { getIo } from '../../lib/socket.js'
import { SOCKET_EVENTS, bookingRoom, driverRoom } from '../../realtime/events.js'
import { createNotification } from '../notifications/notifications.service.js'

const BOOKING_INCLUDE = {
  rideOffer: {
    include: { driver: { include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } } }, service: true },
  },
  rider: { select: { id: true, name: true, phone: true, avatarUrl: true } },
} as const

type BookingWithRelations = Awaited<ReturnType<typeof getBookingOrThrow>>

async function getBookingOrThrow(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE })
  if (!booking) throw new NotFoundError('Bron topilmadi')
  return booking
}

function assertParticipant(booking: BookingWithRelations, userId: string) {
  const isRider = booking.riderId === userId
  const isDriver = booking.rideOffer.driver.userId === userId
  if (!isRider && !isDriver) throw new ForbiddenError('Bu bron sizga tegishli emas')
  return { isRider, isDriver }
}

function assertOwnsOffer(booking: BookingWithRelations, userId: string) {
  if (booking.rideOffer.driver.userId !== userId) throw new ForbiddenError('Bu reys sizga tegishli emas')
}

function emitBookingStatus(booking: { id: string; status: string }) {
  try {
    getIo().to(bookingRoom(booking.id)).emit(SOCKET_EVENTS.BOOKING_STATUS, { bookingId: booking.id, status: booking.status })
  } catch {
    // Socket.io not initialized (e.g. in a non-HTTP context) — safe to skip.
  }
}

export async function createBooking(riderId: string, data: { rideOfferId: string; seatsBooked: number; luggage: number }) {
  const offer = await prisma.rideOffer.findUnique({ where: { id: data.rideOfferId }, include: { driver: true } })
  if (!offer) throw new NotFoundError('Reys topilmadi')
  if (offer.status !== 'ACTIVE') throw new ConflictError('Bu reys uchun endi joy band qilib bo‘lmaydi')
  if (offer.driver.userId === riderId) throw new ForbiddenError('O‘z reysingizga bron qila olmaysiz')
  if (offer.seatsAvailable < data.seatsBooked) throw new ConflictError('Yetarli bo‘sh joy yo‘q')
  if (data.luggage > offer.luggageCapacity) throw new ValidationError('Yuk sig‘imi yetarli emas')

  const booking = await prisma.booking.create({
    data: {
      riderId,
      rideOfferId: offer.id,
      seatsBooked: data.seatsBooked,
      luggage: data.luggage,
      totalPrice: data.seatsBooked * offer.pricePerSeat,
      fromLabel: offer.fromLabel,
      toLabel: offer.toLabel,
      fromAddress: offer.fromAddress,
      toAddress: offer.toAddress,
      departAt: offer.departAt,
    },
    include: BOOKING_INCLUDE,
  })

  try {
    getIo().to(driverRoom(offer.driverId)).emit(SOCKET_EVENTS.DRIVER_ORDER_NEW, booking)
  } catch {
    // Socket.io not initialized — safe to skip (e.g. scripts/tests).
  }

  await createNotification(
    offer.driver.userId,
    'BOOKING',
    'Yangi bron so‘rovi',
    `${booking.fromLabel} → ${booking.toLabel} reysiga ${data.seatsBooked} o‘rindiqqa bron so‘rovi keldi`,
  )

  return booking
}

export async function getBooking(id: string, userId: string, role: string) {
  const booking = await getBookingOrThrow(id)
  if (role !== 'ADMIN') assertParticipant(booking, userId)
  return booking
}

type BookingStatus = 'PENDING' | 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'

export async function listBookings(userId: string, filter: { status?: BookingStatus; role: 'rider' | 'driver' }) {
  const statusFilter = filter.status ? { status: filter.status } : {}

  if (filter.role === 'driver') {
    const driver = await prisma.driver.findUnique({ where: { userId } })
    if (!driver) return []
    return prisma.booking.findMany({
      where: { rideOffer: { driverId: driver.id }, ...statusFilter },
      orderBy: { createdAt: 'desc' },
      include: BOOKING_INCLUDE,
    })
  }

  return prisma.booking.findMany({
    where: { riderId: userId, ...statusFilter },
    orderBy: { createdAt: 'desc' },
    include: BOOKING_INCLUDE,
  })
}

export async function listAllBookingsAdmin(status?: BookingStatus) {
  return prisma.booking.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: BOOKING_INCLUDE,
  })
}

export async function acceptBooking(bookingId: string, driverUserId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertOwnsOffer(booking, driverUserId)
  if (booking.status !== 'PENDING') throw new ConflictError('Bron allaqachon ko‘rib chiqilgan')

  const offer = await prisma.rideOffer.findUnique({ where: { id: booking.rideOfferId } })
  if (!offer || offer.seatsAvailable < booking.seatsBooked) {
    throw new ConflictError('Bu bron uchun endi joy yetarli emas')
  }

  const [a, b] = [booking.riderId, driverUserId].sort()

  const updated = await prisma.$transaction(async (tx) => {
    const remainingSeats = offer.seatsAvailable - booking.seatsBooked
    await tx.rideOffer.update({
      where: { id: offer.id },
      data: { seatsAvailable: remainingSeats, status: remainingSeats === 0 ? 'FULL' : 'ACTIVE' },
    })

    const conversation = await tx.conversation.upsert({
      where: { participantAId_participantBId: { participantAId: a, participantBId: b } },
      update: {},
      create: { participantAId: a, participantBId: b },
    })

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'ACCEPTED', conversationId: conversation.id },
      include: BOOKING_INCLUDE,
    })
  })

  emitBookingStatus(updated)
  await createNotification(
    booking.riderId,
    'BOOKING',
    'Bron qabul qilindi',
    `${booking.fromLabel} → ${booking.toLabel} reysiga bronigiz haydovchi tomonidan qabul qilindi`,
  )
  return updated
}

export async function rejectBooking(bookingId: string, driverUserId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertOwnsOffer(booking, driverUserId)
  if (booking.status !== 'PENDING') throw new ConflictError('Bron allaqachon ko‘rib chiqilgan')

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED', cancelledBy: driverUserId, cancelReason: 'Haydovchi tomonidan rad etildi' },
    include: BOOKING_INCLUDE,
  })

  emitBookingStatus(updated)
  await createNotification(
    booking.riderId,
    'BOOKING',
    'Bron rad etildi',
    `${booking.fromLabel} → ${booking.toLabel} reysiga bronigiz haydovchi tomonidan rad etildi`,
  )
  return updated
}

export async function startBooking(bookingId: string, driverUserId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertOwnsOffer(booking, driverUserId)
  if (booking.status !== 'ACCEPTED') throw new ConflictError('Safarni faqat qabul qilingandan so‘ng boshlash mumkin')

  const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: 'ONGOING' }, include: BOOKING_INCLUDE })
  emitBookingStatus(updated)
  await createNotification(
    booking.riderId,
    'BOOKING',
    'Safar boshlandi',
    `${booking.fromLabel} → ${booking.toLabel} safaringiz boshlandi`,
  )
  return updated
}

export async function completeBooking(bookingId: string, driverUserId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertOwnsOffer(booking, driverUserId)
  if (booking.status !== 'ONGOING') throw new ConflictError('Safar hali boshlanmagan')

  // Payment settlement (crediting the driver, charging the rider) happens via
  // the separate /payments/charge flow (M6) — completion here only advances
  // booking + driver-stat state.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.driver.update({ where: { id: booking.rideOffer.driverId }, data: { tripsCount: { increment: 1 } } })
    return tx.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' }, include: BOOKING_INCLUDE })
  })

  emitBookingStatus(updated)
  await createNotification(
    booking.riderId,
    'BOOKING',
    'Safar yakunlandi',
    `${booking.fromLabel} → ${booking.toLabel} safaringiz muvaffaqiyatli yakunlandi`,
  )
  return updated
}

export async function cancelBooking(bookingId: string, userId: string, reason: string) {
  const booking = await getBookingOrThrow(bookingId)
  const { isRider } = assertParticipant(booking, userId)
  if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
    throw new ConflictError('Bu bosqichdagi bronni bekor qilib bo‘lmaydi')
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (booking.status === 'ACCEPTED') {
      const offer = await tx.rideOffer.findUnique({ where: { id: booking.rideOfferId } })
      if (offer) {
        await tx.rideOffer.update({
          where: { id: offer.id },
          data: { seatsAvailable: offer.seatsAvailable + booking.seatsBooked, status: 'ACTIVE' },
        })
      }
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledBy: userId, cancelReason: reason },
      include: BOOKING_INCLUDE,
    })
  })

  emitBookingStatus(updated)
  const notifyUserId = isRider ? booking.rideOffer.driver.userId : booking.riderId
  await createNotification(
    notifyUserId,
    'BOOKING',
    'Bron bekor qilindi',
    `${booking.fromLabel} → ${booking.toLabel} bron bekor qilindi: ${reason}`,
  )
  return updated
}
