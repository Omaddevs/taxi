import type { NextFunction, Request, Response } from 'express'
import { TooManyRequestsError } from '../errors/AppError.js'
import { normalizePhone } from '../lib/otp.js'

const MAX_KEYS = 5000

// Small in-memory sliding-window limiter (single process). Behind a proxy set TRUST_PROXY=true
// so req.ip is the real client. Mobile carriers share IPs — keep per-IP caps generous. `key`
// picks what is counted (default: the client IP); requests it returns null for pass through.
export function rateLimit(max: number, windowMs: number, key: (req: Request) => string | null = (req) => req.ip ?? 'unknown') {
  const hits = new Map<string, number[]>()
  return (req: Request, _res: Response, next: NextFunction) => {
    const id = key(req)
    if (id === null) return next()
    const now = Date.now()
    const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) return next(new TooManyRequestsError('Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.'))
    recent.push(now)
    // Re-insert so the Map stays ordered least-recently-hit first.
    hits.delete(id)
    hits.set(id, recent)
    if (hits.size > MAX_KEYS) {
      // Drop idle keys, then the least recently hit ones that are still under the cap. Blocked keys
      // are never evicted: flooding the limiter with fresh IPs or phones must not reset a lockout.
      for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k)
      for (const [k, times] of hits) {
        if (hits.size <= MAX_KEYS) break
        if (k !== id && times.filter((t) => now - t < windowMs).length < max) hits.delete(k)
      }
    }
    next()
  }
}

/** Counts per phone number in the body — one number can't be hammered from many IPs. */
export function byBodyPhone(req: Request): string | null {
  const phone = (req.body as { phone?: unknown } | undefined)?.phone
  return typeof phone === 'string' ? normalizePhone(phone) : null
}
