import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { validate } from '../../middleware/validate.js'
import * as authController from './auth.controller.js'
import { rateLimit } from '../../middleware/rateLimit.js'
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

authRouter.post('/otp/request', validate({ body: otpRequestSchema }), asyncRoute(authController.requestOtp))
authRouter.post('/otp/verify', validate({ body: otpVerifySchema }), asyncRoute(authController.verifyOtp))
// Public: keyed on the unguessable otpRequestId (not the phone), safe for the webapp to poll
// while showing the code-entry screen — see auth.service.pollOtp for why that's safe.
authRouter.get('/otp/poll', validate({ query: otpPollSchema }), asyncRoute(authController.pollOtp))
authRouter.post('/refresh', validate({ body: refreshSchema }), asyncRoute(authController.refresh))
authRouter.post('/logout', validate({ body: logoutSchema }), asyncRoute(authController.logout))
// Public: webapp calls this with the one-time code embedded in the bot's WebApp button URL
// (?tgc=<code>) to silently log in as the same user the bot already identified.
authRouter.post(
  '/telegram-exchange',
  validate({ body: telegramExchangeSchema }),
  asyncRoute(authController.telegramExchange),
)

// Google orqali kirish / ro‘yxatdan o‘tish (see auth.service — Google section).
authRouter.get('/google/config', authController.googleConfig)
authRouter.post('/google', rateLimit(30, 10 * 60_000), validate({ body: googleSignInSchema }), asyncRoute(authController.googleSignIn))
authRouter.post('/google/register', rateLimit(20, 10 * 60_000), validate({ body: googleRegisterSchema }), asyncRoute(authController.googleRegister))

export const adminAuthRouter = Router()
adminAuthRouter.post('/login', validate({ body: adminLoginSchema }), asyncRoute(authController.adminLogin))
