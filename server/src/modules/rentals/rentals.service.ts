import type { Prisma, RentalListing, RentalListingStatus, RentalVehicleType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { writeAudit } from '../../lib/audit.js'
import { createNotification } from '../notifications/notifications.service.js'
import type {
  AdminCreateRentalInput,
  AdminUpdateRentalInput,
  CreateRentalInput,
  UpdateRentalInput,
} from './rentals.schema.js'

// One person can't flood the market — companies with bigger fleets go through the panel.
const MAX_LISTINGS_PER_OWNER = 20

const NULLABLE_TEXT = ['companyName', 'contactName', 'telegram', 'brand', 'model', 'description', 'address', 'rejectionReason'] as const

// Empty strings from the forms mean "cleared" — store them as NULL so the website hides the row.
function normalize<T extends Record<string, unknown>>(input: T) {
  const data: Record<string, unknown> = { ...input }
  for (const key of NULLABLE_TEXT) {
    if (key in input) data[key] = input[key] || null
  }
  // A half-set location is useless on the map — keep both or neither.
  if ('lat' in input || 'lng' in input) {
    if (input.lat == null || input.lng == null) {
      data.lat = null
      data.lng = null
    }
  }
  return data
}

function photosOf(listing: Pick<RentalListing, 'photos'>): string[] {
  return Array.isArray(listing.photos) ? (listing.photos as string[]) : []
}

// List rows carry only the cover — six data-URI photos per card would make the market crawl.
function toCard<T extends RentalListing>(listing: T) {
  const photos = photosOf(listing)
  const { photos: _photos, ...rest } = listing
  return { ...rest, cover: photos[0] ?? null, photoCount: photos.length }
}

const ORDER: Prisma.RentalListingOrderByWithRelationInput[] = [{ featured: 'desc' }, { createdAt: 'desc' }]

function searchWhere(q?: string): Prisma.RentalListingWhereInput | undefined {
  if (!q) return undefined
  const contains = { contains: q, mode: 'insensitive' as const }
  return {
    OR: [
      { title: contains },
      { brand: contains },
      { model: contains },
      { companyName: contains },
      { address: contains },
      { phone: contains },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Public market
// ---------------------------------------------------------------------------------------------

export async function listPublic(filter: { type?: RentalVehicleType; q?: string }) {
  const rows = await prisma.rentalListing.findMany({
    where: {
      status: 'APPROVED',
      active: true,
      ...(filter.type ? { vehicleType: filter.type } : {}),
      ...searchWhere(filter.q),
    },
    orderBy: ORDER,
    take: 300,
  })
  // Strangers browsing the market don't need to know which account owns what.
  return rows.map((row) => {
    const { ownerId: _ownerId, rejectionReason: _reason, ...card } = toCard(row)
    return card
  })
}

export async function getPublic(id: string) {
  const listing = await prisma.rentalListing.findFirst({ where: { id, status: 'APPROVED', active: true } })
  if (!listing) throw new NotFoundError('E’lon topilmadi')
  // Fire-and-forget: a lost view count is not worth failing the page over.
  prisma.rentalListing.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})
  const { ownerId: _ownerId, rejectionReason: _reason, ...rest } = listing
  return { ...rest, photos: photosOf(listing) }
}

// ---------------------------------------------------------------------------------------------
// Owner (website) — "Mening e’lonlarim"
// ---------------------------------------------------------------------------------------------

export async function listMine(ownerId: string) {
  return prisma.rentalListing.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } })
}

export async function createMine(ownerId: string, input: CreateRentalInput) {
  const count = await prisma.rentalListing.count({ where: { ownerId } })
  if (count >= MAX_LISTINGS_PER_OWNER) {
    throw new ValidationError(`Ko‘pi bilan ${MAX_LISTINGS_PER_OWNER} ta e’lon joylash mumkin. Eskilarini o‘chiring.`)
  }
  return prisma.rentalListing.create({
    data: { ...(normalize(input) as Prisma.RentalListingUncheckedCreateInput), ownerId, status: 'PENDING' },
  })
}

async function ownedListing(ownerId: string, id: string) {
  const listing = await prisma.rentalListing.findUnique({ where: { id } })
  if (!listing) throw new NotFoundError('E’lon topilmadi')
  if (listing.ownerId !== ownerId) throw new ForbiddenError('Bu e’lon sizniki emas')
  return listing
}

