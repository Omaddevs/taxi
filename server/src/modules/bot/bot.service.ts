import { randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { NotFoundError } from '../../errors/AppError.js'
import { markChannel } from '../people/people.service.js'
import * as ratingsService from '../ratings/ratings.service.js'
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

// Called whenever the bot creates or approves a driver application so the same phone logs
// into the webapp as DRIVER (with a Driver row the dashboard /me/stats endpoints need).
export async function syncDriver(input: {
  phone: string
  telegramId: string
  name?: string
  carModel: string
  plate: string
  approved: boolean
}) {
  // Only promote to DRIVER once actually approved — a pending applicant must stay a normal
  // passenger in the webapp (PassengerShell redirects any role=DRIVER user to /driver, which
  // would lock them out of ordering rides while still just under review), mirroring the same
  // "no driver menu until APPROVED" rule already enforced on the bot side.
  const user = await linkUser({
    phone: input.phone,
    telegramId: input.telegramId,
    name: input.name,
    role: input.approved ? 'DRIVER' : undefined,
  })

  await prisma.driver.upsert({
    where: { userId: user.id },
    update: {
      carModel: input.carModel,
      plate: input.plate,
      approved: input.approved,
    },
    create: {
      userId: user.id,
      carModel: input.carModel,
      plate: input.plate,
      approved: input.approved,
    },
  })

  return user
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
