import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js'
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