export async function updateMine(ownerId: string, id: string, patch: UpdateRentalInput) {
  const listing = await ownedListing(ownerId, id)
  const data = normalize(patch)
  const next = { ...listing, ...data }
  if (!(next.pricePerHour || next.pricePerDay || next.pricePerWeek)) {
    throw new ValidationError('Kamida bitta narx kiriting (soat, kun yoki hafta)')
  }
  // Anything beyond the hide/show switch changes what the public sees — it goes back to review.
  const contentChanged = Object.keys(patch).some((key) => key !== 'active')
  if (contentChanged) {
    data.status = 'PENDING'
    data.rejectionReason = null
  }
  return prisma.rentalListing.update({ where: { id }, data: data as Prisma.RentalListingUncheckedUpdateInput })
}

export async function deleteMine(ownerId: string, id: string) {
  await ownedListing(ownerId, id)
  await prisma.rentalListing.delete({ where: { id } })
}

// ---------------------------------------------------------------------------------------------
// Panel (admin + operators)
// ---------------------------------------------------------------------------------------------

const ownerSelect = { select: { id: true, name: true, firstName: true, phone: true } } as const

export async function listAdmin(filter: { status?: RentalListingStatus; type?: RentalVehicleType; q?: string }) {
  const rows = await prisma.rentalListing.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.type ? { vehicleType: filter.type } : {}),
      ...searchWhere(filter.q),
    },
    include: { owner: ownerSelect },
    // Waiting-for-review first, so moderators see the queue without filtering.
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: 1000,
  })
  return rows.map(toCard)
}

export async function getAdmin(id: string) {
  const listing = await prisma.rentalListing.findUnique({ where: { id }, include: { owner: ownerSelect } })
  if (!listing) throw new NotFoundError('E’lon topilmadi')
  return { ...listing, photos: photosOf(listing) }
}

export async function createAdmin(input: AdminCreateRentalInput, actorId: string) {
  const listing = await prisma.rentalListing.create({
    data: { status: 'APPROVED', ...(normalize(input) as Prisma.RentalListingUncheckedCreateInput) },
  })
  await writeAudit({ actorId, action: 'RENTAL_CREATED', targetType: 'RentalListing', targetId: listing.id, meta: { title: listing.title } })
  return listing
}

const STATUS_NOTICE: Partial<Record<RentalListingStatus, (l: RentalListing) => [string, string]>> = {
  APPROVED: (l) => ['E’loningiz tasdiqlandi', `“${l.title}” Skuter ijara bo‘limida ko‘rinmoqda.`],
  REJECTED: (l) => [
    'E’loningiz rad etildi',
    `“${l.title}”${l.rejectionReason ? `: ${l.rejectionReason}` : ''}. Tahrirlab, qayta yuborishingiz mumkin.`,
  ],
}

export async function updateAdmin(id: string, patch: AdminUpdateRentalInput, actorId: string) {
  const existing = await prisma.rentalListing.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('E’lon topilmadi')
  const data = normalize(patch)
  if (patch.status && patch.status !== 'REJECTED' && !('rejectionReason' in patch)) data.rejectionReason = null
  const listing = await prisma.rentalListing.update({ where: { id }, data: data as Prisma.RentalListingUncheckedUpdateInput })

  const statusChanged = patch.status && patch.status !== existing.status
  await writeAudit({
    actorId,
    action: statusChanged ? `RENTAL_${listing.status}` : 'RENTAL_UPDATED',
    targetType: 'RentalListing',
    targetId: id,
    meta: { title: listing.title, ...(listing.rejectionReason ? { reason: listing.rejectionReason } : {}) },
  })

  const notice = statusChanged ? STATUS_NOTICE[listing.status] : undefined
  if (notice && listing.ownerId) {
    const [title, text] = notice(listing)
    await createNotification(listing.ownerId, 'SYSTEM', title, text, listing.id).catch(() => {})
  }
  return listing
}

export async function deleteAdmin(id: string, actorId: string) {
  const existing = await prisma.rentalListing.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError('E’lon topilmadi')
  await prisma.rentalListing.delete({ where: { id } })
  await writeAudit({ actorId, action: 'RENTAL_DELETED', targetType: 'RentalListing', targetId: id, meta: { title: existing.title } })
}

