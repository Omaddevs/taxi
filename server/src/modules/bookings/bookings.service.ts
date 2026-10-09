import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { requireUserPhone } from '../../lib/phoneGate.js'
import { getIo } from '../../lib/socket.js'
import { SOCKET_EVENTS, bookingRoom, driverRoom } from '../../realtime/events.js'
import { createNotification } from '../notifications/notifications.service.js'
import { notifyDriverViaBot } from '../../lib/botNotify.js'
import * as ratingsService from '../ratings/ratings.service.js'
import type { Prisma, RatingDirection } from '@prisma/client'

const BOOKING_INCLUDE = {
  rideOffer: {
    include: { driver: { include: { user: { select: { id: true, name: true, phone: true, avatarUrl: true } } } }, service: true },
  },
  rider: { select: { id: true, name: true, phone: true, avatarUrl: true } },
  promoCode: { select: { id: true, code: true, title: true } },
  seats: { include: { offerSeat: true } },
} as const

const SEAT_POSITION_LABEL: Record<string, string> = {
  FRONT: 'Old o‘rindiq',
  REAR_LEFT: 'Orqa chap',
  REAR_MIDDLE: 'Orqa o‘rta',
  REAR_RIGHT: 'Orqa o‘ng',
}

const GENDER_LABEL: Record<string, string> = { MALE: 'erkak', FEMALE: 'ayol' }

function summarizeSeats(seats: { gender: string; offerSeat: { position: string } }[]) {
  return seats
    .map((s) => `${SEAT_POSITION_LABEL[s.offerSeat.position] ?? s.offerSeat.position} (${GENDER_LABEL[s.gender] ?? s.gender})`)
    .join(', ')
}

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

// Frees a booking's held seats (RESERVED from a PENDING request, or BOOKED after acceptance)
// back to AVAILABLE and restores the offer's seat count — shared by reject/cancel, which can
// each hit a booking in either state.
async function releaseBookingSeats(
  tx: Prisma.TransactionClient,
  booking: { rideOfferId: string; seatsBooked: number; seats: { offerSeatId: string }[] },
) {
  if (booking.seats.length === 0) return
  await tx.offerSeat.updateMany({
    where: { id: { in: booking.seats.map((s) => s.offerSeatId) } },
    data: { status: 'AVAILABLE', gender: null },
  })
  const offer = await tx.rideOffer.findUnique({ where: { id: booking.rideOfferId } })
  if (offer) {
    await tx.rideOffer.update({
      where: { id: offer.id },
      data: { seatsAvailable: offer.seatsAvailable + booking.seatsBooked, status: 'ACTIVE' },
    })
  }
}

function emitBookingStatus(booking: { id: string; status: string }) {
  try {
    getIo().to(bookingRoom(booking.id)).emit(SOCKET_EVENTS.BOOKING_STATUS, { bookingId: booking.id, status: booking.status })
  } catch {
    // Socket.io not initialized (e.g. in a non-HTTP context) — safe to skip.
  }
}

