import type { NextFunction, Request, Response } from 'express'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../errors/AppError.js'

// taxiline-bot is a trusted internal service, not an end user — it authenticates with a
// shared secret rather than a user JWT.
export function requireBotSecret(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-bot-secret']
  if (header !== env.BOT_API_SECRET) throw new UnauthorizedError('Invalid bot secret')
  next()
}
