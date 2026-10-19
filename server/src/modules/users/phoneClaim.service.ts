import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { normalizePhone } from '../../lib/otp.js'

// Adding or changing an account's phone (Shaxsiy ma'lumotlar, or the "add your number" dialog
// of a Google sign-up). There is no SMS, so the number is proven through @taxiline_kirish_bot:
// the site starts a claim and opens t.me/<bot>?start=ph_<token>; the person shares their contact
// there (Telegram vouches it is their own number), and the bot reports it back. The phone is
// saved — verified — only if it is the number typed on the site. Until then nothing changes, so
// nobody can park someone else's number on their account.
//
// Claims are short-lived and process-local, like the sign-in code cache: a restart only means
// the person taps the button again.

const CLAIM_TTL_MS = 10 * 60_000

type Claim = { userId: string; phone: string; expiresAt: number; done: boolean }
const claims = new Map<string, Claim>()

function prune() {
  const now = Date.now()
  for (const [token, claim] of claims) if (claim.expiresAt < now) claims.delete(token)
}

/** Refused: malformed numbers, a number another account has, and the accounts whose number is
 *  wired into something else — a driver's (their bot driver profile) and staff (their login). */
async function assertCanTake(userId: string, phone: string) {
  if (!/^\+998\d{9}$/.test(phone)) throw new ValidationError('Raqam +998 XX XXX XX XX formatida, 9 xonali bo‘lishi kerak')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, role: true, staffKind: true, driver: { select: { id: true } } },
  })
  if (!user) throw new NotFoundError('User not found')
  if (user.phone && user.phone !== phone && (user.staffKind || user.role === 'DRIVER' || user.driver)) {
    throw new ForbiddenError('Haydovchi va xodim raqamini o‘zgartirish uchun qo‘llab-quvvatlash xizmatiga yozing')
  }
  const owner = await prisma.user.findUnique({ where: { phone }, select: { id: true } })
  if (owner && owner.id !== userId) {
    throw new ConflictError('Bu raqam boshqa akkauntga tegishli. Boshqa raqam kiriting yoki o‘sha raqam bilan kiring')
  }
}

export async function startPhoneClaim(userId: string, rawPhone: string) {
  const phone = normalizePhone(rawPhone)
  await assertCanTake(userId, phone)
  prune()
  for (const [token, claim] of claims) if (claim.userId === userId) claims.delete(token)
  const token = randomBytes(16).toString('hex')
  const expiresAt = Date.now() + CLAIM_TTL_MS
  claims.set(token, { userId, phone, expiresAt, done: false })
  return { token, phone, expiresAt: new Date(expiresAt).toISOString() }
}

/** Polled by the site while it waits; only the account that started the claim can see it. */
export function phoneClaimStatus(userId: string, token: string) {
  const claim = claims.get(token)
  if (!claim || claim.userId !== userId) return { status: 'expired' as const }
  if (claim.done) return { status: 'done' as const, phone: claim.phone }
  if (claim.expiresAt < Date.now()) return { status: 'expired' as const }
  return { status: 'pending' as const }
}

export type PhoneClaimResult =
  | { status: 'ok'; phone: string }
  | { status: 'mismatch'; phone: string }
  | { status: 'expired' | 'taken' | 'locked' }

/** From the bot: `phone` comes from Telegram's contact button, checked to be the sender's own. */
export async function confirmPhoneClaim(input: {
  token: string
  phone: string
  telegramId: string
  telegramUsername?: string
}): Promise<PhoneClaimResult> {
  const claim = claims.get(input.token)
  if (!claim || claim.done || claim.expiresAt < Date.now()) return { status: 'expired' }
  if (normalizePhone(input.phone) !== claim.phone) return { status: 'mismatch', phone: claim.phone }

  try {
    await assertCanTake(claim.userId, claim.phone)
  } catch (err) {
    if (err instanceof ConflictError) return { status: 'taken' }
    if (err instanceof ForbiddenError) return { status: 'locked' }
    throw err
  }

  // The Telegram account that proved the number is linked too, when neither side has a link
  // yet — so a Google sign-up can get sign-in codes from the bot from now on.
  const user = await prisma.user.findUnique({ where: { id: claim.userId }, select: { telegramId: true } })
  const telegramTaken = await prisma.user.findUnique({ where: { telegramId: input.telegramId }, select: { id: true } })
  const linkTelegram = !user?.telegramId && !telegramTaken

  try {
    await prisma.user.update({
      where: { id: claim.userId },
      data: {
        phone: claim.phone,
        verified: true,
        ...(linkTelegram ? { telegramId: input.telegramId, telegramUsername: input.telegramUsername } : {}),
      },
    })
  } catch (err) {
    // Another account took the number in the meantime (unique phone).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { status: 'taken' }
    throw err
  }
  claim.done = true
  return { status: 'ok', phone: claim.phone }
}
