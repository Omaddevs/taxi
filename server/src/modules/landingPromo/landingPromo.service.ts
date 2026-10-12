import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'
import type { createLandingPromoSchema, updateLandingPromoSchema } from './landingPromo.schema.js'

const ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]

export async function listPublic() {
  return prisma.landingPromo.findMany({
    where: { active: true },
    orderBy: ORDER,
    select: { id: true, period: true, prizes: true, terms: true, termsBold: true, soon: true },
  })
}

export async function listAll() {
  return prisma.landingPromo.findMany({ orderBy: ORDER })
}

export async function create(input: z.infer<typeof createLandingPromoSchema>) {
  return prisma.landingPromo.create({ data: { ...input, termsBold: input.termsBold || null } })
}

export async function update(id: string, patch: z.infer<typeof updateLandingPromoSchema>) {
  const existing = await prisma.landingPromo.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Aksiya topilmadi')
  return prisma.landingPromo.update({
    where: { id },
    data: { ...patch, ...(patch.termsBold !== undefined ? { termsBold: patch.termsBold || null } : {}) },
  })
}

export async function remove(id: string) {
  const existing = await prisma.landingPromo.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Aksiya topilmadi')
  await prisma.landingPromo.delete({ where: { id } })
}
