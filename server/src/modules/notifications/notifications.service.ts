import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import type { NotificationType } from '@prisma/client'

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
}

export async function markRead(userId: string, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) throw new NotFoundError('Bildirishnoma topilmadi')
  if (notification.userId !== userId) throw new ForbiddenError('Bu bildirishnoma sizga tegishli emas')
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
}

// Internal helper used by other modules (bookings, wallet, promo, tickets) to create
// notifications as a side effect of their own state transitions.
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  text: string,
  refId?: string,
) {
  return prisma.notification.create({ data: { userId, type, title, text, refId } })
}

export async function broadcast(data: {
  title: string
  text: string
  type: NotificationType
  role?: 'PASSENGER' | 'DRIVER' | 'ADMIN'
}) {
  const users = await prisma.user.findMany({
    where: data.role ? { role: data.role } : undefined,
    select: { id: true },
  })

  if (users.length === 0) return { sent: 0 }

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: data.type,
      title: data.title,
      text: data.text,
    })),
  })

  return { sent: users.length }
}
