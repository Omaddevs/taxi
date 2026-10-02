import type { NextFunction, Request, Response } from 'express'
import { isPanelRole, verifyAccessToken, type JwtRole, type PanelRole } from '../lib/jwt.js'
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: JwtRole }
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

export function requireRole(...roles: JwtRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError()
    if (!roles.includes(req.user.role)) throw new ForbiddenError('Insufficient role')
    next()
  }
}

export function requirePanel(...roles: PanelRole[]) {
  const allowed: PanelRole[] = roles.length ? roles : ['ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR']
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError()
    if (!isPanelRole(req.user.role) || !allowed.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient role')
    }
    next()
  }
}
