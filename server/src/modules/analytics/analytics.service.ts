import { prisma } from '../../lib/prisma.js'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const RECENT_BOOKING_INCLUDE = {
  rider: { select: { id: true, name: true, phone: true } },
  rideOffer: {
    include: {
      driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      service: { select: { id: true, title: true } },
    },
  },
} as const

export async function getSummary(range: { from?: Date; to?: Date }) {
  const from = range.from ?? startOfToday()
  const to = range.to ?? new Date()
  const createdAt = { gte: from, lte: to }

  const seriesFrom = startOfToday()
  seriesFrom.setDate(seriesFrom.getDate() - 6)

  const [
    bookingsCount,
    completedCount,
    revenueAgg,
    activeDrivers,
    usersCount,
    driversCount,
    pendingApplications,
    telegramLinkedCount,
    statusGroups,
    rangeBookings,
    seriesBookings,
    seriesPayments,
    recentBookings,
    recentApplications,
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt } }),
    prisma.booking.count({ where: { createdAt, status: 'COMPLETED' } }),
    prisma.transaction.aggregate({
      where: { createdAt, type: 'RIDE_PAYMENT', status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.driver.count({ where: { online: true } }),
    prisma.user.count(),
    prisma.driver.count(),
    prisma.driverApplication.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { telegramId: { not: null } } }),
    prisma.booking.groupBy({
      by: ['status'],
      where: { createdAt },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { createdAt },
      select: { fromLabel: true, toLabel: true },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: seriesFrom, lte: to } },
      select: { createdAt: true, status: true },
    }),
    prisma.transaction.findMany({
      where: {
        createdAt: { gte: seriesFrom, lte: to },
        type: 'RIDE_PAYMENT',
        status: 'SUCCESS',
      },
      select: { createdAt: true, amount: true },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: RECENT_BOOKING_INCLUDE,
    }),
    prisma.driverApplication.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { id: true, name: true, phone: true } } },
    }),
  ])

  const bookingsByStatus: Record<string, number> = {
    PENDING: 0,
    ACCEPTED: 0,
    ONGOING: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }
  for (const row of statusGroups) bookingsByStatus[row.status] = row._count._all

  const routeMap = new Map<string, number>()
  for (const b of rangeBookings) {
    const key = `${b.fromLabel} → ${b.toLabel}`
    routeMap.set(key, (routeMap.get(key) || 0) + 1)
  }
  const topRoutes = [...routeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }))

  const series: { date: string; bookings: number; completed: number; revenue: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(seriesFrom)
    d.setDate(seriesFrom.getDate() + i)
    const key = dayKey(d)
    const dayBookings = seriesBookings.filter((b) => dayKey(b.createdAt) === key)
    const dayRev = seriesPayments
      .filter((t) => dayKey(t.createdAt) === key)
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    series.push({
      date: key,
      bookings: dayBookings.length,
      completed: dayBookings.filter((b) => b.status === 'COMPLETED').length,
      revenue: dayRev,
    })
  }

  return {
    range: { from, to },
    bookingsCount,
    completedCount,
    revenue: Math.abs(revenueAgg._sum.amount ?? 0),
    activeDrivers,
    usersCount,
    driversCount,
    pendingApplications,
    telegramLinkedCount,
    bookingsByStatus,
    series,
    topRoutes,
    recentBookings,
    recentApplications,
  }
}

type CancelPerson = { id: string; name: string | null; phone: string | null }

// `cancelledBy` just holds a userId (whoever's PATCH set the booking to CANCELLED) — this infers
// *who* that was by comparing it against the booking's own rider/driver. Holds for the 3 current
// cancel call sites: cancelBooking (rider or driver self-cancel), rejectBooking (driver rejects a
// PENDING request), adminCancelBooking (staff). Anything that matches neither is treated as an
// admin/staff cancellation and excluded — those shouldn't count against a driver or passenger.
// The two rankings are independent (keyed by riderId vs driverId), so the same human could
// legitimately appear in both if they're ever both a passenger and a driver.
export async function getCancellationStats() {
  const cancelled = await prisma.booking.findMany({
    where: { status: 'CANCELLED', cancelledBy: { not: null } },
    select: {
      cancelledBy: true,
      riderId: true,
      rider: { select: { id: true, name: true, phone: true } },
      rideOffer: { select: { driver: { select: { id: true, userId: true, user: { select: { id: true, name: true, phone: true } } } } } },
    },
  })

  const riderCounts = new Map<string, { user: CancelPerson; count: number }>()
  const driverCounts = new Map<string, { user: CancelPerson; count: number }>()

  for (const b of cancelled) {
    if (b.cancelledBy === b.riderId) {
      const cur = riderCounts.get(b.riderId)
      riderCounts.set(b.riderId, { user: b.rider, count: (cur?.count ?? 0) + 1 })
      continue
    }
    const driver = b.rideOffer.driver
    if (b.cancelledBy === driver.userId) {
      const cur = driverCounts.get(driver.id)
      driverCounts.set(driver.id, { user: driver.user, count: (cur?.count ?? 0) + 1 })
    }
  }

  const byCountDesc = (a: { count: number }, b: { count: number }) => b.count - a.count

  return {
    riders: [...riderCounts.values()].sort(byCountDesc).slice(0, 20),
    drivers: [...driverCounts.values()].sort(byCountDesc).slice(0, 20),
  }
}
