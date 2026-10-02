import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { validate } from '../../middleware/validate.js'
import { requireBotSecret } from './bot.middleware.js'
import * as botController from './bot.controller.js'
import {
  linkUserSchema,
  otpConfirmByIdSchema,
  otpConfirmSchema,
  rateViaBotSchema,
  resolveUserSchema,
  syncDriverSchema,
  telegramLoginTokenSchema,
  touchChannelSchema,
} from './bot.schema.js'

// Internal API for taxiline-bot only — never exposed to the webapp or mobile clients.
export const botRouter = Router()

botRouter.use(requireBotSecret)

botRouter.post('/resolve-user', validate({ body: resolveUserSchema }), asyncRoute(botController.resolveUser))
botRouter.post('/link-user', validate({ body: linkUserSchema }), asyncRoute(botController.linkUser))
botRouter.post('/touch-channel', validate({ body: touchChannelSchema }), asyncRoute(botController.touchChannel))
botRouter.post('/sync-driver', validate({ body: syncDriverSchema }), asyncRoute(botController.syncDriver))
botRouter.post(
  '/telegram-login-token',
  validate({ body: telegramLoginTokenSchema }),
  asyncRoute(botController.telegramLoginToken),
)
botRouter.post('/otp-confirm', validate({ body: otpConfirmSchema }), asyncRoute(botController.otpConfirm))
botRouter.post(
  '/otp-confirm-by-id',
  validate({ body: otpConfirmByIdSchema }),
  asyncRoute(botController.otpConfirmById),
)
botRouter.post('/rate', validate({ body: rateViaBotSchema }), asyncRoute(botController.rateViaBot))
