import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as adminBotOrdersController from './adminBotOrders.controller.js'
import {
  adminOrderIdParamSchema,
  adminSetOrderStatusSchema,
  adminUpdateOrderSchema,
  listAdminOrdersQuerySchema,
} from './adminBotOrders.schema.js'

// Admin surface over taxiline-bot's passenger-posted Order listings — bridges to the bot's
// own HTTP API (see app/webserver.py's /webapp/admin/orders* handlers) the same way
// botOrders.routes.ts bridges the driver/passenger-facing actions. The human-admin check
// happens here (requireRole('ADMIN')); the bot side trusts the shared X-Bot-Secret.
export const adminBotOrdersRouter = Router()

adminBotOrdersRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listAdminOrdersQuerySchema }),
  asyncRoute(adminBotOrdersController.listOrders),
)
adminBotOrdersRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: adminOrderIdParamSchema }),
  asyncRoute(adminBotOrdersController.getOrder),
)
adminBotOrdersRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: adminOrderIdParamSchema, body: adminSetOrderStatusSchema }),
  asyncRoute(adminBotOrdersController.setOrderStatus),
)
adminBotOrdersRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: adminOrderIdParamSchema, body: adminUpdateOrderSchema }),
  asyncRoute(adminBotOrdersController.updateOrder),
)
adminBotOrdersRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: adminOrderIdParamSchema }),
  asyncRoute(adminBotOrdersController.deleteOrder),
)
