import { Router } from 'express'
import { z } from 'zod'
import * as botBridge from '../../lib/botBridge.js'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { validate } from '../../middleware/validate.js'

// Telegram login data appended to a login_url button's URL (verified by the bot, not here).
// passthrough: the hash covers every field Telegram sent, so none may be stripped.
const telegramAuthSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    auth_date: z.union([z.string(), z.number()]),
    hash: z.string(),
  })
  .passthrough()

// Either a signed ad reference (k, i, s) or — from cards posted before call logging — the
// bare number (n), which the bot only accepts if some ad carries it.
const recordCallSchema = z
  .object({
    k: z.enum(['fa', 'ga']).optional(),
    i: z.coerce.number().int().positive().optional(),
    s: z.string().min(8).max(64).optional(),
    n: z.string().min(9).max(20).optional(),
    tg: telegramAuthSchema.nullable().optional(),
  })
  .refine((data) => data.n || (data.k && data.i && data.s), { message: 'Havola to‘liq emas' })

const callReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  phone: z.string().max(20).optional(),
})

// Ochiq: taxiline.uz/call.html — «📞 Tel qilish» tugmasidan ochilgan sahifa raqamni shu yerdan oladi.
export const publicCallsRouter = Router()
publicCallsRouter.post(
  '/',
  rateLimit(60, 10 * 60_000),
  validate({ body: recordCallSchema }),
  asyncRoute(async (req, res) => {
    res.json(
      await botBridge.recordCall({
        ...req.body,
        ua: req.get('user-agent') ?? null,
        ip: req.ip ?? null,
      }),
    )
  }),
)

// Bot sozlamalari → Aloqa
export const adminCallsRouter = Router()
adminCallsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: callReportQuerySchema }),
  asyncRoute(async (req, res) => {
    const { days, phone } = req.query as { days?: string; phone?: string }
    res.json(await botBridge.getCallReport(days ? Number(days) : 7, phone))
  }),
)
