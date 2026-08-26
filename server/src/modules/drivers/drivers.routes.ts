import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as driversController from './drivers.controller.js'
import {
  applicationIdParamSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  listDriversQuerySchema,
  reviewApplicationSchema,
  setOnlineStatusSchema,
  updateLocationSchema,
} from './drivers.schema.js'

export const driversRouter = Router()

driversRouter.post(
  '/applications',
  requireAuth,
  validate({ body: createApplicationSchema }),
  asyncRoute(driversController.submitApplication),
)
driversRouter.get('/applications/me', requireAuth, asyncRoute(driversController.getMyApplication))
driversRouter.patch(
  '/me/status',
  requireAuth,
  requireRole('DRIVER'),
  validate({ body: setOnlineStatusSchema }),
  asyncRoute(driversController.setOnlineStatus),
)
driversRouter.patch(
  '/me/location',
  requireAuth,
  requireRole('DRIVER'),
  validate({ body: updateLocationSchema }),
  asyncRoute(driversController.updateLocation),
)
driversRouter.get('/me/stats', requireAuth, requireRole('DRIVER'), asyncRoute(driversController.getStats))

export const adminDriversRouter = Router()

adminDriversRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listDriversQuerySchema }),
  asyncRoute(driversController.listDrivers),
)
adminDriversRouter.get(
  '/applications',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listApplicationsQuerySchema }),
  asyncRoute(driversController.listApplications),
)
adminDriversRouter.patch(
  '/applications/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: applicationIdParamSchema, body: reviewApplicationSchema }),
  asyncRoute(driversController.reviewApplication),
)
