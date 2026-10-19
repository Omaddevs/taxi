import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { validate } from '../../middleware/validate.js'
import * as authController from './auth.controller.js'
import { byBodyPhone, rateLimit } from '../../middleware/rateLimit.js'
import {
  adminLoginSchema,
  googleRegisterSchema,
  googleSignInSchema,
  logoutSchema,
  otpPollSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  telegramExchangeSchema,
} from './auth.schema.js'

export const authRouter = Router()

// Sign-in endpoints are rate limited per IP and, where a phone is given, per number: codes go to
// the owner's Telegram (no flooding them), and passwords/codes can't be guessed at speed. The
// per-number caps are the tight ones; per IP stays generous — mobile carriers put many people
// behind one address.
const TEN_MIN = 10 * 60_000
authRouter.post('/otp/request', rateLimit(100, TEN_MIN), rateLimit(5, TEN_MIN, byBodyPhone), validate({ body: otpRequestSchema }), asyncRoute(authController.requestOtp))
authRouter.post('/otp/verify', rateLimit(150, TEN_MIN), rateLimit(15, TEN_MIN, byBodyPhone), validate({ body: otpVerifySchema }), asyncRoute(authController.verifyOtp))
// Public: keyed on the unguessable otpRequestId (not the phone), safe for the webapp to poll
// while showing the code-entry screen — see auth.service.pollOtp for why that's safe.
// The code screen polls every 2 s; 600 per 10 min leaves room for a few tabs behind one IP.
authRouter.get('/otp/poll', rateLimit(600, TEN_MIN), validate({ query: otpPollSchema }), asyncRoute(authController.pollOtp))
authRouter.post('/refresh', rateLimit(120, TEN_MIN), validate({ body: refreshSchema }), asyncRoute(authController.refresh))
authRouter.post('/logout', validate({ body: logoutSchema }), asyncRoute(authController.logout))
// Public: webapp calls this with the one-time code embedded in the bot's WebApp button URL
// (?tgc=<code>) to silently log in as the same user the bot already identified.
authRouter.post(
  '/telegram-exchange',
  rateLimit(30, TEN_MIN),
  validate({ body: telegramExchangeSchema }),
  asyncRoute(authController.telegramExchange),
)

// Google orqali kirish / ro‘yxatdan o‘tish (see auth.service — Google section).
authRouter.get('/google/config', authController.googleConfig)
authRouter.post('/google', rateLimit(30, TEN_MIN), validate({ body: googleSignInSchema }), asyncRoute(authController.googleSignIn))
authRouter.post('/google/register', rateLimit(20, TEN_MIN), validate({ body: googleRegisterSchema }), asyncRoute(authController.googleRegister))

export const adminAuthRouter = Router()
adminAuthRouter.post('/login', rateLimit(10, 15 * 60_000), rateLimit(10, 15 * 60_000, byBodyPhone), validate({ body: adminLoginSchema }), asyncRoute(authController.adminLogin))
