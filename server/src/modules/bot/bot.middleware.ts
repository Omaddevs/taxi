import { createHash, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../errors/AppError.js'

// taxiline-bot is a trusted internal service, not an end user — it authenticates with a
// shared secret rather than a user JWT.
const digest = (value: string) => createHash('sha256').update(value).digest()
const EXPECTED = digest(env.BOT_API_SECRET)

export function requireBotSecret(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-bot-secret']
  // Compared in constant time (over fixed-length digests), so response timing leaks nothing.
  if (typeof header !== 'string' || !timingSafeEqual(digest(header), EXPECTED)) throw new UnauthorizedError('Invalid bot secret')
  next()
}
