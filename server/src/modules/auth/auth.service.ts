import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { compareOtpCode, generateOtpCode, getSmsProvider, hashOtpCode, normalizePhone } from '../../lib/otp.js'
import {
  isPanelRole,
  jwtRoleFromStaff,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type JwtRole,
} from '../../lib/jwt.js'
import { sha256Hex } from '../../lib/hash.js'
import { notifyOtpViaBot } from '../../lib/botNotify.js'
import { ConflictError, TooManyRequestsError, UnauthorizedError, ValidationError } from '../../errors/AppError.js'

type OtpIntent = 'login' | 'register'
type SessionMeta = { ip?: string; userAgent?: string }

type OtpProfile = {
  intent: OtpIntent
  name?: string
  language?: string
  telegramId?: string
  telegramUsername?: string
}

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Plaintext codes are never persisted in OtpCode (only codeHash) — that's correct for the
// actual verify path, but the webapp's "autofill the box once the code arrives" convenience
// needs the plaintext back. Kept in a short-lived, process-local cache keyed by the same
// unguessable otpRequestId that already gates /auth/otp/poll, and cleared as soon as the code
// is consumed (or expires) — this exposes nothing the SMS didn't already hand the same phone.
const otpCodeCache = new Map<string, { code: string; expiresAt: number }>()

function cacheOtpCode(otpRequestId: string, code: string, expiresAt: Date) {
  otpCodeCache.set(otpRequestId, { code, expiresAt: expiresAt.getTime() })
}

function peekCachedOtpCode(otpRequestId: string): string | null {
  const entry = otpCodeCache.get(otpRequestId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    otpCodeCache.delete(otpRequestId)
    return null
  }
  return entry.code
}

function clearCachedOtpCode(otpRequestId: string) {
  otpCodeCache.delete(otpRequestId)
}

// Register collects name + language (same as taxiline-bot) and must survive the Telegram-tap
// poll path, which never re-sends the form fields. Kept next to the plaintext OTP cache and
// dropped as soon as the code is consumed.
const otpProfileById = new Map<string, OtpProfile>()
const otpProfileByPhone = new Map<string, OtpProfile>()

function normalizeName(raw?: string) {
  const name = raw?.trim().replace(/\s+/g, ' ')
  return name || undefined
}

function storeOtpProfile(otpRequestId: string, phone: string, profile: OtpProfile) {
  otpProfileById.set(otpRequestId, profile)
  otpProfileByPhone.set(phone, profile)
}

function takeOtpProfile(otpRequestId: string | undefined, phone: string, fallback?: Partial<OtpProfile>): OtpProfile {
  const cached = (otpRequestId ? otpProfileById.get(otpRequestId) : undefined) || otpProfileByPhone.get(phone)
  if (otpRequestId) otpProfileById.delete(otpRequestId)
  otpProfileByPhone.delete(phone)
  const intent: OtpIntent = fallback?.intent || cached?.intent || 'login'
  return {
    intent,
    name: normalizeName(fallback?.name) || cached?.name,
    language: fallback?.language || cached?.language,
    telegramId: cached?.telegramId,
    telegramUsername: cached?.telegramUsername,
  }
}

// A Telegram id delivered alongside the OTP profile (from a deep-link /start confirmation)
// only gets attached if it isn't already claimed by a different phone/user — telegramId is
// unique on User, and silently overwriting someone else's link would be worse than just
// skipping the attach for this one sign-in.
async function unclaimedTelegramId(telegramId: string | undefined, phone: string) {
  if (!telegramId) return undefined
  const clash = await prisma.user.findUnique({ where: { telegramId }, select: { phone: true } })
  return !clash || clash.phone === phone ? telegramId : undefined
}

async function finalizeVerifiedPhone(phone: string, profile: OtpProfile) {
  const existing = await prisma.user.findUnique({ where: { phone } })
  const name = normalizeName(profile.name)
  const language = profile.language
  const telegramId = await unclaimedTelegramId(profile.telegramId, phone)

  if (profile.intent === 'register') {
    if (existing) {
      // Phone was free at OTP request; if the bot created the same number in the meantime,
      // just log them in and fill any missing profile fields instead of 409-ing a consumed code.
      return prisma.user.update({
        where: { phone },
        data: {
          verified: true,
          fromWebapp: true,
          lastSeenAt: new Date(),
          ...(language ? { language } : {}),
          ...(!existing.name && name ? { name, firstName: name.split(' ')[0] } : {}),
          ...(telegramId ? { telegramId, telegramUsername: profile.telegramUsername } : {}),
        },
      })
    }
    if (!name) throw new ValidationError('Ism kiritilishi shart')
    return prisma.user.create({
      data: {
        phone,
        role: 'PASSENGER',
        verified: true,
        name,
        firstName: name.split(' ')[0],
        language,
        signupSource: 'WEBAPP',
        fromWebapp: true,
        lastSeenAt: new Date(),
        ...(telegramId ? { telegramId, telegramUsername: profile.telegramUsername } : {}),
      },
    })
  }

  if (!existing) {
    throw new ValidationError('Bu raqam ro‘yxatdan o‘tmagan. Avval ro‘yxatdan o‘ting')
  }

  return prisma.user.update({
    where: { phone },
    data: {
      verified: true,
      fromWebapp: true,
      lastSeenAt: new Date(),
      ...(language ? { language } : {}),
      ...(telegramId ? { telegramId, telegramUsername: profile.telegramUsername } : {}),
    },
  })
}

