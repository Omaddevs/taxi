import { randomBytes, randomInt } from 'node:crypto'
import type { GiveawayEntry, GiveawayPrize, GiveawaySettings, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { checkChatMembers } from '../../lib/botBridge.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js'

const SETTINGS_ID = 'default'
const CHECK_CHUNK = 100
const RECHECK_COOLDOWN_MS = 8_000

// ── Settings & eligibility rules ───────────────────────────────────────────────────────────

export async function getSettings(): Promise<GiveawaySettings> {
  return prisma.giveawaySettings.upsert({ where: { id: SETTINGS_ID }, update: {}, create: { id: SETTINGS_ID } })
}

function requirements(settings: GiveawaySettings) {
  return { channel: Boolean(settings.channelChatId), group: Boolean(settings.groupChatId) }
}

type Req = ReturnType<typeof requirements>

function isEligible(entry: Pick<GiveawayEntry, 'telegramId' | 'channelMember' | 'groupMember'>, req: Req) {
  if (!entry.telegramId) return false
  if (req.channel && entry.channelMember !== true) return false
  if (req.group && entry.groupMember !== true) return false
  return true
}

function eligibleWhere(req: Req): Prisma.GiveawayEntryWhereInput {
  return {
    telegramId: { not: null },
    ...(req.channel ? { channelMember: true } : {}),
    ...(req.group ? { groupMember: true } : {}),
  }
}

// "Linked to the bot but missing at least one required subscription". Nulls (never checked)
// count as not subscribed — written as explicit ORs because SQL `NOT (x = true)` drops NULLs.
function notSubscribedWhere(req: Req): Prisma.GiveawayEntryWhereInput {
  const missing: Prisma.GiveawayEntryWhereInput[] = []
  if (req.channel) missing.push({ channelMember: false }, { channelMember: null })
  if (req.group) missing.push({ groupMember: false }, { groupMember: null })
  if (!missing.length) return { id: '__none__' }
  return { telegramId: { not: null }, OR: missing }
}

function publicSettings(settings: GiveawaySettings) {
  return {
    title: settings.title,
    prizeText: settings.prizeText,
    channelUrl: settings.channelUrl,
    groupUrl: settings.groupUrl,
    entriesOpen: settings.entriesOpen,
    requires: requirements(settings),
  }
}

function entryStatus(entry: GiveawayEntry, settings: GiveawaySettings) {
  const req = requirements(settings)
  return {
    firstName: entry.firstName,
    linked: Boolean(entry.telegramId),
    channelMember: req.channel ? entry.channelMember : null,
    groupMember: req.group ? entry.groupMember : null,
    eligible: isEligible(entry, req),
    checkedAt: entry.checkedAt,
    settings: publicSettings(settings),
  }
}

function serializeEntry(entry: GiveawayEntry & { _count?: { wins: number } }, req: Req) {
  return {
    id: entry.id,
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: entry.phone,
    telegramId: entry.telegramId,
    telegramUsername: entry.telegramUsername,
    linked: Boolean(entry.telegramId),
    channelMember: entry.channelMember,
    groupMember: entry.groupMember,
    eligible: isEligible(entry, req),
    checkedAt: entry.checkedAt,
    checkError: entry.checkError,
    createdAt: entry.createdAt,
    wins: entry._count?.wins ?? 0,
  }
}

// ── Membership check (through the bot's getChatMember) ─────────────────────────────────────

async function checkEntries(entries: GiveawayEntry[], settings: GiveawaySettings) {
  const linked = entries.filter((e) => e.telegramId)
  const chats = [settings.channelChatId, settings.groupChatId].filter((c): c is string => Boolean(c))
  const chatErrors: Record<string, string> = {}
  const updated = new Map<string, GiveawayEntry>()

  if (!linked.length || !chats.length) {
    if (linked.length) {
      const now = new Date()
      await prisma.giveawayEntry.updateMany({
        where: { id: { in: linked.map((e) => e.id) } },
        data: { checkedAt: now, checkError: null },
      })
      linked.forEach((e) => updated.set(e.id, { ...e, checkedAt: now, checkError: null }))
    }
    return { chatErrors, updated }
  }

  for (let i = 0; i < linked.length; i += CHECK_CHUNK) {
    const chunk = linked.slice(i, i + CHECK_CHUNK)
    const result = await checkChatMembers(chats, chunk.map((e) => e.telegramId!))
    Object.assign(chatErrors, result.chatErrors)
    const now = new Date()
    const rows = await prisma.$transaction(
      chunk.map((e) => {
        const m = result.members[e.telegramId!] ?? {}
        const pick = (chat: string | null) => (chat && !(chat in result.chatErrors) ? (m[chat] ?? null) : null)
        const errors = chats.filter((c) => c in result.chatErrors).map((c) => `${c}: ${result.chatErrors[c]}`)
        return prisma.giveawayEntry.update({
          where: { id: e.id },
          data: {
            channelMember: pick(settings.channelChatId),
            groupMember: pick(settings.groupChatId),
            checkedAt: now,
            checkError: errors.length ? errors.join('; ') : null,
          },
        })
      }),
    )
    rows.forEach((r) => updated.set(r.id, r))
  }
  return { chatErrors, updated }
}

// ── Public (landing page) ──────────────────────────────────────────────────────────────────

export async function getPublicSettings() {
  return publicSettings(await getSettings())
}

export async function createEntry(input: { firstName: string; lastName: string; phone: string }) {
  const settings = await getSettings()
  if (!settings.entriesOpen) throw new ValidationError('Hozircha ishtirokchilar qabul qilinmayapti')

  const phone = normalizePhone(input.phone)
  if (!/^\+998\d{9}$/.test(phone)) throw new ValidationError('Telefon raqami +998 XX XXX XX XX formatida bo‘lishi kerak')

  const existing = await prisma.giveawayEntry.findUnique({ where: { phone } })
  const entry = existing
    ? await prisma.giveawayEntry.update({
        where: { id: existing.id },
        data: { firstName: input.firstName, lastName: input.lastName },
      })
    : await prisma.giveawayEntry.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone,
          linkToken: randomBytes(12).toString('base64url'),
        },
      })

  return { token: entry.linkToken, alreadyRegistered: Boolean(existing), status: entryStatus(entry, settings) }
}

