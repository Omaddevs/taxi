import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { Role } from '@prisma/client'

export interface AccessTokenPayload {
  sub: string
  role: Role
}

const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '30d'
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function signRefreshToken(payload: { sub: string; jti: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; jti: string }
}
