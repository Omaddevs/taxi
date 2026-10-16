import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { normalizePhone } from '../../lib/otp.js'

const PUBLIC_USER_SELECT = {
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
  ratingAvg: true,
  ratingCount: true,
  gender: true,
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

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT })
  if (!user) throw new NotFoundError('User not found')
  const role =
    user.role === 'DRIVER' || user.driver?.approved ? 'DRIVER' : user.role === 'ADMIN' ? 'PASSENGER' : user.role
  return { ...user, role }
}

export async function updateMe(
  userId: string,
  patch: { name?: string; email?: string; phone?: string; avatarUrl?: string; language?: string; gender?: 'MALE' | 'FEMALE' },
) {
  const { phone: rawPhone, email, ...rest } = patch
  const data: Record<string, unknown> = { ...rest }
  if (email !== undefined) data.email = email || null
  if (rawPhone !== undefined) Object.assign(data, await phoneChange(userId, rawPhone))
  return prisma.user.update({ where: { id: userId }, data, select: PUBLIC_USER_SELECT })
}

/* Shaxsiy ma'lumotlar → Telefon: anyone can change their own number, Google sign-ups included —
   no code, like adding one (there's no SMS; the login code goes through Telegram, which a new
   number can still use). Stored unverified. Refused: a number another account already has, and
   the accounts whose number is wired into something else — a driver's (their driver profile in
   the bot) and staff (it's their admin login). */
async function phoneChange(userId: string, rawPhone: string) {
  const phone = normalizePhone(rawPhone)
  if (!/^\+998\d{9}$/.test(phone)) throw new ValidationError('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, role: true, staffKind: true, driver: { select: { id: true } } },
  })
  if (!user) throw new NotFoundError('User not found')
  if (user.phone === phone) return {}
  if (user.staffKind || user.role === 'DRIVER' || user.driver) {
    throw new ForbiddenError('Haydovchi va xodim raqamini o‘zgartirish uchun qo‘llab-quvvatlash xizmatiga yozing')
  }
  const owner = await prisma.user.findUnique({ where: { phone }, select: { id: true } })
  if (owner && owner.id !== userId) {
    throw new ConflictError('Bu raqam boshqa akkauntga tegishli. Boshqa raqam kiriting yoki o‘sha raqam bilan kiring')
  }
  return { phone, verified: false }
}

export async function listUsers(filter: { q?: string; role?: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.q
        ? { OR: [{ phone: { contains: filter.q } }, { name: { contains: filter.q, mode: 'insensitive' } }] }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: PUBLIC_USER_SELECT,
  })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT })
  if (!user) throw new NotFoundError('User not found')
  return user
}

export async function getAdminUserDetail(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT })
  if (!user) throw new NotFoundError('User not found')

  const [recentBookings, recentTransactions, ratingsReceived] = await Promise.all([
    prisma.booking.findMany({
      where: { riderId: id },
      orderBy: { createdAt: 'desc' },
      take: 8,
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
    }),
    prisma.rating.findMany({
      where: { rateeUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { rater: { select: { id: true, name: true, phone: true } } },
    }),
  ])

  return { ...user, recentBookings, recentTransactions, ratingsReceived }
}

export async function setVerified(id: string, verified: boolean) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('User not found')
  return prisma.user.update({ where: { id }, data: { verified }, select: PUBLIC_USER_SELECT })
}
