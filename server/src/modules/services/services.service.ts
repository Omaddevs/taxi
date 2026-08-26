import { prisma } from '../../lib/prisma.js'
import { ConflictError, NotFoundError } from '../../errors/AppError.js'

export async function listActiveServices() {
  return prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
}

export async function listAllServices() {
  return prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
}

export async function createService(data: {
  id: string
  title: string
  description?: string
  icon: string
  basePrice: number
  sortOrder: number
}) {
  const existing = await prisma.service.findUnique({ where: { id: data.id } })
  if (existing) throw new ConflictError('Bu xizmat turi allaqachon mavjud')
  return prisma.service.create({ data })
}

export async function updateService(
  id: string,
  patch: Partial<{ title: string; description: string; icon: string; basePrice: number; active: boolean; sortOrder: number }>,
) {
  const service = await prisma.service.findUnique({ where: { id } })
  if (!service) throw new NotFoundError('Xizmat turi topilmadi')
  return prisma.service.update({ where: { id }, data: patch })
}
