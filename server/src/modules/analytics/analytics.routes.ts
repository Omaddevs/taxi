import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as analyticsController from './analytics.controller.js'
import { analyticsSummaryQuerySchema } from './analytics.schema.js'

export const adminAnalyticsRouter = Router()

adminAnalyticsRouter.get(
  '/summary',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: analyticsSummaryQuerySchema }),
  asyncRoute(analyticsController.getSummary),
)
