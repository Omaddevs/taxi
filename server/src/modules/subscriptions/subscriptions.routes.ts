import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as subscriptionsController from './subscriptions.controller.js'
import {
  cancelSubscriptionSchema,
  driverIdParamSchema,
  planIdParamSchema,
  renewSubscriptionSchema,
  updatePlanSchema,
} from './subscriptions.schema.js'

export const adminSubscriptionPlansRouter = Router()

adminSubscriptionPlansRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  asyncRoute(subscriptionsController.listPlans),
)
adminSubscriptionPlansRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: planIdParamSchema, body: updatePlanSchema }),
  asyncRoute(subscriptionsController.updatePlan),
)

export const adminDriverSubscriptionsRouter = Router()

adminDriverSubscriptionsRouter.get(
  '/:driverId',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  validate({ params: driverIdParamSchema }),
  asyncRoute(subscriptionsController.getDriverSubscription),
)
adminDriverSubscriptionsRouter.post(
  '/:driverId/renew',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR'),
  validate({ params: driverIdParamSchema, body: renewSubscriptionSchema }),
  asyncRoute(subscriptionsController.renewSubscription),
)
adminDriverSubscriptionsRouter.post(
  '/:driverId/cancel',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR'),
  validate({ params: driverIdParamSchema, body: cancelSubscriptionSchema }),
  asyncRoute(subscriptionsController.cancelSubscription),
)