/** App shell identity: DRIVER if the account is a driver, never ADMIN (admin is passwordHash). */
export async function appRoleForUser(user: { id: string; role: 'PASSENGER' | 'DRIVER' | 'ADMIN' }) {
  if (user.role === 'DRIVER') return 'DRIVER' as const
  const driver = await prisma.driver.findUnique({ where: { userId: user.id }, select: { approved: true } })
  if (driver?.approved) return 'DRIVER' as const
  return 'PASSENGER' as const
}

export async function requestOtp(input: {
  phone: string
  intent?: OtpIntent
  name?: string
  language?: string
}) {
  const phone = normalizePhone(input.phone)
  const intent: OtpIntent = input.intent || 'login'
  const name = normalizeName(input.name)
  const language = input.language
  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, telegramId: true, language: true },
  })

  if (intent === 'register') {
    if (!name) throw new ValidationError('Ism kiritilishi shart')
    if (existing) throw new ConflictError('Bu raqam allaqachon ro‘yxatdan o‘tgan. Kirish sahifasidan foydalaning')
  } else if (!existing) {
    throw new ValidationError('Bu raqam ro‘yxatdan o‘tmagan. Avval ro‘yxatdan o‘ting')
  }

  const { otp, code, reused } = await issueOtpCode(phone, { intent, name, language })

  // A fresh code also goes to the linked Telegram account through @taxiline_kirish_bot. A
  // reused one (the person already asked the bot for it) isn't pushed a second time.
  if (!reused && existing?.telegramId) {
    await notifyOtpViaBot({ telegramId: existing.telegramId, language: existing.language, code, phone, intent })
  }

  return { phone, otpRequestId: otp.id }
}

// The website and @taxiline_kirish_bot hand out the same code: whichever asks first creates it,
// the other reuses it while it is still valid — so "open the bot, then type your number on the
// site" works as well as the other way round. `fresh` (the bot's «🔄 Yangi kod») forces a new
// one, but not more often than every RESEND_MIN_MS.
const RESEND_MIN_MS = 30 * 1000

async function issueOtpCode(phone: string, profile: OtpProfile, { fresh = false }: { fresh?: boolean } = {}) {
  const pending = await prisma.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  const cached = pending ? peekCachedOtpCode(pending.id) : null
  const tooSoon = pending ? Date.now() - pending.createdAt.getTime() < RESEND_MIN_MS : false
  if (pending && cached && pending.attempts < OTP_MAX_ATTEMPTS && (!fresh || tooSoon)) {
    // Keep what the earlier request knew (e.g. the Telegram id from the bot) unless overridden.
    const previous = otpProfileById.get(pending.id)
    storeOtpProfile(pending.id, phone, {
      ...previous,
      ...Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)),
    } as OtpProfile)
    return { otp: pending, code: cached, reused: true }
  }

  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)
  const otp = await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  })
  await getSmsProvider().send(phone, `TaxiLine tasdiqlash kodi: ${code}`)
  cacheOtpCode(otp.id, code, otp.expiresAt)
  storeOtpProfile(otp.id, phone, profile)
  return { otp, code, reused: false }
}

// ── @taxiline_kirish_bot ──────────────────────────────────────────────────────────────────
// The bot identifies people by Telegram id; a number they shared through Telegram's own
// "share contact" button (checked by the bot to be their own) links the two.

type KirishIdentity = {
  telegramId: string
  telegramUsername?: string
  name?: string
  language?: string
  // From Telegram's contact button, already verified by the bot to belong to this account.
  phone?: string
}

async function userForTelegram(identity: KirishIdentity) {
  const byTelegram = await prisma.user.findUnique({ where: { telegramId: identity.telegramId } })
  if (byTelegram) return byTelegram
  if (!identity.phone) return null
  const byPhone = await prisma.user.findUnique({ where: { phone: normalizePhone(identity.phone) } })
  // Telegram's contact button proves the number belongs to this Telegram account (the bot
  // checks contact.user_id), so an unlinked account is linked right away — the same way the
  // main bot links on a shared contact. One already linked to someone else is left alone.
  if (byPhone && !byPhone.telegramId) {
    return prisma.user.update({
      where: { id: byPhone.id },
      data: { telegramId: identity.telegramId, telegramUsername: identity.telegramUsername ?? byPhone.telegramUsername },
    })
  }
  return byPhone
}

