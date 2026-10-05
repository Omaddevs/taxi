import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as botOrdersController from './botOrders.controller.js'
import { createPassengerOrderSchema, orderIdParamSchema, rateBotOrderSchema } from './botOrders.schema.js'

// Bridges the webapp to taxiline-bot's on-demand order/claim system, for users who are
// registered in both systems (linked via User.telegramId). See app/webserver.py on the bot
// side — every action here calls the exact same services.trips.perform_* functions the
// Telegram claim buttons call.
export const botOrdersRouter = Router()

botOrdersRouter.get('/driver', requireAuth, requireRole('DRIVER'), asyncRoute(botOrdersController.getDriverOrders))
botOrdersRouter.post(
  '/driver/:id/claim',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: orderIdParamSchema }),
  asyncRoute(botOrdersController.claimOrder),
)
botOrdersRouter.post(
  '/driver/:id/enroute',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: orderIdParamSchema }),
  asyncRoute(botOrdersController.enrouteOrder),
)
botOrdersRouter.post(
  '/driver/:id/complete',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: orderIdParamSchema }),
  asyncRoute(botOrdersController.completeOrder),
)
botOrdersRouter.post(
  '/driver/:id/cancel',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: orderIdParamSchema }),
  asyncRoute(botOrdersController.cancelOrder),
)

botOrdersRouter.get('/mine', requireAuth, asyncRoute(botOrdersController.getPassengerOrders))
botOrdersRouter.post(
  '/mine',
  requireAuth,
  validate({ body: createPassengerOrderSchema }),
  asyncRoute(botOrdersController.createPassengerOrder),
)
botOrdersRouter.post(
  '/mine/:id/rating',
  requireAuth,
  validate({ params: orderIdParamSchema, body: rateBotOrderSchema }),
  asyncRoute(botOrdersController.ratePassengerOrder),
)
