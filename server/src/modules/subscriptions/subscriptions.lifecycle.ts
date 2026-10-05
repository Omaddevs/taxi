import { prisma } from '../../lib/prisma.js'
import { createNotification } from '../notifications/notifications.service.js'

// A driver's subscription runs for one month from the day an admin approves them; the website
// warns them REMINDER_DAYS before it ends and again once it has ended. The Telegram side of the
// same reminders is sent by taxiline-bot's own scheduler.
const DEFAULT_PLAN = { id: 'monthly', title: '1 oylik', durationDays: 30, price: 60000, sortOrder: 1 }
const REMINDER_DAYS = 5
const DAY_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 60 * 1000

// The web Notifications page shows an "Admin" contact button for refIds with this prefix.
export const SUBSCRIPTION_REF_PREFIX = 'subscription-'

/** Starts the 1-month subscription from now unless one is already running (approval must not
 * shorten or reset a subscription an admin already renewed). */
export async function startSubscriptionOnApproval(driverId: string) {
  const existing = await prisma.driverSubscription.findUnique({ where: { driverId } })
  if (existing && existing.status === 'ACTIVE' && !existing.cancelledAt && existing.expiresAt.getTime() > Date.now()) {
    return existing
  }

  // Seeded on startup, but a fresh database must not make approval fail.
  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: DEFAULT_PLAN.id },
    update: {},
    create: DEFAULT_PLAN,
  })
  const now = new Date()
  const expiresAt = new Date(now.getTime() + plan.durationDays * DAY_MS)

  return prisma.driverSubscription.upsert({
    where: { driverId },
    update: { planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt, cancelledAt: null, cancelReason: null },
    create: { driverId, planId: plan.id, status: 'ACTIVE', startedAt: now, expiresAt },
  })
}

function formatDate(date: Date) {
  // Tashkent is UTC+5 with no DST.
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000)
  const dd = String(local.getUTCDate()).padStart(2, '0')
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${local.getUTCFullYear()}`
}

// One notification per subscription period: the refId embeds expiresAt, so a renewal (new
// expiresAt) gets its own reminder while repeated sweeps of the same period are no-ops.
async function notifyOnce(userId: string, refId: string, title: string, text: string) {
  const exists = await prisma.notification.findFirst({ where: { userId, refId }, select: { id: true } })
  if (exists) return false
  await createNotification(userId, 'SYSTEM', title, text, refId)
  return true
}

export async function sweepSubscriptions(): Promise<void> {
  const now = Date.now()
  const subscriptions = await prisma.driverSubscription.findMany({
    where: {
      status: 'ACTIVE',
      cancelledAt: null,
      expiresAt: { lte: new Date(now + REMINDER_DAYS * DAY_MS) },
      driver: { archivedAt: null },
    },
    select: { id: true, expiresAt: true, driver: { select: { userId: true } } },
  })

  for (const sub of subscriptions) {
    const stamp = sub.expiresAt.getTime()
    if (stamp > now) {
      const days = Math.max(Math.ceil((stamp - now) / DAY_MS), 1)
      await notifyOnce(
        sub.driver.userId,
        `${SUBSCRIPTION_REF_PREFIX}expiring:${sub.id}:${stamp}`,
        'Obunangiz tugayapti',
        `${days} kundan so‘ng obunangiz tugaydi (${formatDate(sub.expiresAt)}). Qayta obuna bo‘lish uchun Adminga murojaat qiling.`,
      )
    } else {
      await notifyOnce(
        sub.driver.userId,
        `${SUBSCRIPTION_REF_PREFIX}expired:${sub.id}:${stamp}`,
        'Obunangiz tugadi',
        'Obunangiz muddati tugadi. Qayta obuna bo‘lish uchun Adminga murojaat qiling.',
      )
      await prisma.driverSubscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } })
    }
  }
}

export function startSubscriptionScheduler(): NodeJS.Timeout {
  const run = () => sweepSubscriptions().catch((err) => console.error('sweepSubscriptions failed:', err))
  run()
  return setInterval(run, SWEEP_INTERVAL_MS)
}
