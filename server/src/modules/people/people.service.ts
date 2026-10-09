import bcrypt from 'bcryptjs'
import type { ChannelSource } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import type { JwtRole } from '../../lib/jwt.js'

export const PERSON_SELECT = {
  id: true,
  phone: true,
  name: true,
  firstName: true,
  email: true,
  avatarUrl: true,
  role: true,
  verified: true,
  balance: true,
  points: true,
  coins: true,
  language: true,
  telegramId: true,
  telegramUsername: true,
  googleId: true,
  signupSource: true,
  fromWebapp: true,
  fromBot: true,
  fromGroup: true,
  lastSeenAt: true,
  notes: true,
  ratingAvg: true,
  ratingCount: true,
  createdAt: true,
  updatedAt: true,
  driver: {
    select: {
      id: true,
      carModel: true,
      plate: true,
      carImageUrl: true,
      licenseNumber: true,
      ratingAvg: true,
      ratingCount: true,
      tripsCount: true,
      online: true,
      approved: true,
    },
  },
} as const

function searchWhere(q?: string) {
  const raw = q?.trim()
  if (!raw) return {}
  const compact = raw.replace(/\s+/g, '')
  const digits = raw.replace(/\D/g, '')
  const or: object[] = [
    { name: { contains: raw, mode: 'insensitive' as const } },
    { firstName: { contains: raw, mode: 'insensitive' as const } },
    { telegramUsername: { contains: raw, mode: 'insensitive' as const } },
    { email: { contains: raw, mode: 'insensitive' as const } },
    { notes: { contains: raw, mode: 'insensitive' as const } },
    { driver: { is: { plate: { contains: raw, mode: 'insensitive' as const } } } },
    { driver: { is: { carModel: { contains: raw, mode: 'insensitive' as const } } } },
  ]
  if (compact !== raw) {
    or.push({ driver: { is: { plate: { contains: compact, mode: 'insensitive' as const } } } })
  }
  if (digits.length >= 4) or.push({ phone: { contains: digits } })
  else or.push({ phone: { contains: raw } })
  return { OR: or }
}

export async function listPeople(filter: { q?: string; kind?: 'all' | 'passenger' | 'driver'; channel?: ChannelSource | 'GOOGLE' }) {
  const channelWhere =
    filter.channel === 'BOT'
      ? { fromBot: true }
      : filter.channel === 'WEBAPP'
        ? { fromWebapp: true }
        : filter.channel === 'GROUP'
          ? { fromGroup: true }
          : filter.channel === 'GOOGLE'
            ? { googleId: { not: null } }
            : {}

  const kindWhere =
    filter.kind === 'driver'
      ? { OR: [{ role: 'DRIVER' as const }, { driver: { isNot: null } }] }
      : filter.kind === 'passenger'
        ? { driver: null, role: { not: 'DRIVER' as const } }
        : {}

  // Deleted (anonymised) accounts stay in the table for history, never in the catalogue.
  const live = { staffKind: null, deletedAt: null }
  const [rows, total, drivers, passengers, bot, webapp, group, google] = await Promise.all([
    prisma.user.findMany({
      where: { ...live, ...kindWhere, ...channelWhere, ...searchWhere(filter.q) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: PERSON_SELECT,
    }),
    prisma.user.count({ where: live }),
    prisma.user.count({ where: { ...live, OR: [{ role: 'DRIVER' }, { driver: { isNot: null } }] } }),
    prisma.user.count({ where: { ...live, driver: null, role: { not: 'DRIVER' } } }),
    prisma.user.count({ where: { ...live, fromBot: true } }),
    prisma.user.count({ where: { ...live, fromWebapp: true } }),
    prisma.user.count({ where: { ...live, fromGroup: true } }),
    prisma.user.count({ where: { ...live, googleId: { not: null } } }),
  ])

  return {
    items: rows,
    stats: { total, drivers, passengers, bot, webapp, group, google },
  }
}

export async function getPerson(id: string, actorRole?: JwtRole) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...PERSON_SELECT, staffKind: true, loginPassword: true, deletedAt: true },
  })
  if (!user || user.staffKind || user.deletedAt) throw new NotFoundError('Foydalanuvchi topilmadi')
  const { staffKind: _staffKind, loginPassword, ...person } = user
  const canSeePassword = actorRole === 'ADMIN' || actorRole === 'SUPPORT_OPERATOR'

  const [recentBookings, recentTransactions, ratingsReceived, driverBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { riderId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        fromLabel: true,
        toLabel: true,
        status: true,
        totalPrice: true,
        departAt: true,
        createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        title: true,
        createdAt: true,
      },
    }),
    prisma.rating.findMany({
      where: { rateeUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { rater: { select: { id: true, name: true, phone: true } } },
    }),
    user.driver
      ? prisma.booking.findMany({
          where: { rideOffer: { driverId: user.driver.id } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            fromLabel: true,
            toLabel: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            rider: { select: { name: true, phone: true } },
          },
        })
      : Promise.resolve([]),
  ])

  return {
    ...person,
    loginPassword: canSeePassword ? loginPassword : null,
    recentBookings,
    recentTransactions,
    ratingsReceived,
    driverBookings,
  }
}

