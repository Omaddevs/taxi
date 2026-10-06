import { Router, type Request, type Response } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { prisma } from '../../lib/prisma.js'

// Landing'dagi "Butun O‘zbekiston bo‘ylab" bo‘limi uchun ochiq statistika. Raqamlar bazadan
// hisoblanadi va 60 soniya keshlanadi (har bir sahifa ochilishida bazaga urilmaslik uchun).
const REGIONS_SERVED = 14 // 12 viloyat + Qoraqalpog‘iston + Toshkent shahri
const TTL_MS = 60_000

type Stats = { regions: number; users: number; drivers: number; happyClients: number; avgRating: number | null; updatedAt: string }
let cache: { at: number; data: Stats } | null = null

async function compute(): Promise<Stats> {
  const [users, drivers, happy, avg] = await Promise.all([
    prisma.user.count({ where: { staffKind: null } }),
    prisma.driver.count({ where: { approved: true } }),
    prisma.rating.findMany({
      where: { direction: 'PASSENGER_RATES_DRIVER', stars: { gte: 4 } },
      distinct: ['raterUserId'],
      select: { raterUserId: true },
    }),
    prisma.rating.aggregate({ where: { direction: 'PASSENGER_RATES_DRIVER' }, _avg: { stars: true } }),
  ])
  return {
    regions: REGIONS_SERVED,
    users,
    drivers,
    happyClients: happy.length,
    avgRating: avg._avg.stars ? Math.round(avg._avg.stars * 10) / 10 : null,
    updatedAt: new Date().toISOString(),
  }
}

export const publicStatsRouter = Router()

publicStatsRouter.get(
  '/',
  asyncRoute(async (_req: Request, res: Response) => {
    if (!cache || Date.now() - cache.at > TTL_MS) cache = { at: Date.now(), data: await compute() }
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json(cache.data)
  }),
)
