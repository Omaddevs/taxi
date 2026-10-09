import type { Request, Response } from 'express'
import * as authService from './auth.service.js'

function serializeUser(user: {
  id: string
  phone: string
  name: string | null
  role: string
  verified: boolean
  language?: string | null
  staffKind?: string | null
}) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    verified: user.verified,
    language: user.language ?? null,
    staffKind: user.staffKind ?? null,
  }
}

export async function requestOtp(req: Request, res: Response) {
  const result = await authService.requestOtp(req.body)
  res.json(result)
}

function sessionMeta(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined }
}

export async function verifyOtp(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.verifyOtp(
    req.body.phone,
    req.body.code,
    { intent: req.body.intent, name: req.body.name, language: req.body.language },
    sessionMeta(req),
  )
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}

export async function pollOtp(req: Request, res: Response) {
  const result = await authService.pollOtp(req.query.otpRequestId as string, sessionMeta(req))
  if (result.pending) {
    res.json({ pending: true, code: result.code })
    return
  }
  res.json({ pending: false, user: serializeUser(result.user), accessToken: result.accessToken, refreshToken: result.refreshToken })
}

export async function telegramExchange(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.telegramExchange(req.body.code, sessionMeta(req))
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}

export async function adminLogin(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.adminLogin(req.body.phone, req.body.password, sessionMeta(req))
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}

export async function refresh(req: Request, res: Response) {
  const tokens = await authService.refreshTokens(req.body.refreshToken, sessionMeta(req))
  res.json(tokens)
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken)
  res.status(204).end()
}

export function googleConfig(_req: Request, res: Response) {
  res.json(authService.googleConfig())
}

export async function googleSignIn(req: Request, res: Response) {
  const result = await authService.googleSignIn(req.body.code, sessionMeta(req))
  if (result.status === 'ok') {
    res.json({ status: 'ok', user: serializeUser(result.user), accessToken: result.accessToken, refreshToken: result.refreshToken })
    return
  }
  res.json(result)
}

export async function googleRequestOtp(req: Request, res: Response) {
  res.json(await authService.googleRequestOtp(req.body.ticket, req.body.phone))
}

export async function googleComplete(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.googleComplete(
    req.body.ticket,
    req.body.phone,
    req.body.code,
    sessionMeta(req),
  )
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}