export async function updatePerson(
  id: string,
  actorRole: JwtRole,
  patch: {
    name?: string
    phone?: string
    email?: string | null
    password?: string
    language?: string
    notes?: string
    verified?: boolean
    carModel?: string
    plate?: string
    licenseNumber?: string | null
  },
  actorId?: string,
) {
  const user = await prisma.user.findUnique({ where: { id }, include: { driver: true } })
  if (!user || user.staffKind || user.deletedAt) throw new NotFoundError('Foydalanuvchi topilmadi')

  const canEditSecrets = actorRole === 'ADMIN' || actorRole === 'SUPPORT_OPERATOR'
  if (!canEditSecrets) {
    if (patch.phone || patch.password || patch.verified !== undefined) {
      throw new ForbiddenError('Nomer va parolni faqat admin yoki texnik operator o‘zgartira oladi')
    }
  }

  if (patch.phone) {
    const phone = normalizePhone(patch.phone)
    const taken = await prisma.user.findFirst({ where: { phone, NOT: { id } } })
    if (taken) throw new ConflictError('Bu telefon raqami boshqa hisobda bor')
    patch.phone = phone
  }

  const passwordHash = patch.password ? await bcrypt.hash(patch.password, 10) : undefined

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(patch.name ? { name: patch.name, firstName: patch.name.split(' ')[0] } : {}),
        ...(patch.phone ? { phone: patch.phone } : {}),
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.language ? { language: patch.language } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.verified === undefined ? {} : { verified: patch.verified }),
        ...(passwordHash ? { passwordHash, loginPassword: patch.password } : {}),
      },
      select: PERSON_SELECT,
    })

    if (user.driver && (patch.carModel || patch.plate || patch.licenseNumber !== undefined)) {
      await tx.driver.update({
        where: { id: user.driver.id },
        data: {
          ...(patch.carModel ? { carModel: patch.carModel } : {}),
          ...(patch.plate ? { plate: patch.plate } : {}),
          ...(patch.licenseNumber !== undefined ? { licenseNumber: patch.licenseNumber } : {}),
        },
      })
    }

    if (patch.phone || passwordHash) {
      await tx.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } })
    }

    return tx.user.findUniqueOrThrow({ where: { id }, select: PERSON_SELECT })
  })

  if (passwordHash) {
    await writeAudit({ actorId, action: 'PERSON_PASSWORD_SET', targetType: 'User', targetId: id })
  }

  return updated
}

export function markChannel(source: ChannelSource) {
  return {
    lastSeenAt: new Date(),
    ...(source === 'BOT' ? { fromBot: true } : {}),
    ...(source === 'WEBAPP' ? { fromWebapp: true } : {}),
    ...(source === 'GROUP' ? { fromGroup: true } : {}),
  }
}


// ── Admin CRUD: create / delete ─────────────────────────────────────────────────────────────

export async function createPerson(
  input: { name: string; phone?: string; email?: string; language?: string; notes?: string },
  actorId?: string,
) {
  const phone = input.phone ? normalizePhone(input.phone) : undefined
  if (!phone && !input.email) throw new ValidationError('Telefon raqam yoki email kiriting')
  if (phone && (await prisma.user.findUnique({ where: { phone }, select: { id: true } }))) {
    throw new ConflictError('Bu telefon raqami boshqa hisobda bor')
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      firstName: input.name.split(' ')[0],
      phone,
      email: input.email || null,
      language: input.language,
      notes: input.notes,
      role: 'PASSENGER',
      verified: false,
      signupSource: 'WEBAPP',
    },
    select: PERSON_SELECT,
  })
  await writeAudit({ actorId, action: 'PERSON_CREATED', targetType: 'User', targetId: user.id })
  return user
}

// Rows that must keep pointing at the user (RESTRICT foreign keys): trips, cargo, money, chats,
// and — through their driver profile — ride offers.
async function hasHistory(id: string) {
  const [bookings, cargo, transactions, messages, conversations, offers] = await Promise.all([
    prisma.booking.count({ where: { riderId: id } }),
    prisma.cargoOrder.count({ where: { riderId: id } }),
    prisma.transaction.count({ where: { userId: id } }),
    prisma.message.count({ where: { senderId: id } }),
    prisma.conversation.count({ where: { OR: [{ participantAId: id }, { participantBId: id }] } }),
    prisma.rideOffer.count({ where: { driver: { userId: id } } }),
  ])
  return bookings + cargo + transactions + messages + conversations + offers > 0
}

/**
 * Deletes an account. Without history it is removed outright. With trips, cargo, payments or
 * chats it can't be (those rows must keep pointing at someone), so it is anonymised instead:
 * name, phone, email, photo, Google and Telegram links and password are wiped, every session is
 * revoked and it disappears from the catalogue — the history stays intact.
 */
export async function deletePerson(id: string, actorId?: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, staffKind: true, deletedAt: true, phone: true, name: true } })
  if (!user || user.staffKind || user.deletedAt) throw new NotFoundError('Foydalanuvchi topilmadi')
  if (user.id === actorId) throw new ForbiddenError('O‘zingizni o‘chira olmaysiz')
  const meta = { phone: user.phone, name: user.name }

  if (!(await hasHistory(id))) {
    await prisma.user.delete({ where: { id } })
    await writeAudit({ actorId, action: 'PERSON_DELETED', targetType: 'User', targetId: id, meta })
    return { mode: 'deleted' as const }
  }

  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.telegramLoginToken.deleteMany({ where: { userId: id } }),
    prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        name: 'O‘chirilgan foydalanuvchi',
        firstName: null,
        phone: null,
        email: null,
        avatarUrl: null,
        googleId: null,
        telegramId: null,
        telegramUsername: null,
        passwordHash: null,
        loginPassword: null,
        notes: null,
        verified: false,
      },
    }),
  ])
  await writeAudit({ actorId, action: 'PERSON_ANONYMIZED', targetType: 'User', targetId: id, meta })
  return { mode: 'anonymized' as const }
}
