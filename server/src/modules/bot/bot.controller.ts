import type { Request, Response } from 'express'
import * as botService from './bot.service.js'
import { confirmOtpByRequestId, confirmOtpViaBot } from '../auth/auth.service.js'

function serializeUser(user: {
  id: string
  phone: string
  name: string | null
  role: string
  verified: boolean
  language: string | null
  balance: number
}) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    verified: user.verified,
    language: user.language,
    balance: user.balance,
  }
}

export async function resolveUser(req: Request, res: Response) {
  const user = await botService.resolveUserByPhone(req.body.phone)
  res.json({ user: serializeUser(user) })
}

export async function linkUser(req: Request, res: Response) {
  const user = await botService.linkUser(req.body)
  res.json({ user: serializeUser(user) })
}

export async function telegramLoginToken(req: Request, res: Response) {
  const result = await botService.issueTelegramLoginToken(req.body.telegramId)
  res.json(result)
}

export async function syncDriver(req: Request, res: Response) {
  const user = await botService.syncDriver(req.body)
  res.json({ user: serializeUser(user) })
}

export async function otpConfirm(req: Request, res: Response) {
  await confirmOtpViaBot(req.body.phone, req.body.code)
  res.json({ ok: true })
}

export async function otpConfirmById(req: Request, res: Response) {
  const result = await confirmOtpByRequestId(req.body.otpRequestId, {
    telegramId: req.body.telegramId,
    telegramUsername: req.body.telegramUsername,
  })
  if (!result) {
    res.status(400).json({ error: 'invalid_or_expired' })
    return
  }
  res.json({ ok: true, phone: result.phone })
}

export async function touchChannel(req: Request, res: Response) {
  const user = await botService.touchChannel(req.body.telegramId, req.body.source)
  res.json({ user: serializeUser(user) })
}

export async function rateViaBot(req: Request, res: Response) {
  await botService.rateViaBot(req.body)
  res.json({ ok: true })
}
