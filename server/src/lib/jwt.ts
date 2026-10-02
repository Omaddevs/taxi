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

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function signRefreshToken(payload: { sub: string; jti: string; role?: JwtRole }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

export function verifyRefreshToken(token: string): { sub: string; jti: string; role?: JwtRole } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string; role?: JwtRole }
}
