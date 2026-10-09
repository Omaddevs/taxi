import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { normalizePhone } from '../../lib/otp.js'
import { writeAudit } from '../../lib/audit.js'
import { notifyDriverReviewed } from '../../lib/botNotify.js'
import { setBotDriverGender } from '../../lib/botBridge.js'
import { startSubscriptionOnApproval } from '../subscriptions/subscriptions.lifecycle.js'

export async function submitApplication(
  userId: string,
  data: { fullName: string; phone: string; carModel: string; plate: string; gender: 'MALE' | 'FEMALE' },
) {
  const existing = await prisma.driverApplication.findUnique({ where: { userId } })
  await adoptPhoneIfMissing(userId, data.phone)

  if (existing?.blocked) {
    throw new ForbiddenError('Haydovchi bo‘lish uchun ariza bera olmaysiz. Qo‘llab-quvvatlash xizmatiga murojaat qiling')
  }
  if (existing?.status === 'PENDING') {
    throw new ConflictError('Arizangiz allaqachon ko‘rib chiqilmoqda')
  }
  if (existing?.status === 'APPROVED') {
    throw new ConflictError('Siz allaqachon tasdiqlangan haydovchisiz')
  }

  const payload = {
    fullName: data.fullName,
    phone: normalizePhone(data.phone),
    carModel: data.carModel,
    plate: data.plate,
    status: 'PENDING' as const,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
  }

  // Gender lives on the User (no application column) — it decides who gets women-only orders.
  await prisma.user.update({ where: { id: userId }, data: { gender: data.gender } })

  return prisma.driverApplication.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  })
}

export async function getMyApplication(userId: string) {
  return prisma.driverApplication.findUnique({ where: { userId } })
}

async function getApprovedDriverOrThrow(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } })
  if (!driver) throw new ForbiddenError('Siz hali tasdiqlangan haydovchi emassiz')
  if (!driver.approved) throw new ForbiddenError('Haydovchi profilingiz hali tasdiqlanmagan')
  return driver
}

export async function setOnlineStatus(userId: string, online: boolean) {
  const driver = await getApprovedDriverOrThrow(userId)
  return prisma.driver.update({ where: { id: driver.id }, data: { online } })
}

export async function updateLocation(userId: string, lat: number, lng: number) {
  const driver = await getApprovedDriverOrThrow(userId)
  return prisma.driver.update({
    where: { id: driver.id },
    data: { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() },
  })
}

export async function updateMe(
  userId: string,
  patch: { carModel?: string; plate?: string; licenseNumber?: string },
) {
  const driver = await getApprovedDriverOrThrow(userId)
  return prisma.driver.update({
    where: { id: driver.id },
    data: patch,
    include: { user: { select: { name: true, phone: true, avatarUrl: true } } },
  })
}

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

