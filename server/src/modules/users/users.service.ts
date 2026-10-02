import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'

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
  patch: { name?: string; email?: string; avatarUrl?: string; language?: string; gender?: 'MALE' | 'FEMALE' },
) {
  return prisma.user.update({ where: { id: userId }, data: patch, select: PUBLIC_USER_SELECT })
}

export async function listUsers(filter: { q?: string; role?: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  return prisma.user.findMany({
    where: {
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
