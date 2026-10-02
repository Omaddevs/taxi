import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as reportsController from './reports.controller.js'
import { reportPeriodSchema } from './reports.schema.js'

export const adminReportsRouter = Router()

adminReportsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: reportPeriodSchema }),
  asyncRoute(reportsController.getReport),
)
adminReportsRouter.get(
  '/xlsx',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: reportPeriodSchema }),
  asyncRoute(reportsController.downloadXlsx),
)