async function entryByToken(token: string) {
  const entry = await prisma.giveawayEntry.findUnique({ where: { linkToken: token } })
  if (!entry) throw new NotFoundError('Ishtirokchi topilmadi')
  return entry
}

export async function getEntryStatus(token: string) {
  const [entry, settings] = await Promise.all([entryByToken(token), getSettings()])
  return entryStatus(entry, settings)
}

export async function recheckByToken(token: string) {
  const [entry, settings] = await Promise.all([entryByToken(token), getSettings()])
  if (!entry.telegramId) return entryStatus(entry, settings)
  if (entry.checkedAt && Date.now() - entry.checkedAt.getTime() < RECHECK_COOLDOWN_MS) return entryStatus(entry, settings)
  const { updated } = await checkEntries([entry], settings)
  return entryStatus(updated.get(entry.id) ?? entry, settings)
}

// ── Bot (deep link `gw_<token>` and the "Tekshirish" button) ───────────────────────────────

export async function linkFromBot(input: { token: string; telegramId: string; telegramUsername?: string }) {
  const settings = await getSettings()
  const entry = await entryByToken(input.token)
  const other = await prisma.giveawayEntry.findUnique({ where: { telegramId: input.telegramId } })
  if (other && other.id !== entry.id) {
    throw new ConflictError('Bu Telegram akkaunt boshqa telefon raqami bilan ro‘yxatdan o‘tgan')
  }
  const linked = await prisma.giveawayEntry.update({
    where: { id: entry.id },
    data: { telegramId: input.telegramId, telegramUsername: input.telegramUsername ?? null },
  })
  const { updated } = await checkEntries([linked], settings)
  return entryStatus(updated.get(linked.id) ?? linked, settings)
}

