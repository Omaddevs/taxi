import { prisma } from '../../lib/prisma.js'

export async function getSummary(range: { from?: Date; to?: Date }) {
  const from = range.from ?? new Date(new Date().setHours(0, 0, 0, 0))
  const to = range.to ?? new Date()
  const createdAt = { gte: from, lte: to }

  const [bookingsCount, completedCount, revenueAgg, activeDrivers] = await Promise.all([
    prisma.booking.count({ where: { createdAt } }),
    prisma.booking.count({ where: { createdAt, status: 'COMPLETED' } }),
    prisma.transaction.aggregate({
      where: { createdAt, type: 'RIDE_PAYMENT', status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.driver.count({ where: { online: true } }),
  ])

  return {
    range: { from, to },
    bookingsCount,
    completedCount,
    revenue: Math.abs(revenueAgg._sum.amount ?? 0),
    activeDrivers,
  }
}
