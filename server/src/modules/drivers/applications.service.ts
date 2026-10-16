import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ConflictError, NotFoundError } from '../../errors/AppError.js'
import { normalizePhone } from '../../lib/otp.js'
import { writeAudit } from '../../lib/audit.js'
import { notifyDriverReviewed } from '../../lib/botNotify.js'
import { setBotDriverBlocked, updateBotDriverProfile } from '../../lib/botBridge.js'
import { startSubscriptionOnApproval } from '../subscriptions/subscriptions.lifecycle.js'
import { attachDocuments, removeOwnerFiles } from '../leads/leadDocuments.service.js'

// "Haydovchi arizalari" in the admin panel — applications from the website, the Telegram bot
// wizard (mirrored in by bot.service#syncDriver) and ones typed in by staff.

const APPLICATION_INCLUDE = {
  user: { select: { id: true, phone: true, name: true, telegramId: true, telegramUsername: true, gender: true } },
  // Uploaded with the website form — metadata only; the bytes are read through
  // /admin/drivers/applications/documents/:docId.
  documents: {
    select: { id: true, kind: true, fileName: true, mime: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.DriverApplicationInclude

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export async function listApplications(filter: {
  status?: ApplicationStatus
  source?: string
  blocked?: boolean
  q?: string
}) {
  const where: Prisma.DriverApplicationWhereInput = {}
  if (filter.status) where.status = filter.status
  if (filter.source) where.source = filter.source
  if (filter.blocked !== undefined) where.blocked = filter.blocked
  if (filter.q) {
    const contains = { contains: filter.q, mode: 'insensitive' as const }
    where.OR = [{ fullName: contains }, { phone: contains }, { plate: contains }, { carModel: contains }, { region: contains }]
  }
  return prisma.driverApplication.findMany({ where, orderBy: { createdAt: 'desc' }, include: APPLICATION_INCLUDE, take: 500 })
}

async function getOrThrow(id: string) {
  const application = await prisma.driverApplication.findUnique({ where: { id } })
  if (!application) throw new NotFoundError('Ariza topilmadi')
  return application
}

/**
 * Approve or reject — also a change of mind on an already reviewed application: rejecting an
 * approved driver takes their driver access away, approving a rejected one grants it.
 */
export async function reviewApplication(id: string, actorId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  const application = await getOrThrow(id)
  if (application.blocked) throw new ConflictError('Ariza bloklangan. Avval blokdan chiqaring')
  if (application.status === status) throw new ConflictError('Ariza allaqachon shu holatda')
  // The website form does not ask about the car; a driver cannot be created without one.
  if (status === 'APPROVED' && (!application.carModel.trim() || !application.plate.trim())) {
    throw new ConflictError('Tasdiqlashdan oldin avtomobil rusumi va davlat raqamini kiriting (Tahrirlash)')
  }

  const { reviewed, approvedDriverId } = await prisma.$transaction(async (tx) => {
    const updated = await tx.driverApplication.update({
      where: { id },
      data: {
        status,
        reviewedBy: actorId,
        reviewedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? (rejectionReason ?? null) : null,
      },
    })

    let approvedDriverId: string | null = null
    if (status === 'APPROVED') {
      const driver = await tx.driver.upsert({
        where: { userId: application.userId },
        update: { carModel: application.carModel, plate: application.plate, approved: true },
        create: { userId: application.userId, carModel: application.carModel, plate: application.plate, approved: true },
      })
      approvedDriverId = driver.id
      await tx.user.update({ where: { id: application.userId }, data: { role: 'DRIVER' } })
    } else {
      const driver = await tx.driver.findUnique({ where: { userId: application.userId } })
      if (driver?.approved) {
        await tx.driver.update({ where: { id: driver.id }, data: { approved: false, online: false } })
        await tx.user.update({ where: { id: application.userId }, data: { role: 'PASSENGER' } })
      }
    }
    return { reviewed: updated, approvedDriverId }
  })

  if (approvedDriverId) await startSubscriptionOnApproval(approvedDriverId)

  const user = await prisma.user.findUnique({ where: { id: application.userId }, select: { telegramId: true, phone: true, gender: true } })
  if (user) {
    await notifyDriverReviewed({
      telegramId: user.telegramId,
      phone: user.phone ?? application.phone,
      gender: user.gender,
      status,
      rejectionReason: rejectionReason ?? null,
    })
  }
  await writeAudit({
    actorId,
    action: status === 'APPROVED' ? 'DRIVER_APPLICATION_APPROVED' : 'DRIVER_APPLICATION_REJECTED',
    targetType: 'DriverApplication',
    targetId: id,
    meta: { fullName: application.fullName, ...(rejectionReason ? { reason: rejectionReason } : {}) },
  })
  return reviewed
}

export interface ApplicationFields {
  fullName?: string
  carModel?: string
  plate?: string
  region?: string
  toRegion?: string
  gender?: 'MALE' | 'FEMALE'
}

/** Fix typos in an application; the driver card and the bot's profile follow along. */
export async function updateApplication(id: string, fields: ApplicationFields, actorId: string) {
  const application = await getOrThrow(id)
  const { gender, ...rest } = fields
  const data: Prisma.DriverApplicationUpdateInput = { ...rest }
  for (const key of ['region', 'toRegion'] as const) if (key in rest) data[key] = rest[key] || null
  if (rest.plate) data.plate = rest.plate.toUpperCase()

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.driverApplication.update({ where: { id }, data, include: APPLICATION_INCLUDE })
    if (rest.carModel || rest.plate) {
      await tx.driver.updateMany({ where: { userId: application.userId }, data: { carModel: result.carModel, plate: result.plate } })
    }
    if (gender) await tx.user.update({ where: { id: application.userId }, data: { gender } })
    if (rest.fullName) await tx.user.update({ where: { id: application.userId }, data: { name: rest.fullName } })
    return result
  })

  await updateBotDriverProfile({
    telegramId: updated.user.telegramId,
    phone: updated.user.phone ?? updated.phone,
    fullName: updated.fullName,
    carModel: updated.carModel,
    plate: updated.plate,
    region: updated.region,
    toRegion: updated.toRegion,
    gender: gender ?? null,
  }).catch((err) => console.error('updateBotDriverProfile failed:', err))

  await writeAudit({ actorId, action: 'DRIVER_APPLICATION_UPDATED', targetType: 'DriverApplication', targetId: id, meta: { fullName: updated.fullName } })
  return updated
}

/**
 * Block keeps the record but shuts the person out: their Driver row (if any) is archived — no
 * orders, no offers, back to passenger — and the bot's profile is blocked too. Unblock undoes it.
 * `fromBot` skips the echo back to the bot when the change started there.
 */
export async function setApplicationBlocked(
  id: string,
  blocked: boolean,
  actorId: string | null,
  reason?: string,
  { fromBot = false }: { fromBot?: boolean } = {},
) {
  const application = await getOrThrow(id)
  if (application.blocked === blocked) return prisma.driverApplication.findUniqueOrThrow({ where: { id }, include: APPLICATION_INCLUDE })

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.driverApplication.update({
      where: { id },
      data: { blocked, blockedReason: blocked ? (reason ?? null) : null },
      include: APPLICATION_INCLUDE,
    })
    const driver = await tx.driver.findUnique({ where: { userId: application.userId } })
    if (driver && blocked && !driver.archivedAt) {
      await tx.driver.update({
        where: { id: driver.id },
        data: { archivedAt: new Date(), archivedReason: `Bloklangan${reason ? `: ${reason}` : ''}`, online: false },
      })
      await tx.user.update({ where: { id: application.userId }, data: { role: 'PASSENGER' } })
    }
    if (driver && !blocked && driver.archivedAt) {
      await tx.driver.update({ where: { id: driver.id }, data: { archivedAt: null, archivedReason: null } })
      if (driver.approved) await tx.user.update({ where: { id: application.userId }, data: { role: 'DRIVER' } })
    }
    return result
  })

  if (!fromBot) {
    await setBotDriverBlocked({ telegramId: updated.user.telegramId, phone: updated.user.phone ?? updated.phone, blocked }).catch((err) =>
      console.error('setBotDriverBlocked failed:', err),
    )
  }
  if (actorId) {
    await writeAudit({
      actorId,
      action: blocked ? 'DRIVER_APPLICATION_BLOCKED' : 'DRIVER_APPLICATION_UNBLOCKED',
      targetType: 'DriverApplication',
      targetId: id,
      meta: { fullName: updated.fullName, ...(reason ? { reason } : {}) },
    })
  }
  return updated
}

