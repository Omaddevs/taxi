import { prisma } from '../../lib/prisma.js'
import { createNotification } from '../notifications/notifications.service.js'
import { notifyDriverViaBot } from '../../lib/botNotify.js'

// Webapp bookings have no claim race (the driver is already fixed by the RideOffer they
// posted) — the real risk is a driver going silent. This sweep is a notify-only safety net:
// it warns the rider once per phase and never touches booking/offer state itself.
const PENDING_TIMEOUT_MIN = 10
const START_GRACE_MIN = 15
const SWEEP_INTERVAL_MS = 60_000

const BOOKING_SWEEP_INCLUDE = {
  rider: { select: { name: true, phone: true } },
  rideOffer: { include: { driver: { include: { user: { select: { telegramId: true, language: true } } } } } },
} as const

export async function sweepBookings(): Promise<void> {
  const now = new Date()

  const pendingCutoff = new Date(now.getTime() - PENDING_TIMEOUT_MIN * 60_000)
  const pendingStale = await prisma.booking.findMany({
    where: { status: 'PENDING', createdAt: { lte: pendingCutoff }, pendingWarnedAt: null },
    include: BOOKING_SWEEP_INCLUDE,
  })

  for (const booking of pendingStale) {
    await createNotification(
      booking.riderId,
      'BOOKING',
      'Haydovchi hali javob bermadi',
      `${booking.fromLabel} → ${booking.toLabel} bron so‘rovingizga haydovchi hali javob bermadi. Iltimos biroz kuting yoki boshqa reysni tanlang.`,
    )
    const driverUser = booking.rideOffer.driver.user
    if (driverUser.telegramId) {
      await notifyDriverViaBot({
        telegramId: driverUser.telegramId,
        language: driverUser.language,
        kind: 'pending_timeout',
        riderName: booking.rider.name ?? booking.rider.phone,
        riderPhone: booking.rider.phone,
        fromLabel: booking.fromLabel,
        toLabel: booking.toLabel,
        departAt: booking.departAt.toISOString(),
        bookingId: booking.id,
      })
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { pendingWarnedAt: now } })
  }

  const startCutoff = new Date(now.getTime() - START_GRACE_MIN * 60_000)
  const startStale = await prisma.booking.findMany({
    where: { status: 'ACCEPTED', departAt: { lte: startCutoff }, startWarnedAt: null },
    include: BOOKING_SWEEP_INCLUDE,
  })

  for (const booking of startStale) {
    await createNotification(
      booking.riderId,
      'BOOKING',
      'Haydovchi hali safarni boshlamadi',
      `${booking.fromLabel} → ${booking.toLabel} safaringiz vaqti keldi, lekin haydovchi hali boshlamadi. Iltimos haydovchi bilan bog‘laning.`,
    )
    const driverUser = booking.rideOffer.driver.user
    if (driverUser.telegramId) {
      await notifyDriverViaBot({
        telegramId: driverUser.telegramId,
        language: driverUser.language,
        kind: 'start_timeout',
        riderName: booking.rider.name ?? booking.rider.phone,
        riderPhone: booking.rider.phone,
        fromLabel: booking.fromLabel,
        toLabel: booking.toLabel,
        departAt: booking.departAt.toISOString(),
        bookingId: booking.id,
      })
    }
    await prisma.booking.update({ where: { id: booking.id }, data: { startWarnedAt: now } })
  }
}

export function startBookingScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    sweepBookings().catch((err) => console.error('sweepBookings failed:', err))
  }, SWEEP_INTERVAL_MS)
}