// ---------------------------------------------------------------------------------------------
// Telegram bot — one card at a time
// ---------------------------------------------------------------------------------------------

const VEHICLE_LABELS: Record<RentalVehicleType, string> = {
  SCOOTER: 'Skuter',
  E_SCOOTER: 'Elektr samokat',
  BICYCLE: 'Velosiped',
  E_BIKE: 'Elektr velosiped',
  MOTORCYCLE: 'Mototsikl',
}

function som(n: number) {
  return `${new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ')} so'm`
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export interface BrowseCard {
  id: string
  kind: 'listing' | 'point'
  title: string
  badge: string
  owner: string | null
  price: string | null
  deposit: string | null
  specs: string | null
  hours: string | null
  address: string | null
  description: string | null
  phone: string | null
  telegram: string | null
  lat: number | null
  lng: number | null
  photo: string | null
  featured: boolean
}

async function browseCards(kind: 'listing' | 'point'): Promise<(BrowseCard & { createdAt: Date })[]> {
  if (kind === 'point') {
    const places = await prisma.mapPlace.findMany({ where: { active: true, category: 'SCOOTER' }, orderBy: { updatedAt: 'desc' } })
    return places.map((p) => {
      const prices = Array.isArray(p.prices) ? (p.prices as { title: string; price: number }[]) : []
      return {
        id: p.id,
        kind,
        title: p.name,
        badge: 'Ijara nuqtasi',
        owner: p.brand,
        price: prices.length ? prices.slice(0, 4).map((r) => `${r.title}: ${som(r.price)}`).join(' · ') : null,
        deposit: null,
        specs: null,
        hours: p.hours,
        address: p.address,
        description: p.description ? p.description.slice(0, 400) : null,
        phone: p.phone,
        telegram: null,
        lat: p.lat,
        lng: p.lng,
        photo: p.imageUrl,
        featured: false,
        createdAt: p.createdAt,
      }
    })
  }

  const rows = await prisma.rentalListing.findMany({
    where: { status: 'APPROVED', active: true },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    take: 300,
  })
  return rows.map((l) => {
    const prices = [
      l.pricePerHour ? `${som(l.pricePerHour)}/soat` : null,
      l.pricePerDay ? `${som(l.pricePerDay)}/kun` : null,
      l.pricePerWeek ? `${som(l.pricePerWeek)}/hafta` : null,
    ].filter(Boolean)
    const specs = [
      l.maxSpeed ? `${l.maxSpeed} km/soat` : null,
      l.rangeKm ? `${l.rangeKm} km zaryad` : null,
      l.licenseRequired ? 'guvohnoma kerak' : null,
    ].filter(Boolean)
    const photos = photosOf(l)
    return {
      id: l.id,
      kind,
      title: l.title,
      badge: VEHICLE_LABELS[l.vehicleType],
      owner: l.ownerType === 'COMPANY' ? l.companyName : l.contactName,
      price: prices.join(' · ') || null,
      deposit: l.deposit ? som(l.deposit) : null,
      specs: specs.join(' · ') || null,
      hours: null,
      address: l.address,
      description: l.description ? l.description.slice(0, 400) : null,
      phone: l.phone,
      telegram: l.telegram,
      lat: l.lat,
      lng: l.lng,
      photo: photos[0] ?? null,
      featured: l.featured,
      createdAt: l.createdAt,
    }
  })
}

/**
 * The bot shows one listing (or rental point) per message with ◀️ / ▶️. With the user's
 * location the nearest come first (ones without a pin go last); otherwise TOP, then newest.
 * `index` wraps around, so "next" on the last card shows the first.
 */
export async function browse(q: { kind: 'listing' | 'point'; lat?: number; lng?: number; index: number }) {
  const cards = await browseCards(q.kind)
  const origin = q.lat != null && q.lng != null ? { lat: q.lat, lng: q.lng } : null
  const withKm = cards.map((c) => ({
    ...c,
    distanceKm: origin && c.lat != null && c.lng != null ? haversineKm(origin, { lat: c.lat, lng: c.lng }) : null,
  }))
  if (origin) {
    withKm.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
  }

  const total = withKm.length
  if (!total) return { kind: q.kind, total: 0, index: 0, item: null }
  const index = ((q.index % total) + total) % total
  const { createdAt: _createdAt, ...item } = withKm[index]
  return { kind: q.kind, total, index, item }
}
