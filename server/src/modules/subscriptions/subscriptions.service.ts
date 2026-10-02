import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'
import { writeAudit } from '../../lib/audit.js'

export async function listPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function updatePlan(id: string, patch: Partial<{ title: string; price: number; active: boolean }>) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } })
  if (!plan) throw new NotFoundError('Tarif topilmadi')
  return prisma.subscriptionPlan.update({ where: { id }, data: patch })
}

// EXPIRED/CANCELLED are settled by renew/cancel actions, but a plan can also lapse purely by
// time passing with no admin action — so status is recomputed on every read rather than relying
// on a background sweep, since expiry here is informational-only (no enforcement on the driver app).
function withComputedStatus<T extends { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'; expiresAt: Date; cancelledAt: Date | null }>(
  subscription: T,
): T {
  if (subscription.status === 'CANCELLED') return subscription
  if (subscription.expiresAt.getTime() < Date.now()) return { ...subscription, status: 'EXPIRED' }
  return subscription
}

async function getBookingStats(driverId: string) {
  const groups = await prisma.booking.groupBy({
    by: ['status'],
    where: { rideOffer: { driverId } },
    _count: { _all: true },
  })
  const counts: Record<string, number> = {}
  for (const row of groups) counts[row.status] = row._count._all
  return {
    accepted: (counts.ACCEPTED || 0) + (counts.ONGOING || 0) + (counts.COMPLETED || 0),
    cancelled: counts.CANCELLED || 0,
    completed: counts.COMPLETED || 0,
  }
}

export async function getDriverSubscription(driverId: string) {
  const [record, bookingStats] = await Promise.all([
    prisma.driverSubscription.findUnique({
      where: { driverId },
      include: { plan: true, payments: { orderBy: { createdAt: 'desc' }, take: 20 } },
    }),
    getBookingStats(driverId),
  ])

  return {
    subscription: record ? withComputedStatus(record) : null,
    payments: record?.payments ?? [],
    bookingStats,
  }
}

export async function renewSubscription(
  driverId: string,
  staffUserId: string,
  input: { planId: string; amount?: number; method: string; note?: string },
) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId } })
  if (!plan) throw new NotFoundError('Tarif topilmadi')

  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')

  const durationMs = plan.durationDays * 24 * 60 * 60 * 1000

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.driverSubscription.findUnique({ where: { driverId } })
    const extendsFrom =
      existing && existing.status === 'ACTIVE' && existing.cancelledAt === null && existing.expiresAt.getTime() > Date.now()
        ? existing.expiresAt
        : new Date()
    const expiresAt = new Date(extendsFrom.getTime() + durationMs)

    const subscription = await tx.driverSubscription.upsert({
      where: { driverId },
      update: { planId: plan.id, status: 'ACTIVE', expiresAt, cancelledAt: null, cancelReason: null },
      create: { driverId, planId: plan.id, status: 'ACTIVE', expiresAt },
      include: { plan: true },
    })

    const payment = await tx.subscriptionPayment.create({
      data: {
        driverSubscriptionId: subscription.id,
        planTitle: plan.title,
        amount: input.amount ?? plan.price,
        method: input.method,
        note: input.note,
        recordedBy: staffUserId,
      },
    })

    if (driver.archivedAt) {
      await tx.driver.update({ where: { id: driverId }, data: { archivedAt: null, archivedReason: null } })
      await tx.user.update({ where: { id: driver.userId }, data: { role: 'DRIVER' } })
    }

    return { subscription, payment }
  })

  if (driver.archivedAt) {
    await writeAudit({
      actorId: staffUserId,
      action: 'DRIVER_RESTORED',
      targetType: 'Driver',
      targetId: driverId,
      meta: { via: 'subscription_renew' },
    })
  }

  return result
}

export async function cancelSubscription(driverId: string, reason?: string) {
  const existing = await prisma.driverSubscription.findUnique({ where: { driverId } })
  if (!existing) throw new NotFoundError('Obuna topilmadi')

  return prisma.driverSubscription.update({
    where: { driverId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    include: { plan: true },
  })
}
