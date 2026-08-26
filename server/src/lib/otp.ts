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

export function getSmsProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'console':
    default:
      return new ConsoleSmsProvider()
    // 'eskiz' / 'playmobile' providers plug in here later, same SmsProvider interface,
    // selected purely via env.SMS_PROVIDER — no call-site changes needed.
  }
}
