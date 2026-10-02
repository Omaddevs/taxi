import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export function compareOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  const withoutLeadingZero = digits.startsWith('998') ? digits : `998${digits.replace(/^0+/, '')}`
  return `+${withoutLeadingZero}`
}

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string) {
    console.log(`[SMS -> ${phone}] ${message}`)
  }
}

// https://documenter.getpostman.com/view/663428/RzfmES4z — token lives ~30 days; we log in lazily
// and once more on a 401, so a restart or an expired token never needs manual action.
class EskizSmsProvider implements SmsProvider {
  private static token: string | null = null
  private readonly base = 'https://notify.eskiz.uz/api'

  private async login(): Promise<string> {
    const form = new FormData()
    form.set('email', env.ESKIZ_EMAIL)
    form.set('password', env.ESKIZ_PASSWORD)
    const res = await fetch(`${this.base}/auth/login`, { method: 'POST', body: form, signal: AbortSignal.timeout(10000) })
    const body = (await res.json().catch(() => null)) as { data?: { token?: string }; message?: string } | null
    if (!res.ok || !body?.data?.token) throw new Error(`Eskiz login failed: ${res.status} ${body?.message ?? ''}`)
    EskizSmsProvider.token = body.data.token
    return body.data.token
  }

  private async post(token: string, phone: string, message: string) {
    const form = new FormData()
    form.set('mobile_phone', phone.replace(/\D/g, ''))
    form.set('message', message)
    form.set('from', env.ESKIZ_FROM)
    return fetch(`${this.base}/message/sms/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(10000),
    })
  }

  async send(phone: string, message: string) {
    let res = await this.post(EskizSmsProvider.token ?? (await this.login()), phone, message)
    if (res.status === 401) res = await this.post(await this.login(), phone, message)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[SMS eskiz] ${res.status} ${text.slice(0, 300)}`)
      throw new Error('SMS yuborib bo‘lmadi')
    }
  }
}

let provider: SmsProvider | null = null

export function getSmsProvider(): SmsProvider {
  if (provider) return provider
  switch (env.SMS_PROVIDER) {
    case 'eskiz':
      provider = new EskizSmsProvider()
      break
    case 'playmobile':
      throw new Error('SMS_PROVIDER=playmobile is not implemented yet — use eskiz or console')
    case 'console':
    default:
      provider = new ConsoleSmsProvider()
  }
  return provider
}
