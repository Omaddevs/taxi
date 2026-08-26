import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { normalizePhone } from '../../lib/otp.js'

export async function submitApplication(
  userId: string,
  data: { fullName: string; phone: string; carModel: string; plate: string },
) {
  const existing = await prisma.driverApplication.findUnique({ where: { userId } })

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

export async function getStats(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } })
  if (!driver) throw new NotFoundError('Driver profile not found')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const todayEarnings = await prisma.transaction.aggregate({
    where: { userId, type: 'PAYOUT', status: 'SUCCESS', createdAt: { gte: startOfToday } },
    _sum: { amount: true },
  })

  return {
    tripsCount: driver.tripsCount,
    ratingAvg: driver.ratingAvg,
    online: driver.online,
    todayEarnings: todayEarnings._sum.amount ?? 0,
  }
}

export async function listApplications(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return prisma.driverApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, phone: true, name: true } } },
  })
}

export async function listDrivers(filter: { online?: boolean; approved?: boolean }) {
  return prisma.driver.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, phone: true, name: true } } },
  })
}

export async function reviewApplication(
  applicationId: string,
  adminUserId: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
) {
  const application = await prisma.driverApplication.findUnique({ where: { id: applicationId } })
  if (!application) throw new NotFoundError('Application not found')
  if (application.status !== 'PENDING') throw new ConflictError('Application already reviewed')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.driverApplication.update({
      where: { id: applicationId },
      data: { status, reviewedBy: adminUserId, reviewedAt: new Date(), rejectionReason: rejectionReason ?? null },
    })

    if (status === 'APPROVED') {
      await tx.driver.upsert({
        where: { userId: application.userId },
        update: { carModel: application.carModel, plate: application.plate, approved: true },
        create: {
          userId: application.userId,
          carModel: application.carModel,
          plate: application.plate,
          approved: true,
        },
      })
      await tx.user.update({ where: { id: application.userId }, data: { role: 'DRIVER' } })
    }

    return updated
  })
}
