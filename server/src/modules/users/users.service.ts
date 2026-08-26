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
  createdAt: true,
  updatedAt: true,
} as const

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT })
  if (!user) throw new NotFoundError('User not found')
  return user
}

export async function updateMe(userId: string, patch: { name?: string; email?: string; avatarUrl?: string }) {
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
    select: PUBLIC_USER_SELECT,
  })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT })
  if (!user) throw new NotFoundError('User not found')
  return user
}

export async function setVerified(id: string, verified: boolean) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw new NotFoundError('User not found')
  return prisma.user.update({ where: { id }, data: { verified }, select: PUBLIC_USER_SELECT })
}