export async function createBooking(
  riderId: string,
  data: { rideOfferId: string; seats: { offerSeatId: string; gender: 'MALE' | 'FEMALE' }[]; luggage: number },
) {
  // The driver calls the passenger on this number.
  await requireUserPhone(riderId)
  const offer = await prisma.rideOffer.findUnique({
    where: { id: data.rideOfferId },
    include: { driver: { include: { user: { select: { telegramId: true, language: true } } } }, seats: true },
  })
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')
  if (offer.status !== 'ACTIVE') throw new ConflictError('Bu reys uchun endi joy band qilib bo‘lmaydi')
  if (offer.driver.userId === riderId) throw new ForbiddenError('O‘z reysingizga bron qila olmaysiz')
  if (data.luggage > offer.luggageCapacity) throw new ValidationError('Yuk sig‘imi yetarli emas')

  const seatIds = data.seats.map((s) => s.offerSeatId)
  if (new Set(seatIds).size !== seatIds.length) throw new ValidationError('Bir xil o‘rindiq ikki marta tanlangan')

  const offerSeatById = new Map(offer.seats.map((s) => [s.id, s]))
  for (const seat of data.seats) {
    const offerSeat = offerSeatById.get(seat.offerSeatId)
    if (!offerSeat) throw new NotFoundError('O‘rindiq topilmadi')
    if (offerSeat.status !== 'AVAILABLE') throw new ConflictError('Tanlangan o‘rindiq allaqachon band')
  }

  const totalPrice = data.seats.length * offer.pricePerSeat

  const booking = await prisma.$transaction(async (tx) => {
    // Re-check availability inside the transaction so a concurrent booking on the same
    // seat(s) loses the race instead of double-booking it.
    for (const seat of data.seats) {
      const claimed = await tx.offerSeat.updateMany({
        where: { id: seat.offerSeatId, status: 'AVAILABLE' },
        data: { status: 'RESERVED', gender: seat.gender },
      })
      if (claimed.count === 0) throw new ConflictError('Tanlangan o‘rindiq allaqachon band')
    }

    // Recount from within the transaction (after this request's own seats were just claimed
    // above) rather than the pre-transaction snapshot, so a concurrent booking on a different
    // seat of the same offer can't produce a stale seatsAvailable via a lost update.
    const remainingSeats = await tx.offerSeat.count({ where: { rideOfferId: offer.id, status: 'AVAILABLE' } })
    await tx.rideOffer.update({
      where: { id: offer.id },
      data: { seatsAvailable: remainingSeats, status: remainingSeats === 0 ? 'FULL' : 'ACTIVE' },
    })

    return tx.booking.create({
      data: {
        riderId,
        rideOfferId: offer.id,
        seatsBooked: data.seats.length,
        luggage: data.luggage,
        totalPrice,
        fromLabel: offer.fromLabel,
        toLabel: offer.toLabel,
        fromAddress: offer.fromAddress,
        toAddress: offer.toAddress,
        departAt: offer.departAt,
        seats: { create: data.seats.map((s) => ({ offerSeatId: s.offerSeatId, gender: s.gender })) },
      },
      include: BOOKING_INCLUDE,
    })
  })

  try {
    getIo().to(driverRoom(offer.driverId)).emit(SOCKET_EVENTS.DRIVER_ORDER_NEW, booking)
  } catch {
    // Socket.io not initialized — safe to skip (e.g. scripts/tests).
  }

  const seatsSummary = summarizeSeats(booking.seats)

  await createNotification(
    offer.driver.userId,
    'BOOKING',
    'Yangi bron so‘rovi',
    `${booking.fromLabel} → ${booking.toLabel} reysiga bron so‘rovi keldi: ${seatsSummary}`,
  )

  if (offer.driver.user.telegramId) {
    await notifyDriverViaBot({
      telegramId: offer.driver.user.telegramId,
      language: offer.driver.user.language,
      kind: 'new',
      riderName: booking.rider.name ?? booking.rider.phone ?? 'Yo‘lovchi',
      riderPhone: booking.rider.phone ?? '',
      fromLabel: booking.fromLabel,
      toLabel: booking.toLabel,
      departAt: booking.departAt.toISOString(),
      bookingId: booking.id,
      seatsSummary,
    })
  }

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

export async function listAllBookingsAdmin(filter: { status?: BookingStatus; q?: string }) {
  return prisma.booking.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { fromLabel: { contains: filter.q, mode: 'insensitive' } },
              { toLabel: { contains: filter.q, mode: 'insensitive' } },
              { rider: { phone: { contains: filter.q } } },
              { rider: { name: { contains: filter.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: BOOKING_INCLUDE,
  })
}

export async function acceptBooking(bookingId: string, driverUserId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertOwnsOffer(booking, driverUserId)
  if (booking.status !== 'PENDING') throw new ConflictError('Bron allaqachon ko‘rib chiqilgan')

  const [a, b] = [booking.riderId, driverUserId].sort()

  const updated = await prisma.$transaction(async (tx) => {
    // Seats were already moved out of AVAILABLE (into RESERVED) when the booking was
    // created, so offer.seatsAvailable needs no further change here — just promote this
    // booking's own seats to BOOKED.
    await tx.offerSeat.updateMany({
      where: { id: { in: booking.seats.map((s) => s.offerSeatId) } },
      data: { status: 'BOOKED' },
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

  const updated = await prisma.$transaction(async (tx) => {
    await releaseBookingSeats(tx, booking)
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledBy: driverUserId, cancelReason: 'Haydovchi tomonidan rad etildi' },
      include: BOOKING_INCLUDE,
    })
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
    await releaseBookingSeats(tx, booking)
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

export async function adminCancelBooking(bookingId: string, adminUserId: string, reason: string) {
  const booking = await getBookingOrThrow(bookingId)
  if (!['PENDING', 'ACCEPTED', 'ONGOING'].includes(booking.status)) {
    throw new ConflictError('Bu bosqichdagi bronni bekor qilib bo‘lmaydi')
  }

  const updated = await prisma.$transaction(async (tx) => {
    await releaseBookingSeats(tx, booking)
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledBy: adminUserId, cancelReason: reason },
      include: BOOKING_INCLUDE,
    })
  })

  emitBookingStatus(updated)
  await Promise.all([
    createNotification(
      booking.riderId,
      'BOOKING',
      'Bron bekor qilindi',
      `${booking.fromLabel} → ${booking.toLabel} bron admin tomonidan bekor qilindi: ${reason}`,
    ),
    createNotification(
      booking.rideOffer.driver.userId,
      'BOOKING',
      'Bron bekor qilindi',
      `${booking.fromLabel} → ${booking.toLabel} bron admin tomonidan bekor qilindi: ${reason}`,
    ),
  ])
  return updated
}

function tripRefFor(bookingId: string) {
  return `booking:${bookingId}`
}

export async function getBookingRatingStatus(bookingId: string, userId: string) {
  const booking = await getBookingOrThrow(bookingId)
  assertParticipant(booking, userId)
  return ratingsService.getMyRatingForTrip(tripRefFor(bookingId), userId)
}

export async function rateBooking(
  bookingId: string,
  userId: string,
  data: { stars: number; tags?: string[]; comment?: string },
) {
  const booking = await getBookingOrThrow(bookingId)
  const { isRider } = assertParticipant(booking, userId)
  if (booking.status !== 'COMPLETED') throw new ConflictError('Faqat yakunlangan safarni baholash mumkin')

  const rateeUserId = isRider ? booking.rideOffer.driver.userId : booking.riderId
  const direction: RatingDirection = isRider ? 'PASSENGER_RATES_DRIVER' : 'DRIVER_RATES_PASSENGER'

  await ratingsService.submitRating({
    tripRef: tripRefFor(bookingId),
    raterUserId: userId,
    rateeUserId,
    direction,
    stars: data.stars,
    tags: data.tags,
    comment: data.comment,
  })
}