/** Staff typing in an application for someone (a phone call, a walk-in). */
export async function createApplication(
  input: { fullName: string; phone: string; carModel: string; plate: string; region?: string; toRegion?: string; gender?: 'MALE' | 'FEMALE'; approve?: boolean },
  actorId: string,
) {
  const phone = normalizePhone(input.phone)
  const user = await prisma.user.upsert({
    where: { phone },
    update: input.gender ? { gender: input.gender } : {},
    create: { phone, name: input.fullName, gender: input.gender },
  })
  const existing = await prisma.driverApplication.findUnique({ where: { userId: user.id } })
  if (existing) throw new ConflictError('Bu raqam bilan ariza allaqachon bor. Ro‘yxatdan toping')

  const created = await prisma.driverApplication.create({
    data: {
      userId: user.id,
      fullName: input.fullName,
      phone,
      carModel: input.carModel,
      plate: input.plate.toUpperCase(),
      region: input.region || null,
      toRegion: input.toRegion || null,
      source: 'PANEL',
    },
  })
  await writeAudit({ actorId, action: 'DRIVER_APPLICATION_CREATED', targetType: 'DriverApplication', targetId: created.id, meta: { fullName: created.fullName } })

  if (input.approve) await reviewApplication(created.id, actorId, 'APPROVED')
  return prisma.driverApplication.findUniqueOrThrow({ where: { id: created.id }, include: APPLICATION_INCLUDE })
}