export async function kirishIssueCode(identity: KirishIdentity & { intent: OtpIntent; fresh?: boolean }) {
  const user = await userForTelegram(identity)
  const phone = user?.phone ?? (identity.phone ? normalizePhone(identity.phone) : null)
  if (!phone) return { status: 'need_phone' as const }

  if (!user && identity.intent === 'login') return { status: 'not_registered' as const, phone }
  const intent: OtpIntent = user ? 'login' : 'register'
  const name = normalizeName(identity.name)
  if (intent === 'register' && !name) throw new ValidationError('Ism kiritilishi shart')

  const telegramId = await unclaimedTelegramId(identity.telegramId, phone)
  const { otp, code } = await issueOtpCode(
    phone,
    {
      intent,
      name: intent === 'register' ? name : undefined,
      language: identity.language,
      telegramId,
      telegramUsername: telegramId ? identity.telegramUsername : undefined,
    },
    { fresh: identity.fresh },
  )
  return {
    status: 'ok' as const,
    intent,
    // Asked for registration but already has an account — the bot says so and gives a login code.
    alreadyRegistered: Boolean(user) && identity.intent === 'register',
    code,
    phone,
    expiresAt: otp.expiresAt.toISOString(),
  }
}

export async function kirishProfile(identity: KirishIdentity) {
  const user = await userForTelegram(identity)
  if (!user) return { linked: false as const }
  const role = await appRoleForUser(user)
  return {
    linked: true as const,
    name: user.name,
    phone: user.phone,
    role,
    otpAutofill: user.otpAutofill,
    telegramLinked: user.telegramId === identity.telegramId,
  }
}

export async function kirishSetAutofill(identity: KirishIdentity & { enabled: boolean }) {
  const user = await userForTelegram(identity)
  if (!user) return { linked: false as const }
  // Only the Telegram account linked to this user may change it (a shared contact alone isn't enough).
  if (user.telegramId !== identity.telegramId) return { linked: false as const }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { otpAutofill: identity.enabled } })
  return { linked: true as const, otpAutofill: updated.otpAutofill }
}

// Shared by verifyOtp (typed-in code) and confirmOtpViaBot (Telegram tap) — both are just
// different ways of proving the same phone-ownership check, so they must validate/consume
// identically rather than drifting into two slightly different implementations.
async function consumeValidOtp(phone: string, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumed: false },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp || otp.expiresAt < new Date()) {
    throw new ValidationError('Kod eskirgan, qaytadan so‘rang')
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } })
    throw new TooManyRequestsError('Urinishlar soni tugadi, qaytadan kod so‘rang')
  }

  const valid = await compareOtpCode(code, otp.codeHash)
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    throw new ValidationError('Kod noto‘g‘ri')
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } })
  clearCachedOtpCode(otp.id)
  return otp
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  profile?: { intent?: OtpIntent; name?: string; language?: string },
  meta?: SessionMeta,
) {
  const phone = normalizePhone(rawPhone)
  const otp = await consumeValidOtp(phone, code)
  const user = await finalizeVerifiedPhone(phone, takeOtpProfile(otp.id, phone, profile))
  const appRole = await appRoleForUser(user)
  const tokens = await issueTokenPair(user.id, appRole, meta)
  return { user: { ...user, role: appRole }, ...tokens }
}

// Called by the bot (POST /bot/otp-confirm) when the user taps "✅ Tasdiqlash va kirish" in
// Telegram — consumes the OTP exactly like typing it in would, but doesn't issue tokens or
// touch RefreshToken (the bot has no use for a session; the webapp's poll below issues the
// actual tokens once it observes the code as consumed).
export async function confirmOtpViaBot(rawPhone: string, code: string): Promise<void> {
  const phone = normalizePhone(rawPhone)
  await consumeValidOtp(phone, code)
}

// Called by the bot when someone opens it through the webapp's `t.me/<bot>?start=otp_<id>`
// deep link and taps Start — no code typing, no phone re-entry: the unguessable otpRequestId
// from that link is proof enough (same trust level as the "✅ Tasdiqlash va kirish" tap above).
// Unlike confirmOtpViaBot, this also records who tapped Start so finalizeVerifiedPhone can link
// the phone to that Telegram account, the same way an in-bot registration would.
export async function confirmOtpByRequestId(
  otpRequestId: string,
  telegram: { telegramId: string; telegramUsername?: string },
): Promise<{ phone: string } | null> {
  const otp = await prisma.otpCode.findUnique({ where: { id: otpRequestId } })
  if (!otp || otp.consumed || otp.expiresAt < new Date()) return null

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } })
  clearCachedOtpCode(otp.id)

  const profile = otpProfileById.get(otp.id) ?? otpProfileByPhone.get(otp.phone)
  if (profile) {
    profile.telegramId = telegram.telegramId
    profile.telegramUsername = telegram.telegramUsername
  }

  return { phone: otp.phone }
}

