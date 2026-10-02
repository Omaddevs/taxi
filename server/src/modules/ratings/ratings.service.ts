import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/AppError.js'
import type { RatingDirection } from '@prisma/client'

// Single source of truth for the tag chips both the webapp and the bot render — keeps the two
// surfaces from drifting into different wording for the same underlying tag.
export const DRIVER_RATING_TAGS = ['Toza salon', 'Xushmuomala', 'Vaqtida keldi', 'Xavfsiz haydash', 'Yoqimli suhbat']
export const PASSENGER_RATING_TAGS = ['Xushmuomala', 'Vaqtida chiqdi', 'Toza va ozoda']

function round1(n: number) {
  return Math.round(n * 10) / 10
}

// Recomputes the ratee's average from every real Rating row targeting them in this direction —
// never fabricated, always the honest mean of what was actually submitted.
async function recompute(rateeUserId: string, direction: RatingDirection) {
  const agg = await prisma.rating.aggregate({
    where: { rateeUserId, direction },
    _avg: { stars: true },
    _count: true,
  })
  const avg = agg._avg.stars ?? 0
  const count = agg._count

  if (direction === 'PASSENGER_RATES_DRIVER') {
    await prisma.driver.updateMany({ where: { userId: rateeUserId }, data: { ratingAvg: round1(avg), ratingCount: count } })
  } else {
    await prisma.user.update({ where: { id: rateeUserId }, data: { ratingAvg: round1(avg), ratingCount: count } })
  }
}

export async function submitRating(input: {
  tripRef: string
  raterUserId: string
  rateeUserId: string
  direction: RatingDirection
  stars: number
  tags?: string[]
  comment?: string
}) {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    throw new ValidationError('Baho 1 dan 5 gacha bo‘lishi kerak')
  }
  if (input.raterUserId === input.rateeUserId) throw new ValidationError('O‘zingizni baholay olmaysiz')

  await prisma.rating.upsert({
    where: { tripRef_raterUserId: { tripRef: input.tripRef, raterUserId: input.raterUserId } },
    update: { stars: input.stars, tags: input.tags ?? [], comment: input.comment ?? null },
    create: {
      tripRef: input.tripRef,
      direction: input.direction,
      raterUserId: input.raterUserId,
      rateeUserId: input.rateeUserId,
      stars: input.stars,
      tags: input.tags ?? [],
      comment: input.comment ?? null,
    },
  })

  await recompute(input.rateeUserId, input.direction)
}

export async function getMyRatingForTrip(tripRef: string, raterUserId: string) {
  const rating = await prisma.rating.findUnique({
    where: { tripRef_raterUserId: { tripRef, raterUserId } },
  })
  return rating
    ? { rated: true as const, stars: rating.stars, tags: rating.tags, comment: rating.comment }
    : { rated: false as const }
}

export async function getDriverRatingDetail(driverUserId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId: driverUserId } })
  if (!driver) throw new NotFoundError('Haydovchi profili topilmadi')

  const [distributionRows, recent] = await Promise.all([
    prisma.rating.groupBy({
      by: ['stars'],
      where: { rateeUserId: driverUserId, direction: 'PASSENGER_RATES_DRIVER' },
      _count: { _all: true },
    }),
    prisma.rating.findMany({
      where: { rateeUserId: driverUserId, direction: 'PASSENGER_RATES_DRIVER' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { rater: { select: { name: true, avatarUrl: true } } },
    }),
  ])

  const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
  for (const row of distributionRows) distribution[String(row.stars)] = row._count._all

  return {
    avg: driver.ratingAvg,
    count: driver.ratingCount,
    distribution,
    recent: recent.map((r) => ({
      id: r.id,
      stars: r.stars,
      tags: r.tags,
      comment: r.comment,
      createdAt: r.createdAt,
      riderName: r.rater.name,
      riderAvatarUrl: r.rater.avatarUrl,
    })),
  }
}

export async function listAllRatings(direction?: RatingDirection) {
  return prisma.rating.findMany({
    where: direction ? { direction } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      rater: { select: { id: true, name: true, phone: true } },
      ratee: { select: { id: true, name: true, phone: true } },
    },
  })
}
