import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { compareOtpCode, generateOtpCode, getSmsProvider, hashOtpCode, normalizePhone } from '../../lib/otp.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js'
import { sha256Hex } from '../../lib/hash.js'
import { TooManyRequestsError, UnauthorizedError, ValidationError } from '../../errors/AppError.js'

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_MIN_INTERVAL_MS = 60 * 1000
const OTP_MAX_PER_DAY = 5
const OTP_MAX_ATTEMPTS = 5
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const recent = await prisma.otpCode.findMany({
    where: { phone, createdAt: { gte: since24h } },
    orderBy: { createdAt: 'desc' },
    take: OTP_MAX_PER_DAY,
  })

  if (recent.length > 0 && Date.now() - recent[0].createdAt.getTime() < OTP_MIN_INTERVAL_MS) {
    throw new TooManyRequestsError('Iltimos, 1 daqiqadan so‘ng qayta urinib ko‘ring')
  }
  if (recent.length >= OTP_MAX_PER_DAY) {
    throw new TooManyRequestsError('Kunlik SMS limiti tugadi, ertaga qayta urinib ko‘ring')
  }

  const code = generateOtpCode()
  const codeHash = await hashOtpCode(code)

  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  })

  await getSmsProvider().send(phone, `TaxiLine tasdiqlash kodi: ${code}`)

  return { phone }
}

export async function verifyOtp(rawPhone: string, code: string) {
  const phone = normalizePhone(rawPhone)

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

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, role: 'PASSENGER' },
  })

  const tokens = await issueTokenPair(user.id, user.role)
  return { user, ...tokens }
}

export async function adminLogin(rawPhone: string, password: string) {
  const phone = normalizePhone(rawPhone)
  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
    throw new UnauthorizedError('Login yoki parol noto‘g‘ri')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Login yoki parol noto‘g‘ri')

  const tokens = await issueTokenPair(user.id, user.role)
  return { user, ...tokens }
}

export async function refreshTokens(rawRefreshToken: string) {
  let payload: { sub: string; jti: string }
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

  return issueTokenPair(user.id, user.role)
}

export async function logout(rawRefreshToken: string) {
  try {
    const payload = verifyRefreshToken(rawRefreshToken)
    await prisma.refreshToken.updateMany({ where: { id: payload.jti }, data: { revoked: true } })
  } catch {
    // Already invalid/expired — logout is idempotent, nothing to revoke.
  }
}

async function issueTokenPair(userId: string, role: 'PASSENGER' | 'DRIVER' | 'ADMIN') {
  const accessToken = signAccessToken({ sub: userId, role })

  const row = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: '',
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  })

  const refreshToken = signRefreshToken({ sub: userId, jti: row.id })
  await prisma.refreshToken.update({ where: { id: row.id }, data: { tokenHash: sha256Hex(refreshToken) } })

  return { accessToken, refreshToken }
}
