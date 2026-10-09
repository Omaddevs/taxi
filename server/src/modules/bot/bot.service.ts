import { randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { setApplicationBlocked } from '../drivers/applications.service.js'
import { normalizePhone } from '../../lib/otp.js'
import { NotFoundError } from '../../errors/AppError.js'
import { markChannel } from '../people/people.service.js'
import * as ratingsService from '../ratings/ratings.service.js'
import { startSubscriptionOnApproval } from '../subscriptions/subscriptions.lifecycle.js'
import type { RatingDirection } from '@prisma/client'

const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000

export async function resolveUserByPhone(rawPhone: string) {
  const phone = normalizePhone(rawPhone)
  const user = await prisma.user.findUnique({ where: { phone } })
  if (!user) throw new NotFoundError('User not found')
  return user
}

export async function linkUser(input: {
  phone: string
  telegramId: string
  language?: string
  name?: string
  role?: 'PASSENGER' | 'DRIVER'
  source?: 'BOT' | 'GROUP' | 'WEBAPP'
  telegramUsername?: string
}) {
  const phone = normalizePhone(input.phone)
  const source = input.source || 'BOT'

  await prisma.user.updateMany({
    where: { telegramId: input.telegramId, NOT: { phone } },
    data: { telegramId: null },
  })

  const roleUpdate = input.role === 'DRIVER' ? ({ role: 'DRIVER' as const }) : {}

  return prisma.user.upsert({
    where: { phone },
    update: {
      telegramId: input.telegramId,
      ...(input.language ? { language: input.language } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.telegramUsername ? { telegramUsername: input.telegramUsername } : {}),
      ...roleUpdate,
      ...markChannel(source),
    },
    create: {
      phone,
      role: input.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER',
      telegramId: input.telegramId,
      language: input.language,
      name: input.name,
      telegramUsername: input.telegramUsername,
      signupSource: source,
      ...markChannel(source),
    },
  })
}

export async function touchChannel(telegramId: string, source: 'BOT' | 'GROUP' | 'WEBAPP') {
  const user = await prisma.user.findUnique({ where: { telegramId } })
  if (!user) throw new NotFoundError('User not found')
  return prisma.user.update({
    where: { id: user.id },
    data: markChannel(source),
  })
}

// Called whenever the bot creates, re-renders, approves or rejects a driver application so the
// same phone logs into the webapp as DRIVER (with a Driver row the dashboard /me/stats endpoints
// need), and so bot applications show up in the admin panel's "Haydovchi arizalari".
export async function syncDriver(input: {
  phone: string
  telegramId: string
  name?: string
  carModel: string
  plate: string
  approved: boolean
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  newApplication?: boolean
  rejectionReason?: string
  gender?: 'MALE' | 'FEMALE'
  region?: string
  toRegion?: string
  blocked?: boolean
}) {
  const status = input.status ?? (input.approved ? 'APPROVED' : 'PENDING')

  // Only promote to DRIVER once actually approved — a pending applicant must stay a normal
  // passenger in the webapp (PassengerShell redirects any role=DRIVER user to /driver, which
  // would lock them out of ordering rides while still just under review), mirroring the same
  // "no driver menu until APPROVED" rule already enforced on the bot side.
  const user = await linkUser({
    phone: input.phone,
    telegramId: input.telegramId,
    name: input.name,
    role: status === 'APPROVED' ? 'DRIVER' : undefined,
  })

  if (input.gender && user.gender !== input.gender) {
    await prisma.user.update({ where: { id: user.id }, data: { gender: input.gender } })
  }

  const existingDriver = await prisma.driver.findUnique({ where: { userId: user.id } })
  // The bot re-syncs on every menu render. A PENDING there must never revoke an approval granted
  // from the admin panel (e.g. if the bot missed that notification) — only a fresh application
  // or an explicit rejection does.
  const approved =
    status === 'APPROVED'
      ? true
      : input.newApplication || status === 'REJECTED'
        ? false
        : (existingDriver?.approved ?? false)

  const driver = await prisma.driver.upsert({
    where: { userId: user.id },
    update: { carModel: input.carModel, plate: input.plate, approved, ...(approved ? {} : { online: false }) },
    create: { userId: user.id, carModel: input.carModel, plate: input.plate, approved },
  })
  // Approved from Telegram: the subscription month starts today, same as an admin-panel approval.
  if (approved && !existingDriver?.approved) await startSubscriptionOnApproval(driver.id)

  let result = user
  if (!approved && existingDriver?.approved && user.role === 'DRIVER') {
    result = await prisma.user.update({ where: { id: user.id }, data: { role: 'PASSENGER' } })
  }

  const fields = {
    // linkUser above found/created the user by this number, so user.phone is set.
    fullName: input.name || user.name || user.phone || input.phone,
    phone: user.phone ?? input.phone,
    carModel: input.carModel,
    plate: input.plate,
    ...(input.region ? { region: input.region } : {}),
    ...(input.toRegion ? { toRegion: input.toRegion } : {}),
  }
  const application = await prisma.driverApplication.findUnique({ where: { userId: user.id } })
  const created = { source: 'BOT' }

  if (status === 'PENDING') {
    if (!application) {
      await prisma.driverApplication.create({ data: { userId: user.id, ...fields, ...created } })
    } else if (input.newApplication) {
      await prisma.driverApplication.update({
        where: { id: application.id },
        data: {
          ...fields,
          status: 'PENDING',
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: new Date(),
        },
      })
    } else if (application.status === 'PENDING') {
      await prisma.driverApplication.update({ where: { id: application.id }, data: fields })
    }
  } else if (status === 'APPROVED') {
    if (!application) {
      await prisma.driverApplication.create({
        data: { userId: user.id, ...fields, ...created, status: 'APPROVED', reviewedAt: new Date() },
      })
    } else if (application.status !== 'APPROVED') {
      await prisma.driverApplication.update({
        where: { id: application.id },
        data: { ...fields, status: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
      })
    }
  } else {
    const rejection = { status: 'REJECTED' as const, reviewedAt: new Date(), rejectionReason: input.rejectionReason ?? null }
    if (!application) {
      await prisma.driverApplication.create({ data: { userId: user.id, ...fields, ...created, ...rejection } })
    } else if (application.status !== 'REJECTED') {
      await prisma.driverApplication.update({ where: { id: application.id }, data: rejection })
    }
  }

  if (input.blocked !== undefined) {
    const row = await prisma.driverApplication.findUnique({ where: { userId: user.id } })
    if (row) await setApplicationBlocked(row.id, input.blocked, null, undefined, { fromBot: true })
  }

  return result
}

export async function issueTelegramLoginToken(telegramId: string) {
  const user = await prisma.user.findUnique({ where: { telegramId } })
  if (!user) throw new NotFoundError('User not found')

  const code = randomBytes(24).toString('hex')
  const token = await prisma.telegramLoginToken.create({
    data: { userId: user.id, code, expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS) },
  })

  return { code: token.code, expiresAt: token.expiresAt }
}

export async function rateViaBot(input: {
  raterTelegramId: string
  rateeTelegramId: string
  tripRef: string
  direction: RatingDirection
  stars: number
  tags?: string[]
  comment?: string
}) {
  const [rater, ratee] = await Promise.all([
    prisma.user.findUnique({ where: { telegramId: input.raterTelegramId } }),
    prisma.user.findUnique({ where: { telegramId: input.rateeTelegramId } }),
  ])
  if (!rater || !ratee) throw new NotFoundError('Foydalanuvchi topilmadi')

  await ratingsService.submitRating({
    tripRef: input.tripRef,
    raterUserId: rater.id,
    rateeUserId: ratee.id,
    direction: input.direction,
    stars: input.stars,
    tags: input.tags,
    comment: input.comment,
  })
}
