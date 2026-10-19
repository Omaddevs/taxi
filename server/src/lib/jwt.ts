import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type AppRole = 'PASSENGER' | 'DRIVER'
export type PanelRole = 'ADMIN' | 'SALES_OPERATOR' | 'SUPPORT_OPERATOR'
export type JwtRole = AppRole | PanelRole
export type StaffKind = 'ADMIN' | 'SALES' | 'SUPPORT'

export interface AccessTokenPayload {
  sub: string
  role: JwtRole
}

const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '30d'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function isPanelRole(role: string | undefined): role is PanelRole {
  return role === 'ADMIN' || role === 'SALES_OPERATOR' || role === 'SUPPORT_OPERATOR'
}

export function jwtRoleFromStaff(kind: StaffKind): PanelRole {
  if (kind === 'SALES') return 'SALES_OPERATOR'
  if (kind === 'SUPPORT') return 'SUPPORT_OPERATOR'
  return 'ADMIN'
}

// Only HS256 is ever issued; pinning it means no other algorithm is accepted on the way in.
const ALGORITHMS: jwt.Algorithm[] = ['HS256']
const ROLES = new Set(['PASSENGER', 'DRIVER', 'ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'])

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN, algorithm: 'HS256' })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ALGORITHMS }) as jwt.JwtPayload
  // Other tokens signed with the same secret (the Google sign-up ticket carries an audience)
  // are not sessions: an access token is exactly { sub, role } with no audience.
  if (payload.aud !== undefined || typeof payload.sub !== 'string' || !ROLES.has(payload.role)) {
    throw new jwt.JsonWebTokenError('not an access token')
  }
  return { sub: payload.sub, role: payload.role }
}

export function signRefreshToken(payload: { sub: string; jti: string; role?: JwtRole }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN, algorithm: 'HS256' })
}

export function verifyRefreshToken(token: string): { sub: string; jti: string; role?: JwtRole } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ALGORITHMS }) as { sub: string; jti: string; role?: JwtRole }
}
