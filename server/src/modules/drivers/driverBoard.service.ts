import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/AppError.js'

// "Haydovchilar" section of the passenger app: drivers' own ads (the ride offers they post from
// their driver profile → "Reys joylash") with who the driver is, plus a public driver profile.
// Passengers reach a driver straight from here — call, chat, or book a seat.

const SHOWN_FOR_MS = 2 * 60 * 60 * 1000 // an offer stays listed until 2 h after departure

const DRIVER_SELECT = {
  id: true,
  userId: true,
  carModel: true,
  plate: true,
  carImageUrl: true,
  ratingAvg: true,
  ratingCount: true,
  tripsCount: true,
  online: true,
  createdAt: true,
  user: { select: { name: true, avatarUrl: true, phone: true, gender: true } },
} as const

type DriverRow = {
  id: string
  userId: string
  carModel: string
  plate: string
  carImageUrl: string | null
  ratingAvg: number
  ratingCount: number
  tripsCount: number
  online: boolean
  createdAt: Date
  user: { name: string | null; avatarUrl: string | null; phone: string | null; gender: string | null }
}

function driverCard(d: DriverRow) {
  return {
    id: d.id,
    userId: d.userId,
    name: d.user.name || 'Haydovchi',
    avatarUrl: d.user.avatarUrl,
    phone: d.user.phone,
    gender: d.user.gender,
    carModel: d.carModel,
    plate: d.plate,
    carImageUrl: d.carImageUrl,
    ratingAvg: d.ratingAvg,
    ratingCount: d.ratingCount,
    tripsCount: d.tripsCount,
    online: d.online,
    memberSince: d.createdAt.toISOString(),
  }
}

type OfferRow = {
  id: string
  fromLabel: string
  toLabel: string
  fromAddress: string
  toAddress: string
  departAt: Date
  arriveAt: Date | null
  seatsTotal: number
  seatsAvailable: number
  luggageCapacity: number
  pricePerSeat: number
  genderPref: string | null
  notes: string | null
  contactPhones: string[]
  status: string
  service: { title: string } | null
}

function offerCard(o: OfferRow, driverPhone: string | null) {
  return {
    id: o.id,
    fromLabel: o.fromLabel,
    toLabel: o.toLabel,
    fromAddress: o.fromAddress,
    toAddress: o.toAddress,
    departAt: o.departAt.toISOString(),
    arriveAt: o.arriveAt?.toISOString() ?? null,
    seatsTotal: o.seatsTotal,
    seatsAvailable: o.seatsAvailable,
    luggageCapacity: o.luggageCapacity,
    pricePerSeat: o.pricePerSeat,
    genderPref: o.genderPref,
    notes: o.notes,
    status: o.status,
    service: o.service?.title ?? null,
    // The numbers the driver put on the ad, else their account number.
    phones: o.contactPhones.length ? o.contactPhones : driverPhone ? [driverPhone] : [],
  }
}

function liveOfferWhere() {
  return {
    status: 'ACTIVE' as const,
    deletedAt: null,
    departAt: { gte: new Date(Date.now() - SHOWN_FOR_MS) },
    driver: { approved: true, archivedAt: null },
  }
}

export async function driverBoard(filter: { from?: string; to?: string; date?: string; q?: string }) {
  const where: Record<string, unknown> = liveOfferWhere()
  // A region or district from the site's picker is looked for in the ad's title and its full
  // address, so "Urgut" also finds an ad titled "Samarqand" whose pickup address is in Urgut.
  const and: object[] = []
  const contains = (value: string) => ({ contains: value.trim(), mode: 'insensitive' as const })
  if (filter.from) and.push({ OR: [{ fromLabel: contains(filter.from) }, { fromAddress: contains(filter.from) }] })
  if (filter.to) and.push({ OR: [{ toLabel: contains(filter.to) }, { toAddress: contains(filter.to) }] })
  if (filter.q) {
    and.push({
      OR: [
        { fromLabel: contains(filter.q) },
        { toLabel: contains(filter.q) },
        { driver: { carModel: contains(filter.q) } },
        { driver: { user: { name: contains(filter.q) } } },
      ],
    })
  }
  if (and.length) where.AND = and
  if (filter.date) {
    where.departAt = {
      gte: new Date(Math.max(new Date(`${filter.date}T00:00:00+05:00`).getTime(), Date.now() - SHOWN_FOR_MS)),
      lte: new Date(`${filter.date}T23:59:59.999+05:00`),
    }
  }

  const [offers, driversActive] = await Promise.all([
    prisma.rideOffer.findMany({
      where,
      orderBy: { departAt: 'asc' },
      take: 120,
      include: { driver: { select: DRIVER_SELECT }, service: { select: { title: true } } },
    }),
    prisma.driver.count({ where: { approved: true, archivedAt: null, offers: { some: liveOfferWhere() } } }),
  ])

  return {
    driversActive,
    items: offers.map((o) => ({ ...offerCard(o, o.driver.user.phone), driver: driverCard(o.driver) })),
  }
}

export async function driverProfile(driverId: string) {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, approved: true, archivedAt: null },
    select: DRIVER_SELECT,
  })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')

  const [offers, reviews, completedTrips] = await Promise.all([
    prisma.rideOffer.findMany({
      where: { ...liveOfferWhere(), driverId },
      orderBy: { departAt: 'asc' },
      take: 30,
      include: { service: { select: { title: true } } },
    }),
    prisma.rating.findMany({
      where: { rateeUserId: driver.userId, direction: 'PASSENGER_RATES_DRIVER' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, stars: true, tags: true, comment: true, createdAt: true, rater: { select: { name: true, avatarUrl: true } } },
    }),
    prisma.booking.count({ where: { rideOffer: { driverId }, status: 'COMPLETED' } }),
  ])

  return {
    driver: { ...driverCard(driver), completedTrips },
    offers: offers.map((o) => offerCard(o, driver.user.phone)),
    reviews: reviews.map((r) => ({
      id: r.id,
      stars: r.stars,
      tags: r.tags,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      // First name only — the reviewer didn't sign up to be shown in full.
      raterName: r.rater.name?.split(' ')[0] || 'Yo‘lovchi',
      raterAvatar: r.rater.avatarUrl,
    })),
  }
}