/**
 * The "Haydovchi bo‘ling" form on the website. The applicant gets (or already has) an account by
 * phone number and one application; sending the form again adds to that same application instead
 * of opening a second one. The car is not asked for there — staff fill it in before approving.
 */
export async function submitWebsiteApplication(input: {
  fullName?: string
  phone: string
  fromRegion?: string
  toRegion?: string
  tokens: string[]
  consentAt?: Date
  consentVersion?: string | null
}) {
  const user = await prisma.user.upsert({
    where: { phone: input.phone },
    update: {},
    create: { phone: input.phone, name: input.fullName ?? null },
  })
  // The landing hero sends only a phone: fall back to the account's name, else a marker the
  // operator fills in after the call.
  const fullName = input.fullName || user.name || 'Ism kiritilmagan'
  const consent = input.consentAt ? { consentAt: input.consentAt, consentVersion: input.consentVersion ?? null } : {}
  const route = { ...(input.fromRegion ? { region: input.fromRegion } : {}), ...(input.toRegion ? { toRegion: input.toRegion } : {}) }

  const existing = await prisma.driverApplication.findUnique({ where: { userId: user.id } })
  if (existing?.blocked) throw new ConflictError('Arizangiz bloklangan. Yordam xizmatiga murojaat qiling')
  const application = existing
    ? await prisma.driverApplication.update({ where: { id: existing.id }, data: { ...route, ...consent } })
    : await prisma.driverApplication.create({
        data: { userId: user.id, fullName, phone: input.phone, carModel: '', plate: '', source: 'WEBAPP', ...route, ...consent },
      })
  return { ok: true, duplicate: Boolean(existing), documents: await attachDocuments({ applicationId: application.id }, input.tokens) }
}

/**
 * Deletes the application with everything it brought: the uploaded documents (rows and files)
 * and — when the account exists only because of this application (never signed in, no Telegram
 * or Google link, not a driver) — the account itself. An approved driver keeps working: archive
 * or block them for that.
 */
export async function deleteApplication(id: string, actorId: string) {
  const application = await getOrThrow(id)
  await removeOwnerFiles({ applicationId: id })
  await prisma.driverApplication.delete({ where: { id } })

  const user = await prisma.user.findUnique({
    where: { id: application.userId },
    select: { telegramId: true, googleId: true, passwordHash: true, staffKind: true, driver: { select: { id: true } }, _count: { select: { refreshTokens: true } } },
  })
  const bare = user && !user.telegramId && !user.googleId && !user.passwordHash && !user.staffKind && !user.driver && user._count.refreshTokens === 0
  if (bare) {
    // Anything else still pointing at the account (a lead it owns, a booking) keeps it alive.
    await prisma.user.delete({ where: { id: application.userId } }).catch(() => {})
  }
  await writeAudit({ actorId, action: 'DRIVER_APPLICATION_DELETED', targetType: 'DriverApplication', targetId: id, meta: { fullName: application.fullName } })
}
