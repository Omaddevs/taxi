import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { getPaymentProvider } from './provider.js'
import { env } from '../../config/env.js'

export async function chargeForBooking(userId: string, bookingId: string, methodId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { rideOffer: { include: { driver: true } } },
  })
  if (!booking) throw new NotFoundError('Bron topilmadi')
  if (booking.riderId !== userId) throw new ForbiddenError('Bu bron sizga tegishli emas')
  if (!['ACCEPTED', 'ONGOING', 'COMPLETED'].includes(booking.status)) {
    throw new ConflictError('Bu bron hali to‘lov uchun tayyor emas')
  }

  const alreadyPaid = await prisma.transaction.findFirst({
    where: { bookingId, type: 'RIDE_PAYMENT', status: 'SUCCESS' },
  })
  if (alreadyPaid) throw new ConflictError('Bu bron uchun to‘lov allaqachon amalga oshirilgan')

  const amount = booking.totalPrice
  const driverUserId = booking.rideOffer.driver.userId

  if (methodId === 'wallet') {
    const rider = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
    if (!rider || rider.balance < amount) throw new ValidationError('Hisobingizda mablag‘ yetarli emas')

    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } })
      await tx.user.update({ where: { id: driverUserId }, data: { balance: { increment: amount } } })
      const riderTx = await tx.transaction.create({
        data: {
          userId,
          bookingId,
          type: 'RIDE_PAYMENT',
          status: 'SUCCESS',
          amount: -amount,
          title: `Safar uchun to‘lov: ${booking.fromLabel} → ${booking.toLabel}`,
          routeLabel: `${booking.fromLabel} → ${booking.toLabel}`,
          provider: 'wallet',
        },
      })
      await tx.transaction.create({
        data: {
          userId: driverUserId,
          bookingId,
          type: 'PAYOUT',
          status: 'SUCCESS',
          amount,
          title: `Safar daromadi: ${booking.fromLabel} → ${booking.toLabel}`,
          routeLabel: `${booking.fromLabel} → ${booking.toLabel}`,
          provider: 'wallet',
        },
      })
      return riderTx
    })
  }

  const provider = getPaymentProvider()
  const result = await provider.charge({ userId, amount, methodId, bookingId })

  if (!result.success) {
    await prisma.transaction.create({
      data: {
        userId,
        bookingId,
        type: 'RIDE_PAYMENT',
        status: 'FAILED',
        amount: -amount,
        title: `Safar uchun to‘lov: ${booking.fromLabel} → ${booking.toLabel}`,
        provider: methodId === 'cash' ? 'cash' : env.PAYMENT_PROVIDER,
      },
    })
    throw new ValidationError('To‘lov amalga oshmadi')
  }

  const [riderTx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        bookingId,
        type: 'RIDE_PAYMENT',
        status: 'SUCCESS',
        amount: -amount,
        title: `Safar uchun to‘lov: ${booking.fromLabel} → ${booking.toLabel}`,
        routeLabel: `${booking.fromLabel} → ${booking.toLabel}`,
        provider: methodId === 'cash' ? 'cash' : env.PAYMENT_PROVIDER,
        providerRef: result.providerRef,
      },
    }),
    prisma.transaction.create({
      data: {
        userId: driverUserId,
        bookingId,
        type: 'PAYOUT',
        status: 'SUCCESS',
        amount,
        title: `Safar daromadi: ${booking.fromLabel} → ${booking.toLabel}`,
        routeLabel: `${booking.fromLabel} → ${booking.toLabel}`,
        provider: methodId === 'cash' ? 'cash' : env.PAYMENT_PROVIDER,
        providerRef: result.providerRef,
      },
    }),
  ])

  return riderTx
}