export async function getStats(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { user: { select: { name: true, phone: true, avatarUrl: true, balance: true } } },
  })
  if (!driver) throw new NotFoundError('Driver profile not found')

  const today = startOfDay()
  const yesterday = startOfDay(new Date(today.getTime() - 24 * 60 * 60 * 1000))
  const weekAgo = startOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000))

  const driverFilter = { rideOffer: { driverId: driver.id } }

  const [todayCompleted, yesterdayCompleted, weekCompleted, statusGroups, topOrders, allCompleted, todayPayments] = await Promise.all([
    prisma.booking.findMany({
      where: { ...driverFilter, status: 'COMPLETED', updatedAt: { gte: today } },
      select: {
        totalPrice: true,
        rideOffer: { select: { fromLat: true, fromLng: true, toLat: true, toLng: true } },
      },
    }),
    prisma.booking.findMany({
      where: { ...driverFilter, status: 'COMPLETED', updatedAt: { gte: yesterday, lt: today } },
      select: { totalPrice: true },
    }),
    prisma.booking.findMany({
      where: { ...driverFilter, status: 'COMPLETED', updatedAt: { gte: weekAgo } },
      select: { totalPrice: true, updatedAt: true, createdAt: true },
    }),
    prisma.booking.groupBy({
      by: ['status'],
      where: driverFilter,
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { ...driverFilter, status: 'COMPLETED' },
      orderBy: { totalPrice: 'desc' },
      take: 5,
      select: { id: true, fromLabel: true, toLabel: true, fromAddress: true, toAddress: true, totalPrice: true },
    }),
    prisma.booking.findMany({
      where: { ...driverFilter, status: 'COMPLETED' },
      select: { createdAt: true, totalPrice: true },
    }),
    prisma.transaction.findMany({
      where: {
        type: 'RIDE_PAYMENT',
        status: 'SUCCESS',
        createdAt: { gte: today },
        booking: driverFilter,
      },
      select: { amount: true, provider: true },
    }),
  ])

  const todayEarnings = todayCompleted.reduce((s, b) => s + b.totalPrice, 0)
  const todayDistanceKm = todayCompleted.reduce((s, b) => {
    const { fromLat, fromLng, toLat, toLng } = b.rideOffer
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return s
    return s + haversineKm({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng })
  }, 0)
  const yesterdayEarnings = yesterdayCompleted.reduce((s, b) => s + b.totalPrice, 0)
  const growthPct =
    yesterdayEarnings > 0 ? Math.round(((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 1000) / 10 : todayEarnings > 0 ? 100 : 0

  const counts: Record<string, number> = {}
  for (const row of statusGroups) counts[row.status] = row._count._all
  const active = (counts.PENDING || 0) + (counts.ACCEPTED || 0) + (counts.ONGOING || 0)
  const completed = counts.COMPLETED || 0
  const cancelled = counts.CANCELLED || 0

  const dailyMap = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    dailyMap.set(dayKey(new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000)), 0)
  }
  for (const b of weekCompleted) {
    const key = dayKey(b.updatedAt)
    dailyMap.set(key, (dailyMap.get(key) || 0) + b.totalPrice)
  }

  const hourlyActivity = Array.from({ length: 24 }, () => 0)
  for (const b of allCompleted) {
    hourlyActivity[b.createdAt.getHours()] += 1
  }

  const PROVIDER_LABELS: Record<string, string> = { cash: 'Naqd', click: 'Click', payme: 'Payme', mock: 'Boshqa' }
  const sourceMap = new Map<string, number>()
  for (const t of todayPayments) {
    const key = t.provider ?? 'mock'
    sourceMap.set(key, (sourceMap.get(key) || 0) + Math.abs(t.amount))
  }
  const incomeSources = [...sourceMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([provider, amount]) => ({ provider, label: PROVIDER_LABELS[provider] ?? provider, amount }))

  return {
    tripsCount: driver.tripsCount,
    ratingAvg: driver.ratingAvg,
    ratingCount: driver.ratingCount,
    online: driver.online,
    approved: driver.approved,
    todayEarnings,
    todayTrips: todayCompleted.length,
    todayDistanceKm: Math.round(todayDistanceKm * 10) / 10,
    yesterdayEarnings,
    growthPct,
    balance: driver.user.balance,
    carModel: driver.carModel,
    plate: driver.plate,
    carImageUrl: driver.carImageUrl,
    name: driver.user.name,
    phone: driver.user.phone,
    counts: {
      all: active + completed + cancelled,
      active,
      completed,
      cancelled,
    },
    dailyEarnings: [...dailyMap.entries()].map(([date, amount]) => ({ date, amount })),
    hourlyActivity,
    topOrders,
    incomeSources,
  }
}

const DRIVER_USER_SELECT = {
  id: true,
  phone: true,
  name: true,
  avatarUrl: true,
  telegramId: true,
  balance: true,
  gender: true,
} as const

export async function listDrivers(filter: { online?: boolean; approved?: boolean; archived?: boolean }) {
  const { archived, ...rest } = filter
  return prisma.driver.findMany({
    where: { ...rest, archivedAt: archived ? { not: null } : null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: DRIVER_USER_SELECT },
      subscription: { select: { status: true, expiresAt: true } },
    },
  })
}

export async function listLiveDrivers() {
  return prisma.driver.findMany({
    where: { online: true },
    orderBy: { locationUpdatedAt: 'desc' },
    include: { user: { select: DRIVER_USER_SELECT } },
  })
}

export async function getDriverById(id: string) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { user: { select: { ...DRIVER_USER_SELECT, ratingAvg: true, ratingCount: true, createdAt: true } } },
  })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')

  const [recentOffers, recentBookings] = await Promise.all([
    prisma.rideOffer.findMany({
      where: { driverId: id, OR: [{ deletedAt: null }, { bookings: { some: {} } }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { service: true },
    }),
    prisma.booking.findMany({
      where: { rideOffer: { driverId: id } },
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
        rider: { select: { id: true, name: true, phone: true } },
      },
    }),
  ])

  return { ...driver, recentOffers, recentBookings }
}

