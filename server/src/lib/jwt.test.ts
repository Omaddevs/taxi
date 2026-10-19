import { describe, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../config/env.js', () => ({ env: { JWT_ACCESS_SECRET: 'test-access', JWT_REFRESH_SECRET: 'test-refresh' } }))

const { signAccessToken, verifyAccessToken } = await import('./jwt.js')

// Several tokens are signed with the access secret; only a real session may pass as one.
describe('verifyAccessToken', () => {
  it('accepts a session token', () => {
    expect(verifyAccessToken(signAccessToken({ sub: 'u1', role: 'PASSENGER' }))).toEqual({ sub: 'u1', role: 'PASSENGER' })
  })

  it('refuses the Google sign-up ticket and the Instagram OAuth state', () => {
    const ticket = jwt.sign({ sub: 'google-sub' }, 'test-access', { audience: 'taxiline-google-signup' })
    const state = jwt.sign({ sub: 'admin1', purpose: 'instagram_oauth' }, 'test-access')
    expect(() => verifyAccessToken(ticket)).toThrow()
    expect(() => verifyAccessToken(state)).toThrow()
  })

  it('refuses another algorithm and an unknown role', () => {
    expect(() => verifyAccessToken(jwt.sign({ sub: 'u1', role: 'ADMIN' }, 'test-access', { algorithm: 'HS512' }))).toThrow()
    expect(() => verifyAccessToken(jwt.sign({ sub: 'u1', role: 'ROOT' }, 'test-access'))).toThrow()
  })
})
