import type { Request, Response } from 'express'
import * as authService from './auth.service.js'

function serializeUser(user: { id: string; phone: string; name: string | null; role: string; verified: boolean }) {
  return { id: user.id, phone: user.phone, name: user.name, role: user.role, verified: user.verified }
}

export async function requestOtp(req: Request, res: Response) {
  const result = await authService.requestOtp(req.body.phone)
  res.json(result)
}

export async function verifyOtp(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.verifyOtp(req.body.phone, req.body.code)
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}

export async function adminLogin(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.adminLogin(req.body.phone, req.body.password)
  res.json({ user: serializeUser(user), accessToken, refreshToken })
}

export async function refresh(req: Request, res: Response) {
  const tokens = await authService.refreshTokens(req.body.refreshToken)
  res.json(tokens)
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken)
  res.status(204).end()
}
