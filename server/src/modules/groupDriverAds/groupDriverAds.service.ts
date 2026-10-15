import { createHash } from 'node:crypto'
import type { GroupDriverAd, Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import type { ingestGroupAdSchema, listGroupAdsQuerySchema, updateGroupAdSchema } from './groupDriverAds.schema.js'

// "Haydovchilar e’lonlari": drivers' ads from the Telegram groups. The bot sends each one here
// as PENDING; an admin corrects the fields and publishes it, and the site's "Haydovchilar"
// section shows it for LIVE_FOR_MS. Nothing flips the status when that runs out — an ad is
// live while `expiresAt` is ahead, so expiry needs no scheduler.

export const LIVE_FOR_MS = 24 * 60 * 60 * 1000
// A repost by the same driver on the same route within this window joins the first row.
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000

type IngestInput = z.infer<typeof ingestGroupAdSchema>
type UpdateInput = z.infer<typeof updateGroupAdSchema>

const DRIVER_INCLUDE = {
  driver: { select: { id: true, carModel: true, plate: true, user: { select: { name: true, phone: true } } } },
} as const

function norm(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

/** Who + where: the phone when there is one (a driver may post from two accounts, and a group
 * admin posting for several drivers has one account), else the Telegram account, else the text. */
export function dedupeKey(input: { authorTelegramId: string; phones: string[]; text: string; from?: string; to?: string }) {
  const who = input.phones[0]
    ? `ph:${input.phones[0]}`
    : input.authorTelegramId !== '0'
      ? `tg:${input.authorTelegramId}`
      : `tx:${createHash('sha1').update(norm(input.text).replace(/\s+/g, ' ')).digest('hex').slice(0, 16)}`
  return `${who}|${norm(input.from)}>${norm(input.to)}`
}

/** "Ertaga, 07:00" → tomorrow 07:00 Tashkent time; a bare "13:00" already more than an hour
 * gone means tomorrow. No clock time → null (the note is shown as written instead). */
export function departAtFromNote(note: string | undefined, now = new Date()): Date | null {
  const match = note?.match(/(\d{2}):(\d{2})/)
  if (!match) return null
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS)
  const at = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), Number(match[1]), Number(match[2])) - TASHKENT_OFFSET_MS
  const tomorrow = /ertaga/i.test(note ?? '') || (!/bugun/i.test(note ?? '') && at < now.getTime() - 60 * 60 * 1000)
  return new Date(at + (tomorrow ? 24 * 60 * 60 * 1000 : 0))
}

/** The approved site driver behind the ad, matched by Telegram account or phone. */
async function findSiteDriverId(authorTelegramId: string, phones: string[]) {
  const or: Prisma.UserWhereInput[] = []
  if (authorTelegramId !== '0') or.push({ telegramId: authorTelegramId })
  if (phones.length) or.push({ phone: { in: phones } })
  if (!or.length) return null
  const user = await prisma.user.findFirst({
    where: { OR: or, driver: { approved: true, archivedAt: null } },
    select: { driver: { select: { id: true } } },
  })
  return user?.driver?.id ?? null
}

function parsedFields(input: IngestInput) {
  return {
    fromLabel: input.origins[0] ?? null,
    toLabel: input.destinations[0] ?? null,
    departNote: input.departure ?? null,
    departAt: departAtFromNote(input.departure),
    seats: input.seats ?? null,
    carModel: input.car ?? null,
    driverName: input.anonymous ? null : input.authorName,
    phones: input.phones,
    features: input.features,
  }
}

