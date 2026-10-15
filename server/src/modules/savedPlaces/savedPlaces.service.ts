import type { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { ConflictError, NotFoundError } from '../../errors/AppError.js'
import type { savePlaceSchema, updatePlaceSchema } from './savedPlaces.schema.js'

// "Mening manzillarim". HOME and WORK are one each — saving one again replaces it; OTHER
// addresses pile up to MAX_OTHER.
const MAX_OTHER = 20
const KIND_ORDER = { HOME: 0, WORK: 1, OTHER: 2 } as const

export async function list(userId: string) {
  const places = await prisma.savedPlace.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return places.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export async function save(userId: string, input: z.infer<typeof savePlaceSchema>) {
  const data = { title: input.title ?? null, address: input.address, lat: input.lat ?? null, lng: input.lng ?? null }
  if (input.kind !== 'OTHER') {
    const existing = await prisma.savedPlace.findFirst({ where: { userId, kind: input.kind } })
    if (existing) return prisma.savedPlace.update({ where: { id: existing.id }, data })
  } else if ((await prisma.savedPlace.count({ where: { userId, kind: 'OTHER' } })) >= MAX_OTHER) {
    throw new ConflictError(`Ko‘pi bilan ${MAX_OTHER} ta manzil saqlash mumkin`)
  }
  return prisma.savedPlace.create({ data: { ...data, userId, kind: input.kind } })
}

async function ownOrThrow(userId: string, id: string) {
  const place = await prisma.savedPlace.findUnique({ where: { id } })
  if (!place || place.userId !== userId) throw new NotFoundError('Manzil topilmadi')
  return place
}

export async function update(userId: string, id: string, patch: z.infer<typeof updatePlaceSchema>) {
  await ownOrThrow(userId, id)
  return prisma.savedPlace.update({ where: { id }, data: patch })
}

export async function remove(userId: string, id: string) {
  await ownOrThrow(userId, id)
  await prisma.savedPlace.delete({ where: { id } })
  return { deleted: true }
}
