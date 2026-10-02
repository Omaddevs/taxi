import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { getPaymentProvider } from '../payments/provider.js'
import { env } from '../../config/env.js'
import { createNotification } from '../notifications/notifications.service.js'
import { formatSom } from '../../lib/format.js'

export async function getWallet(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
  if (!user) throw new NotFoundError('User not found')

  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return { balance: user.balance, recentTransactions }
}

export async function listTransactions(userId: string, cursor?: string, limit = 30) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })
}

export async function topup(userId: string, amount: number, methodId: string) {
  const provider = getPaymentProvider()
  const result = await provider.charge({ userId, amount, methodId })

  if (!result.success) {
    return prisma.transaction.create({
      data: {
        userId,
        type: 'TOPUP',
        status: 'FAILED',
        amount,
        title: 'Hisobni to‘ldirish',
        provider: env.PAYMENT_PROVIDER,
      },
    })
  }

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        type: 'TOPUP',
        status: 'SUCCESS',
        amount,
        title: 'Hisobni to‘ldirish',
        provider: env.PAYMENT_PROVIDER,
        providerRef: result.providerRef,
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount } } }),
  ])

  await createNotification(userId, 'WALLET', 'Hisob to‘ldirildi', `Hisobingiz ${formatSom(amount)}ga to‘ldirildi`)

  return transaction
}

export async function payout(userId: string, amount: number, cardId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
  if (!user) throw new NotFoundError('User not found')
  if (user.balance < amount) throw new ConflictError('Balans yetarli emas')

  const card = await prisma.paymentCard.findUnique({ where: { id: cardId } })
  if (!card || card.userId !== userId) throw new NotFoundError('Karta topilmadi')

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        type: 'PAYOUT',
        status: 'SUCCESS',
        amount: -amount,
        title: 'Kartaga yechish',
        provider: card.brand,
        providerRef: `****${card.last4}`,
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { balance: { decrement: amount } } }),
  ])

  await createNotification(
    userId,
    'WALLET',
    'Mablag‘ yechildi',
    `${formatSom(amount)} ${card.brand} •••• ${card.last4} kartasiga o‘tkazildi`,
  )

  return transaction
}

export async function listCards(userId: string) {
  return prisma.paymentCard.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
}

export async function addCard(userId: string, data: { providerToken: string; brand: string; last4: string }) {
  const existingCount = await prisma.paymentCard.count({ where: { userId } })
  return prisma.paymentCard.create({ data: { userId, ...data, isDefault: existingCount === 0 } })
}

export async function deleteCard(userId: string, cardId: string) {
  const card = await prisma.paymentCard.findUnique({ where: { id: cardId } })
  if (!card) throw new NotFoundError('Karta topilmadi')
  if (card.userId !== userId) throw new ForbiddenError('Bu karta sizga tegishli emas')
  await prisma.paymentCard.delete({ where: { id: cardId } })
}

export async function listAllTransactions(filter: {
  type?: 'TOPUP' | 'RIDE_PAYMENT' | 'REFUND' | 'PROMO_BONUS' | 'PAYOUT'
  status?: 'PENDING' | 'SUCCESS' | 'FAILED'
  q?: string
}) {
  return prisma.transaction.findMany({
    where: {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { title: { contains: filter.q, mode: 'insensitive' } },
              { user: { phone: { contains: filter.q } } },
              { user: { name: { contains: filter.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, name: true, phone: true } } },
  })
}

export async function adjustBalance(userId: string, amount: number, title: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } })
  if (!user) throw new NotFoundError('User not found')
  if (amount === 0) throw new ConflictError('Summa 0 bo‘lishi mumkin emas')
  if (amount < 0 && user.balance + amount < 0) throw new ConflictError('Balans yetarli emas')

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId,
        type: amount > 0 ? 'TOPUP' : 'PAYOUT',
        status: 'SUCCESS',
        amount,
        title,
        provider: 'admin',
      },
    }),
    prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount } } }),
  ])

  await createNotification(
    userId,
    'WALLET',
    amount > 0 ? 'Hisob to‘ldirildi' : 'Mablag‘ yechildi',
    `${title}: ${formatSom(Math.abs(amount))}`,
  )

  return transaction
}