export async function ingest(input: IngestInput) {
  const key = dedupeKey({
    authorTelegramId: input.authorTelegramId,
    phones: input.phones,
    text: input.text,
    from: input.origins[0],
    to: input.destinations[0],
  })
  const source = {
    chatId: input.chatId,
    chatTitle: input.chatTitle ?? null,
    chatUsername: input.chatUsername ?? null,
    messageId: input.messageId ?? null,
  }

  const existing = await prisma.groupDriverAd.findFirst({
    where: { dedupeKey: key, createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    // Still waiting for review: show the admin the latest wording (and, unless they already
    // started correcting it, the latest parse). Published or rejected: just count the repost.
    const refresh =
      existing.status === 'PENDING'
        ? { ...source, rawText: input.text, authorName: input.authorName, ...(existing.editedAt ? {} : parsedFields(input)) }
        : {}
    await prisma.groupDriverAd.update({
      where: { id: existing.id },
      data: { ...refresh, repostCount: { increment: 1 }, lastSeenAt: new Date() },
    })
    return { id: existing.id, duplicate: true }
  }

  const ad = await prisma.groupDriverAd.create({
    data: {
      ...source,
      ...parsedFields(input),
      authorTelegramId: input.authorTelegramId,
      authorName: input.authorName,
      authorUsername: input.authorUsername ?? null,
      rawText: input.text,
      dedupeKey: key,
      driverId: await findSiteDriverId(input.authorTelegramId, input.phones),
    },
    select: { id: true },
  })
  return { id: ad.id, duplicate: false }
}

function isLive(ad: Pick<GroupDriverAd, 'status' | 'expiresAt'>, now = new Date()) {
  return ad.status === 'PUBLISHED' && !!ad.expiresAt && ad.expiresAt > now
}

export async function listAdmin(filter: z.infer<typeof listGroupAdsQuerySchema>) {
  const now = new Date()
  const byStatus: Record<typeof filter.status, Prisma.GroupDriverAdWhereInput> = {
    PENDING: { status: 'PENDING' },
    PUBLISHED: { status: 'PUBLISHED', expiresAt: { gt: now } },
    EXPIRED: { status: 'PUBLISHED', expiresAt: { lte: now } },
    REJECTED: { status: 'REJECTED' },
    ALL: {},
  }
  const where: Prisma.GroupDriverAdWhereInput = { ...byStatus[filter.status] }
  if (filter.q) {
    const contains = { contains: filter.q, mode: 'insensitive' as const }
    where.OR = [
      { rawText: contains },
      { authorName: contains },
      { driverName: contains },
      { fromLabel: contains },
      { toLabel: contains },
      { chatTitle: contains },
      { phones: { has: filter.q.replace(/[^\d+]/g, '') } },
    ]
  }

  const [items, pending, published, expired, rejected] = await Promise.all([
    prisma.groupDriverAd.findMany({
      where,
      orderBy: filter.status === 'PENDING' ? { lastSeenAt: 'desc' } : { updatedAt: 'desc' },
      take: 200,
      include: DRIVER_INCLUDE,
    }),
    prisma.groupDriverAd.count({ where: byStatus.PENDING }),
    prisma.groupDriverAd.count({ where: byStatus.PUBLISHED }),
    prisma.groupDriverAd.count({ where: byStatus.EXPIRED }),
    prisma.groupDriverAd.count({ where: byStatus.REJECTED }),
  ])
  return { items, counts: { pending, published, expired, rejected } }
}

export async function pendingCount() {
  return { pending: await prisma.groupDriverAd.count({ where: { status: 'PENDING' } }) }
}

async function getOrThrow(id: string) {
  const ad = await prisma.groupDriverAd.findUnique({ where: { id } })
  if (!ad) throw new NotFoundError('E’lon topilmadi')
  return ad
}

export async function update(actorId: string, id: string, patch: UpdateInput) {
  await getOrThrow(id)
  const updated = await prisma.groupDriverAd.update({
    where: { id },
    data: { ...patch, editedAt: new Date() },
    include: DRIVER_INCLUDE,
  })
  await writeAudit({ actorId, action: 'GROUP_AD_UPDATED', targetType: 'GroupDriverAd', targetId: id, meta: { patch } })
  return updated
}

/** Saves the admin's last corrections (if any) and puts the ad on the site for 24 hours. */
export async function publish(actorId: string, id: string, patch: UpdateInput) {
  const ad = await getOrThrow(id)
  const next = { ...ad, ...patch }
  if (!next.fromLabel || !next.toLabel) throw new ValidationError('Qayerdan va qayerga — ikkalasini kiriting')
  if (!next.phones.length) throw new ValidationError('Kamida bitta telefon raqam kiriting')

  const now = new Date()
  const updated = await prisma.groupDriverAd.update({
    where: { id },
    data: {
      ...patch,
      ...(Object.keys(patch).length ? { editedAt: now } : {}),
      status: 'PUBLISHED',
      publishedAt: now,
      expiresAt: new Date(now.getTime() + LIVE_FOR_MS),
      reviewedById: actorId,
      rejectReason: null,
    },
    include: DRIVER_INCLUDE,
  })
  await writeAudit({ actorId, action: 'GROUP_AD_PUBLISHED', targetType: 'GroupDriverAd', targetId: id })
  return updated
}

/** Another 24 hours on the site, counted from now — for a live or an expired ad. */
export async function extend(actorId: string, id: string) {
  const ad = await getOrThrow(id)
  if (ad.status !== 'PUBLISHED') throw new ConflictError('Faqat tasdiqlangan e’lonni uzaytirish mumkin')
  const updated = await prisma.groupDriverAd.update({
    where: { id },
    data: { expiresAt: new Date(Date.now() + LIVE_FOR_MS) },
    include: DRIVER_INCLUDE,
  })
  await writeAudit({ actorId, action: 'GROUP_AD_EXTENDED', targetType: 'GroupDriverAd', targetId: id })
  return updated
}

/** Rejects a pending ad, or takes a published one off the site. */
export async function reject(actorId: string, id: string, reason?: string) {
  const ad = await getOrThrow(id)
  const updated = await prisma.groupDriverAd.update({
    where: { id },
    data: { status: 'REJECTED', rejectReason: reason || null, reviewedById: actorId },
    include: DRIVER_INCLUDE,
  })
  await writeAudit({
    actorId,
    action: isLive(ad) ? 'GROUP_AD_UNPUBLISHED' : 'GROUP_AD_REJECTED',
    targetType: 'GroupDriverAd',
    targetId: id,
    meta: reason ? { reason } : undefined,
  })
  return updated
}

export async function remove(actorId: string, id: string) {
  await getOrThrow(id)
  await prisma.groupDriverAd.delete({ where: { id } })
  await writeAudit({ actorId, action: 'GROUP_AD_DELETED', targetType: 'GroupDriverAd', targetId: id })
  return { deleted: true }
}

// ---- Site ("Haydovchilar" board) ----

function tashkentYmd(date: Date) {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10)
}

/** Published, unexpired ads for the board, filtered like the drivers' own offers. An ad without
 * a clock time counts as today's. */
export async function liveForBoard(filter: { from?: string; to?: string; date?: string; q?: string }) {
  const now = new Date()
  const contains = (value: string) => ({ contains: value.trim(), mode: 'insensitive' as const })
  const and: Prisma.GroupDriverAdWhereInput[] = []
  if (filter.from) and.push({ fromLabel: contains(filter.from) })
  if (filter.to) and.push({ toLabel: contains(filter.to) })
  if (filter.q) {
    and.push({
      OR: [
        { fromLabel: contains(filter.q) },
        { toLabel: contains(filter.q) },
        { carModel: contains(filter.q) },
        { driverName: contains(filter.q) },
      ],
    })
  }
  if (filter.date) {
    const dayStart = new Date(`${filter.date}T00:00:00+05:00`)
    const dayEnd = new Date(`${filter.date}T23:59:59.999+05:00`)
    const byTime: Prisma.GroupDriverAdWhereInput = { departAt: { gte: dayStart, lte: dayEnd } }
    and.push(filter.date === tashkentYmd(now) ? { OR: [byTime, { departAt: null }] } : byTime)
  }

  const ads = await prisma.groupDriverAd.findMany({
    where: { status: 'PUBLISHED', expiresAt: { gt: now }, ...(and.length ? { AND: and } : {}) },
    orderBy: { publishedAt: 'desc' },
    take: 120,
    include: { driver: { select: { id: true, approved: true, archivedAt: true } } },
  })

  return ads.map((ad) => ({
    source: 'TELEGRAM' as const,
    id: ad.id,
    fromLabel: ad.fromLabel!,
    toLabel: ad.toLabel!,
    departAt: ad.departAt?.toISOString() ?? null,
    departNote: ad.departNote,
    seatsAvailable: ad.seats,
    pricePerSeat: ad.pricePerSeat,
    carModel: ad.carModel,
    features: ad.features,
    notes: ad.notes,
    phones: ad.phones,
    publishedAt: ad.publishedAt!.toISOString(),
    expiresAt: ad.expiresAt!.toISOString(),
    // Ordering key on the board: the trip's time, or when it went up if it has none.
    sortAt: (ad.departAt ?? ad.publishedAt!).toISOString(),
    driver: {
      name: ad.driverName || 'Haydovchi',
      // A site driver's profile opens from the card; anyone else is reached by phone/Telegram.
      siteDriverId: ad.driver?.approved && !ad.driver.archivedAt ? ad.driver.id : null,
      telegramUrl:
        ad.authorTelegramId === '0'
          ? null
          : ad.authorUsername
            ? `https://t.me/${ad.authorUsername}`
            : `tg://user?id=${ad.authorTelegramId}`,
    },
    // The same number on several ads is one driver.
    driverKey: ad.phones[0] ?? `tg:${ad.authorTelegramId}`,
  }))
}