export async function recheckFromBot(telegramId: string) {
  const settings = await getSettings()
  const entry = await prisma.giveawayEntry.findUnique({ where: { telegramId } })
  if (!entry) throw new NotFoundError('Ishtirokchi topilmadi')
  const { updated } = await checkEntries([entry], settings)
  return entryStatus(updated.get(entry.id) ?? entry, settings)
}

// ── Admin ──────────────────────────────────────────────────────────────────────────────────

export async function adminOverview() {
  const settings = await getSettings()
  const req = requirements(settings)
  const [total, linked, eligible, notSubscribed, winners, draws] = await Promise.all([
    prisma.giveawayEntry.count(),
    prisma.giveawayEntry.count({ where: { telegramId: { not: null } } }),
    prisma.giveawayEntry.count({ where: eligibleWhere(req) }),
    prisma.giveawayEntry.count({ where: notSubscribedWhere(req) }),
    prisma.giveawayEntry.count({ where: { wins: { some: {} } } }),
    prisma.giveawayDraw.count(),
  ])
  return {
    settings,
    requires: req,
    stats: { total, linked, unlinked: total - linked, eligible, notSubscribed, winners, draws },
  }
}

export async function updateSettings(input: Partial<Omit<GiveawaySettings, 'id' | 'updatedAt'>>, actorId: string) {
  await getSettings()
  const data = Object.fromEntries(
    Object.entries(input)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v]),
  )
  const settings = await prisma.giveawaySettings.update({ where: { id: SETTINGS_ID }, data })
  await writeAudit({ actorId, action: 'giveaway.settings.update', targetType: 'GiveawaySettings', targetId: SETTINGS_ID, meta: data })
  return settings
}

export async function listEntries(params: {
  filter: 'all' | 'eligible' | 'not_subscribed' | 'unlinked' | 'winners'
  q?: string
  page: number
  pageSize: number
}) {
  const settings = await getSettings()
  const req = requirements(settings)
  const byFilter: Record<typeof params.filter, Prisma.GiveawayEntryWhereInput> = {
    all: {},
    eligible: eligibleWhere(req),
    not_subscribed: notSubscribedWhere(req),
    unlinked: { telegramId: null },
    winners: { wins: { some: {} } },
  }
  const digits = params.q?.replace(/\D/g, '')
  const where: Prisma.GiveawayEntryWhereInput = {
    ...byFilter[params.filter],
    ...(params.q
      ? {
          AND: [
            {
              OR: [
                { firstName: { contains: params.q, mode: 'insensitive' } },
                { lastName: { contains: params.q, mode: 'insensitive' } },
                { telegramUsername: { contains: params.q.replace(/^@/, ''), mode: 'insensitive' } },
                ...(digits && digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
              ],
            },
          ],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    prisma.giveawayEntry.count({ where }),
    prisma.giveawayEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { _count: { select: { wins: true } } },
    }),
  ])
  return { items: rows.map((r) => serializeEntry(r, req)), total, page: params.page, pageSize: params.pageSize }
}

