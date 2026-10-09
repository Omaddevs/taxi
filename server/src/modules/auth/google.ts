import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { UnauthorizedError, ValidationError } from '../../errors/AppError.js'

// "Google orqali kirish": the website opens Google's popup (Google Identity Services code
// client, redirect_uri "postmessage") and sends us the one-time authorization code. We swap it
// for tokens directly with Google using the client secret. An ID token obtained that way, over
// TLS from Google's own token endpoint, is trustworthy without verifying its signature
// (OpenID Connect Core §3.1.3.7) — its claims (aud, iss, exp, email_verified) are still checked.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])
const TICKET_AUDIENCE = 'taxiline-google-signup'
const TICKET_TTL = '15m'

export type GoogleProfile = {
  sub: string
  email: string | null
  name: string | null
  picture: string | null
}

export function googleEnabled() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1]
  if (!part) throw new UnauthorizedError('Google javobi noto‘g‘ri')
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  if (!googleEnabled()) throw new ValidationError('Google orqali kirish hali sozlanmagan')

  let res: Response
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new ValidationError('Google bilan bog‘lanib bo‘lmadi. Qaytadan urinib ko‘ring')
  }
  const body = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string }
  if (!res.ok || !body.id_token) {
    // invalid_grant = code already used / expired (e.g. a double click) — just start again.
    throw new UnauthorizedError('Google orqali kirish tasdiqlanmadi. Qaytadan urinib ko‘ring')
  }

  const claims = decodeJwtPayload(body.id_token)
  const now = Math.floor(Date.now() / 1000)
  if (
    claims.aud !== env.GOOGLE_CLIENT_ID ||
    !ISSUERS.has(String(claims.iss)) ||
    typeof claims.exp !== 'number' ||
    claims.exp < now ||
    typeof claims.sub !== 'string'
  ) {
    throw new UnauthorizedError('Google javobi tasdiqlanmadi')
  }
  if (claims.email && claims.email_verified !== true) {
    throw new UnauthorizedError('Google akkauntingizdagi email tasdiqlanmagan')
  }
  return {
    sub: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    name: typeof claims.name === 'string' ? claims.name : null,
    picture: typeof claims.picture === 'string' ? claims.picture : null,
  }
}

// A first-time Google user still has to confirm a phone number (every TaxiLine account is
// phone-based). The verified Google profile rides along in this short-lived signed ticket
// between the two steps, so nothing about it can be altered by the browser in between.
export function issueSignupTicket(profile: GoogleProfile) {
  return jwt.sign(profile, env.JWT_ACCESS_SECRET, { audience: TICKET_AUDIENCE, expiresIn: TICKET_TTL })
}

export function readSignupTicket(ticket: string): GoogleProfile {
  try {
    const payload = jwt.verify(ticket, env.JWT_ACCESS_SECRET, { audience: TICKET_AUDIENCE }) as GoogleProfile
    return { sub: payload.sub, email: payload.email ?? null, name: payload.name ?? null, picture: payload.picture ?? null }
  } catch {
    throw new UnauthorizedError('Vaqt tugadi — Google orqali qaytadan kiring')
  }
}
