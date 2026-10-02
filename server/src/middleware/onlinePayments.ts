import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { ForbiddenError } from '../errors/AppError.js'

export const ONLINE_PAYMENTS_SOON = 'Onlayn to‘lovlar tez orada ishga tushadi'

export function requireOnlinePayments(_req: Request, _res: Response, next: NextFunction) {
  if (!env.ONLINE_PAYMENTS_ENABLED) return next(new ForbiddenError(ONLINE_PAYMENTS_SOON))
  next()
}
