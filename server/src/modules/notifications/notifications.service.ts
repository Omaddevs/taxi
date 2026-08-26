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

// Internal helper used by other modules (bookings, wallet, promo) to create
// notifications as a side effect of their own state transitions.
export async function createNotification(userId: string, type: NotificationType, title: string, text: string) {
  return prisma.notification.create({ data: { userId, type, title, text } })
}
