import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'

export async function listFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      rideOffer: {
        include: { driver: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }, service: true },
      },
    },
  })
  return favorites.map((f) => f.rideOffer).filter((o) => !o.deletedAt)
}

export async function addFavorite(userId: string, rideOfferId: string) {
  const offer = await prisma.rideOffer.findUnique({ where: { id: rideOfferId } })
  if (!offer || offer.deletedAt) throw new NotFoundError('Reys topilmadi')

  return prisma.favorite.upsert({
    where: { userId_rideOfferId: { userId, rideOfferId } },
    update: {},
    create: { userId, rideOfferId },
  })
}

export async function removeFavorite(userId: string, rideOfferId: string) {
  await prisma.favorite.deleteMany({ where: { userId, rideOfferId } })
}