export async function setApproved(driverId: string, approved: boolean) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.driver.update({
      where: { id: driverId },
      data: { approved, online: approved ? driver.online : false },
      include: { user: { select: DRIVER_USER_SELECT } },
    })
    await tx.user.update({
      where: { id: driver.userId },
      data: { role: approved ? 'DRIVER' : 'PASSENGER' },
    })
    if (approved) {
      // Approving from the Drivers list settles a still-pending application too, so it doesn't
      // linger under "Haydovchi arizalari" → Kutilmoqda.
      await tx.driverApplication.updateMany({
        where: { userId: driver.userId, status: 'PENDING' },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      })
    }
    return result
  })

  if (approved && !driver.approved) {
    await startSubscriptionOnApproval(driverId)
    await notifyDriverReviewed({
      telegramId: updated.user.telegramId,
      phone: updated.user.phone ?? '',
      status: 'APPROVED',
      gender: updated.user.gender,
    })
  }
  return updated
}

export async function setDriverGender(driverId: string, actorId: string, gender: 'MALE' | 'FEMALE' | null) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')

  const user = await prisma.user.update({
    where: { id: driver.userId },
    data: { gender },
    select: { telegramId: true, phone: true },
  })
  // The bot decides who gets women-only orders from its own DriverProfile — keep it in step.
  // Best-effort: a downed bot must not undo the admin's change here.
  await setBotDriverGender({ telegramId: user.telegramId, phone: user.phone ?? '', gender }).catch((err) => {
    console.error('setBotDriverGender failed:', err)
  })
  await writeAudit({ actorId, action: 'DRIVER_GENDER_SET', targetType: 'Driver', targetId: driverId, meta: { gender } })

  return prisma.driver.findUnique({ where: { id: driverId }, include: { user: { select: DRIVER_USER_SELECT } } })
}

export async function archiveDriver(driverId: string, actorId: string, reason?: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')
  if (driver.archivedAt) throw new ConflictError('Haydovchi allaqachon arxivlangan')

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.driver.update({
      where: { id: driverId },
      data: { archivedAt: new Date(), archivedReason: reason ?? null, online: false },
      include: { user: { select: DRIVER_USER_SELECT } },
    })
    await tx.user.update({ where: { id: driver.userId }, data: { role: 'PASSENGER' } })
    return result
  })

  await writeAudit({
    actorId,
    action: 'DRIVER_ARCHIVED',
    targetType: 'Driver',
    targetId: driverId,
    meta: { reason: reason ?? null },
  })

  return updated
}

export async function restoreDriver(driverId: string, actorId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } })
  if (!driver) throw new NotFoundError('Haydovchi topilmadi')
  if (!driver.archivedAt) throw new ConflictError('Haydovchi arxivlanmagan')

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.driver.update({
      where: { id: driverId },
      data: { archivedAt: null, archivedReason: null },
      include: { user: { select: DRIVER_USER_SELECT } },
    })
    await tx.user.update({ where: { id: driver.userId }, data: { role: 'DRIVER' } })
    return result
  })

  await writeAudit({ actorId, action: 'DRIVER_RESTORED', targetType: 'Driver', targetId: driverId })

  return updated
}

// Public-facing driver directory: approved, not archived, best rated first. No phone or plate.
export async function listTopDrivers() {
  const drivers = await prisma.driver.findMany({
    where: { approved: true, archivedAt: null },
    orderBy: [{ ratingAvg: 'desc' }, { tripsCount: 'desc' }],
    take: 30,
    include: { user: { select: { name: true, avatarUrl: true } } },
  })
  return drivers.map((d) => ({
    id: d.id,
    name: d.user.name,
    avatarUrl: d.user.avatarUrl,
    carModel: d.carModel,
    carImageUrl: d.carImageUrl,
    ratingAvg: d.ratingAvg,
    ratingCount: d.ratingCount,
    tripsCount: d.tripsCount,
  }))
}

// A Google sign-up has no phone yet; the one typed into the driver form becomes theirs (the bot
// and admin tools find drivers by it). Taken by another account → that account must be used.
async function adoptPhoneIfMissing(userId: string, rawPhone: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  if (!user || user.phone) return
  const phone = normalizePhone(rawPhone)
  const owner = await prisma.user.findUnique({ where: { phone }, select: { id: true } })
  if (owner && owner.id !== userId) {
    throw new ConflictError('Bu raqam boshqa akkauntga tegishli. O‘sha raqam bilan kiring yoki boshqa raqam kiriting')
  }
  await prisma.user.update({ where: { id: userId }, data: { phone } })
}
