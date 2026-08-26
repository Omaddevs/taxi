import type { NextFunction, Request, Response } from 'express'
import type { Role } from '@prisma/client'
import { verifyAccessToken } from '../lib/jwt.js'
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role }
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing bearer token')

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length))
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    throw new UnauthorizedError('Invalid or expired token')
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError()
    if (!roles.includes(req.user.role)) throw new ForbiddenError('Insufficient role')
    next()
  }
}
