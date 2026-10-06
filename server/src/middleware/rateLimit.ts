import type { NextFunction, Request, Response } from 'express'
import { TooManyRequestsError } from '../errors/AppError.js'

// Small in-memory per-IP limiter for public forms (single process). Behind a proxy set
// TRUST_PROXY=true so req.ip is the real client. Mobile carriers share IPs — keep caps generous.
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) return next(new TooManyRequestsError('Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.'))
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) hits.clear()
    next()
  }
}
