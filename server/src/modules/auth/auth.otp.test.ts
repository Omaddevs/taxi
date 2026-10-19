import { beforeEach, describe, expect, it, vi } from 'vitest'

// Sign-in by phone: /auth/otp/request hands the caller an otpRequestId, and /auth/otp/poll
// issues tokens once that request is proven. The caller of /otp/request is not proven to own
// the phone, so nothing short of the right code (or the owner's Telegram tap) may make poll
// hand out a session or the code itself.

vi.mock('../../config/env.js', () => ({
  env: { JWT_ACCESS_SECRET: 'test-access', JWT_REFRESH_SECRET: 'test-refresh', SMS_PROVIDER: 'console' },
}))
vi.mock('../../lib/botNotify.js', () => ({ notifyOtpViaBot: vi.fn() }))

type Row = Record<string, any>
const db: { users: Row[]; otps: Row[]; tokens: Row[] } = { users: [], otps: [], tokens: [] }
let seq = 0
const match = (row: Row, where: Row) =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('gt' in v) return row[k] > v.gt
      return true
    }
    return row[k] === v
  })
const apply = (row: Row, data: Row) => {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in v) row[k] = (row[k] ?? 0) + v.increment
    else row[k] = v
  }
  return row
}
const newest = (rows: Row[]) => [...rows].sort((a, b) => b.createdAt - a.createdAt || b.seq - a.seq)[0] ?? null

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: Row) => db.users.find((u) => match(u, where)) ?? null,
      update: async ({ where, data }: Row) => apply(db.users.find((u) => match(u, where))!, data),
      create: async ({ data }: Row) => (db.users.push({ id: `u${++seq}`, ...data }), db.users.at(-1)),
    },
    driver: { findUnique: async () => null },
    otpCode: {
      findFirst: async ({ where }: Row) => newest(db.otps.filter((o) => match(o, where))),
      findUnique: async ({ where }: Row) => db.otps.find((o) => match(o, where)) ?? null,
      create: async ({ data }: Row) => {
        const row = { id: `otp${++seq}`, seq, consumed: false, attempts: 0, createdAt: new Date(), ...data }
        db.otps.push(row)
        return row
      },
      update: async ({ where, data }: Row) => apply(db.otps.find((o) => match(o, where))!, data),
      updateMany: async ({ where, data }: Row) => {
        const rows = db.otps.filter((o) => match(o, where))
        rows.forEach((o) => apply(o, data))
        return { count: rows.length }
      },
    },
    refreshToken: {
      create: async ({ data }: Row) => (db.tokens.push({ id: `rt${++seq}`, ...data }), db.tokens.at(-1)),
      update: async ({ where, data }: Row) => apply(db.tokens.find((t) => t.id === where.id)!, data),
    },
  },
}))

const auth = await import('./auth.service.js')

const VICTIM = '+998901234567'

beforeEach(() => {
  db.users = [{ id: 'victim', phone: VICTIM, role: 'PASSENGER', telegramId: '111', otpAutofill: false }]
  db.otps = []
  db.tokens = []
})

async function burnAttempts(phone: string) {
  for (let i = 0; i < 6; i++) await auth.verifyOtp(phone, '000000').catch(() => {})
}

describe('OTP poll', () => {
  it('stays pending when the code was never entered', async () => {
    const { otpRequestId } = await auth.requestOtp({ phone: VICTIM })
    await expect(auth.pollOtp(otpRequestId)).resolves.toMatchObject({ pending: true, code: null })
  })

  it('issues no session after the attempts run out on wrong codes', async () => {
    const { otpRequestId } = await auth.requestOtp({ phone: VICTIM })
    await burnAttempts(VICTIM)
    const result = await auth.pollOtp(otpRequestId).catch((err) => err)
    expect(result).not.toHaveProperty('accessToken')
    expect(db.tokens).toHaveLength(0)
  })

  it('does not hand the code to whoever requested it, even with autofill on', async () => {
    db.users[0].otpAutofill = true
    const { otpRequestId } = await auth.requestOtp({ phone: VICTIM })
    const result = await auth.pollOtp(otpRequestId).catch((err) => err)
    expect(result?.code ?? null).toBeNull()
  })

  it('issues the session once, to the poller, after the right code', async () => {
    const { otpRequestId } = await auth.requestOtp({ phone: VICTIM })
    const code = (await auth.kirishIssueCode({ telegramId: '111', intent: 'login' })) as { code: string }
    await auth.verifyOtp(VICTIM, code.code)
    expect(db.tokens).toHaveLength(1)
    const first = await auth.pollOtp(otpRequestId).catch((err) => err)
    const second = await auth.pollOtp(otpRequestId).catch((err) => err)
    // The typed-in verify already returned a session; poll may add at most one more, never many.
    expect([first, second].filter((r) => r && 'accessToken' in r).length).toBeLessThanOrEqual(1)
  })

  it('signs in the waiting page once the owner confirms in Telegram — and only once', async () => {
    const { otpRequestId } = await auth.requestOtp({ phone: VICTIM })
    const code = (await auth.kirishIssueCode({ telegramId: '111', intent: 'login' })) as { code: string }
    await auth.confirmOtpViaBot(VICTIM, code.code)
    await expect(auth.pollOtp(otpRequestId)).resolves.toHaveProperty('accessToken')
    await expect(auth.pollOtp(otpRequestId)).resolves.toMatchObject({ pending: true })
    expect(db.tokens).toHaveLength(1)
  })
})
