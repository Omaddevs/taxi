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

// Landing'dagi Telegram kartalari uchun obunachilar soni. Bot tokeni shart emas: t.me'ning ochiq
// oldindan ko‘rish sahifasidagi "104 745 members, 102 online" / "10 418 subscribers" qatoridan
// o‘qiladi. 10 daqiqa keshlanadi; Telegram javob bermasa oxirgi ma'lum qiymat qaytadi.
const TG_HANDLES = [
  'taxiline_uzbekistan',
  'namangan_toshkent_taxiline',
  'samarqand_toshkent_taxiline',
  'andijon_toshkent_taxiline',
  'toshkent_andijon_taxiline',
  'fargona_toshkent_taxiline',
]
const TG_TTL_MS = 10 * 60_000
type TgCount = { members: number | null; online: number | null }
let tgCache: { at: number; data: Record<string, TgCount> } | null = null
let tgPending: Promise<Record<string, TgCount>> | null = null

const toInt = (s?: string) => (s ? Number(s.replace(/[^\d]/g, '')) || null : null)

async function fetchTg(handle: string, prev?: TgCount): Promise<TgCount> {
  try {
    const res = await fetch(`https://t.me/${handle}`, { signal: AbortSignal.timeout(6000) })
    const html = await res.text()
    const extra = html.match(/tgme_page_extra">([^<]*)/)?.[1] ?? ''
    const members = toInt(extra.match(/([\d\s ,.]+)\s*(?:members|subscribers)/)?.[1])
    const online = toInt(extra.match(/([\d\s ,.]+)\s*online/)?.[1])
    return members ? { members, online } : (prev ?? { members: null, online: null })
  } catch {
    return prev ?? { members: null, online: null }
  }
}

async function computeTg() {
  const prev = tgCache?.data ?? {}
  const rows = await Promise.all(TG_HANDLES.map(async (h) => [h, await fetchTg(h, prev[h])] as const))
  return Object.fromEntries(rows)
}

publicStatsRouter.get(
  '/telegram',
  asyncRoute(async (_req: Request, res: Response) => {
    if (!tgCache || Date.now() - tgCache.at > TG_TTL_MS) {
      tgPending ??= computeTg().finally(() => (tgPending = null))
      tgCache = { at: Date.now(), data: await tgPending }
    }
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(tgCache.data)
  }),
)
