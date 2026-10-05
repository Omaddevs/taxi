import type { MapPlaceCategory, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'
import { writeAudit } from '../../lib/audit.js'

export interface MapPlaceInput {
  category: MapPlaceCategory
  name: string
  brand?: string
  address?: string
  phone?: string
  hours?: string
  description?: string
  lat: number
  lng: number
  imageUrl?: string
  prices?: { title: string; price: number }[]
  active?: boolean
}

const NULLABLE_TEXT = ['brand', 'address', 'phone', 'hours', 'description', 'imageUrl'] as const

// Empty strings from the form mean "cleared" — store them as NULL so the website hides the row.
function normalize(input: Partial<MapPlaceInput>) {
  const data: Record<string, unknown> = { ...input }
  for (const key of NULLABLE_TEXT) {
    if (key in input) data[key] = input[key] || null
  }
  return data
}

/** Public: what the website's Smart xarita shows. */
export async function listActivePlaces() {
  return prisma.mapPlace.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function listPlacesAdmin(filter: {
  category?: MapPlaceCategory
  q?: string
  status?: 'active' | 'hidden'
}) {
  const where: Prisma.MapPlaceWhereInput = {}
  if (filter.category) where.category = filter.category
  if (filter.status) where.active = filter.status === 'active'
  if (filter.q) {
    const contains = { contains: filter.q, mode: 'insensitive' as const }
    where.OR = [{ name: contains }, { brand: contains }, { address: contains }, { phone: contains }]
  }
  return prisma.mapPlace.findMany({ where, orderBy: { updatedAt: 'desc' } })
}

export async function createPlace(input: MapPlaceInput, actorId: string) {
  const place = await prisma.mapPlace.create({ data: normalize(input) as Prisma.MapPlaceCreateInput })
  await writeAudit({ actorId, action: 'MAP_PLACE_CREATED', targetType: 'MapPlace', targetId: place.id, meta: { name: place.name } })
  return place
}

export async function updatePlace(id: string, patch: Partial<MapPlaceInput>, actorId: string) {
  const existing = await prisma.mapPlace.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Joy topilmadi')
  const place = await prisma.mapPlace.update({ where: { id }, data: normalize(patch) as Prisma.MapPlaceUpdateInput })
  await writeAudit({ actorId, action: 'MAP_PLACE_UPDATED', targetType: 'MapPlace', targetId: id, meta: { name: place.name } })
  return place
}

export async function deletePlace(id: string, actorId: string) {
  const existing = await prisma.mapPlace.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('Joy topilmadi')
  await prisma.mapPlace.delete({ where: { id } })
  await writeAudit({ actorId, action: 'MAP_PLACE_DELETED', targetType: 'MapPlace', targetId: id, meta: { name: existing.name } })
}