// Polled by the webapp while showing the code-entry screen. Keyed on the unguessable
// OtpCode id (not the phone number) returned from requestOtp — that's what stops a third
// party from polling someone else's phone number and racing a legitimately typed-in verify.
// While still pending, hands back the plaintext code (from the short-lived cache above) so the
// webapp can fill the input by itself — but only for people who switched that on in
// @taxiline_kirish_bot → Sozlamalar ("avto-to'ldirish"); by default the code must be typed in.
export async function pollOtp(otpRequestId: string, meta?: SessionMeta) {
  const otp = await prisma.otpCode.findUnique({ where: { id: otpRequestId } })
  if (!otp || !otp.consumed) {
    if (!otp) return { pending: true as const, code: null }
    const owner = await prisma.user.findUnique({ where: { phone: otp.phone }, select: { otpAutofill: true } })
    return { pending: true as const, code: owner?.otpAutofill ? peekCachedOtpCode(otpRequestId) : null }
  }

  const user = await finalizeVerifiedPhone(otp.phone, takeOtpProfile(otp.id, otp.phone))
  const appRole = await appRoleForUser(user)
  const tokens = await issueTokenPair(user.id, appRole, meta)
  return { pending: false as const, user: { ...user, role: appRole }, ...tokens }
}

export async function adminLogin(rawPhone: string, password: string, meta?: SessionMeta) {
  const phone = normalizePhone(rawPhone)
  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user?.passwordHash || !user.staffKind || user.staffActive === false) {
    throw new UnauthorizedError('Login yoki parol noto‘g‘ri')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Login yoki parol noto‘g‘ri')

  const staffKind = user.staffKind
  const role = jwtRoleFromStaff(staffKind)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date(), loginPassword: password },
  })
  const tokens = await issueTokenPair(user.id, role, meta)
  return { user: { ...user, role, staffKind }, ...tokens }
}

export async function refreshTokens(rawRefreshToken: string, meta?: SessionMeta) {
  let payload: { sub: string; jti: string; role?: JwtRole }
  try {
    payload = verifyRefreshToken(rawRefreshToken)
  } catch {
    throw new UnauthorizedError('Refresh token yaroqsiz')
  }

  const row = await prisma.refreshToken.findUnique({ where: { id: payload.jti } })
  if (!row || row.revoked || row.expiresAt < new Date() || row.tokenHash !== sha256Hex(rawRefreshToken)) {
    throw new UnauthorizedError('Refresh token yaroqsiz yoki bekor qilingan')
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } })
  if (!user) throw new UnauthorizedError()

  await prisma.refreshToken.update({ where: { id: row.id }, data: { revoked: true } })

  if (isPanelRole(payload.role)) {
    if (!user.staffActive || !user.passwordHash || !user.staffKind) throw new UnauthorizedError('Refresh token yaroqsiz')
    return issueTokenPair(user.id, jwtRoleFromStaff(user.staffKind), meta)
  }

  return issueTokenPair(user.id, await appRoleForUser(user), meta)
}

export async function logout(rawRefreshToken: string) {
  try {
    const payload = verifyRefreshToken(rawRefreshToken)
    await prisma.refreshToken.updateMany({ where: { id: payload.jti }, data: { revoked: true } })
  } catch {
    // Already invalid/expired — logout is idempotent, nothing to revoke.
  }
}

export async function telegramExchange(code: string, meta?: SessionMeta) {
  const token = await prisma.telegramLoginToken.findUnique({ where: { code } })
  if (!token || token.consumedAt || token.expiresAt < new Date()) {
    throw new UnauthorizedError('Havola yaroqsiz yoki eskirgan')
  }

  const user = await prisma.user.findUnique({ where: { id: token.userId } })
  if (!user) throw new UnauthorizedError()

  await prisma.telegramLoginToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } })
  await prisma.user.update({
    where: { id: user.id },
    data: { fromWebapp: true, lastSeenAt: new Date() },
  })

  const appRole = await appRoleForUser(user)
  const tokens = await issueTokenPair(user.id, appRole, meta)
  return { user: { ...user, role: appRole }, ...tokens }
}

export async function issueTokenPair(userId: string, role: JwtRole, meta?: SessionMeta) {
  const accessToken = signAccessToken({ sub: userId, role })

  const row = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: '',
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  })

  const refreshToken = signRefreshToken({ sub: userId, jti: row.id, role })
  await prisma.refreshToken.update({ where: { id: row.id }, data: { tokenHash: sha256Hex(refreshToken) } })

  return { accessToken, refreshToken }
}