export async function checkMany(ids: string[] | undefined, actorId: string) {
  const settings = await getSettings()
  const entries = await prisma.giveawayEntry.findMany({
    where: { telegramId: { not: null }, ...(ids?.length ? { id: { in: ids } } : {}) },
  })
  const { chatErrors, updated } = await checkEntries(entries, settings)
  const req = requirements(settings)
  const eligible = [...updated.values()].filter((e) => isEligible(e, req)).length
  await writeAudit({ actorId, action: 'giveaway.check', targetType: 'GiveawayEntry', meta: { checked: entries.length, eligible } })
  return { checked: entries.length, eligible, chatErrors }
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Winners are picked on the server with a CSPRNG; the admin UI only animates the drum and
// lands on these results. Each picked candidate's subscription is re-verified live right
// before it is accepted, so someone who unsubscribed after the last bulk check can't win.
export async function draw(input: { count: number; prize: GiveawayPrize; excludePastWinners: boolean }, actorId: string) {
  const settings = await getSettings()
  const req = requirements(settings)
  const candidates = await prisma.giveawayEntry.findMany({
    where: { ...eligibleWhere(req), ...(input.excludePastWinners ? { wins: { none: {} } } : {}) },
  })
  if (!candidates.length) {
    throw new ValidationError('Shartlarga mos ishtirokchi yo‘q. Avval “Obunani tekshirish”ni bosing.')
  }

  const queue = shuffle(candidates)
  const winners: GiveawayEntry[] = []
  const liveCheck = req.channel || req.group
  while (winners.length < input.count && queue.length) {
    const batch = queue.splice(0, input.count - winners.length)
    if (!liveCheck) {
      winners.push(...batch)
      continue
    }
    const { updated, chatErrors } = await checkEntries(batch, settings)
    if (Object.keys(chatErrors).length) {
      throw new ValidationError(`Obunani tekshirib bo‘lmadi: ${Object.entries(chatErrors).map(([c, e]) => `${c} — ${e}`).join('; ')}`)
    }
    winners.push(...batch.map((e) => updated.get(e.id) ?? e).filter((e) => isEligible(e, req)))
  }
  if (!winners.length) throw new ValidationError('Tekshiruvdan so‘ng mos ishtirokchi qolmadi')

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true, firstName: true, phone: true } })
  const created = await prisma.giveawayDraw.create({
    data: {
      prize: input.prize,
      count: input.count,
      poolSize: candidates.length,
      createdById: actorId,
      createdByName: actor?.name || actor?.firstName || actor?.phone || null,
      winners: { create: winners.map((w) => ({ entryId: w.id, prize: input.prize })) },
    },
    include: { winners: { include: { entry: true } } },
  })
  await writeAudit({
    actorId,
    action: 'giveaway.draw',
    targetType: 'GiveawayDraw',
    targetId: created.id,
    meta: { prize: input.prize, count: input.count, poolSize: candidates.length, winners: winners.map((w) => w.id) },
  })

  // Names for the drum animation: a shuffled sample of the pool (the admin UI splices the
  // actual winners in at the stopping positions).
  const reel = shuffle(candidates)
    .slice(0, 60)
    .map((e) => `${e.firstName} ${e.lastName}`)

  return {
    draw: serializeDraw(created, req),
    reel,
    shortBy: input.count - winners.length,
  }
}

function serializeDraw(
  d: Prisma.GiveawayDrawGetPayload<{ include: { winners: { include: { entry: true } } } }>,
  req: Req,
) {
  return {
    id: d.id,
    prize: d.prize,
    count: d.count,
    poolSize: d.poolSize,
    createdByName: d.createdByName,
    createdAt: d.createdAt,
    winners: d.winners.map((w) => ({
      id: w.id,
      prize: w.prize,
      paidAt: w.paidAt,
      entry: serializeEntry(w.entry, req),
    })),
  }
}

export async function listDraws() {
  const settings = await getSettings()
  const req = requirements(settings)
  const draws = await prisma.giveawayDraw.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { winners: { include: { entry: true }, orderBy: { createdAt: 'asc' } } },
  })
  return draws.map((d) => serializeDraw(d, req))
}

export async function setWinnerPaid(id: string, paid: boolean, actorId: string) {
  const winner = await prisma.giveawayWinner.findUnique({ where: { id } })
  if (!winner) throw new NotFoundError('G‘olib topilmadi')
  const row = await prisma.giveawayWinner.update({ where: { id }, data: { paidAt: paid ? new Date() : null } })
  await writeAudit({ actorId, action: paid ? 'giveaway.winner.paid' : 'giveaway.winner.unpaid', targetType: 'GiveawayWinner', targetId: id })
  return { id: row.id, paidAt: row.paidAt }
}

export async function deleteEntry(id: string, actorId: string) {
  const entry = await prisma.giveawayEntry.findUnique({ where: { id } })
  if (!entry) throw new NotFoundError('Ishtirokchi topilmadi')
  await prisma.giveawayEntry.delete({ where: { id } })
  await writeAudit({ actorId, action: 'giveaway.entry.delete', targetType: 'GiveawayEntry', targetId: id, meta: { phone: entry.phone } })
}
