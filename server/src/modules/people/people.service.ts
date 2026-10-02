import bcrypt from 'bcryptjs'
import type { ChannelSource } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
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

export async function listPeople(filter: { q?: string; kind?: 'all' | 'passenger' | 'driver'; channel?: ChannelSource }) {
  const channelWhere =
    filter.channel === 'BOT'
      ? { fromBot: true }
      : filter.channel === 'WEBAPP'
        ? { fromWebapp: true }
        : filter.channel === 'GROUP'
          ? { fromGroup: true }
          : {}

  const kindWhere =
    filter.kind === 'driver'
      ? { OR: [{ role: 'DRIVER' as const }, { driver: { isNot: null } }] }
      : filter.kind === 'passenger'
        ? { driver: null, role: { not: 'DRIVER' as const } }
        : {}

  const [rows, total, drivers, passengers, bot, webapp, group] = await Promise.all([
    prisma.user.findMany({
      where: { staffKind: null, ...kindWhere, ...channelWhere, ...searchWhere(filter.q) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: PERSON_SELECT,
    }),
    prisma.user.count({ where: { staffKind: null } }),
    prisma.user.count({ where: { staffKind: null, OR: [{ role: 'DRIVER' }, { driver: { isNot: null } }] } }),
    prisma.user.count({ where: { staffKind: null, driver: null, role: { not: 'DRIVER' } } }),
    prisma.user.count({ where: { staffKind: null, fromBot: true } }),
    prisma.user.count({ where: { staffKind: null, fromWebapp: true } }),
    prisma.user.count({ where: { staffKind: null, fromGroup: true } }),
  ])

  return {
    items: rows,
    stats: { total, drivers, passengers, bot, webapp, group },
  }
}

export async function getPerson(id: string, actorRole?: JwtRole) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...PERSON_SELECT, staffKind: true, loginPassword: true },
  })
  if (!user || user.staffKind) throw new NotFoundError('Foydalanuvchi topilmadi')
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
  if (!user || user.staffKind) throw new NotFoundError('Foydalanuvchi topilmadi')

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
