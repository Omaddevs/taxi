import type { TicketCategory } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'

export async function listCanned(category?: TicketCategory) {
  return prisma.cannedResponse.findMany({
    where: category ? { category } : {},
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCanned(actorId: string, input: { category?: TicketCategory; title: string; body: string }) {
  return prisma.cannedResponse.create({ data: { ...input, createdById: actorId } })
}

export async function updateCanned(
  id: string,
  patch: { category?: TicketCategory | null; title?: string; body?: string },
) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Shablon topilmadi')
  return prisma.cannedResponse.update({
    where: { id },
    data: {
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.body ? { body: patch.body } : {}),
    },
  })
}

export async function deleteCanned(id: string) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Shablon topilmadi')
  await prisma.cannedResponse.delete({ where: { id } })
}
