import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as driversController from './drivers.controller.js'
import {
  applicationIdParamSchema,
  archiveDriverSchema,
  createApplicationSchema,
  driverIdParamSchema,
  listApplicationsQuerySchema,
  listDriversQuerySchema,
  reviewApplicationSchema,
  setApprovedSchema,
  setOnlineStatusSchema,
  updateLocationSchema,
  updateDriverMeSchema,
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
  validate({ body: setOnlineStatusSchema }),
  asyncRoute(driversController.setOnlineStatus),
)
driversRouter.patch(
  '/me/location',
  requireAuth,
  validate({ body: updateLocationSchema }),
  asyncRoute(driversController.updateLocation),
)
driversRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateDriverMeSchema }),
  asyncRoute(driversController.updateMe),
)
driversRouter.get('/me/stats', requireAuth, asyncRoute(driversController.getStats))
driversRouter.get('/me/ratings', requireAuth, asyncRoute(driversController.getMyRatings))

export const adminDriversRouter = Router()

adminDriversRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
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
adminDriversRouter.get('/live', requireAuth, requireRole('ADMIN'), asyncRoute(driversController.listLiveDrivers))
adminDriversRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  validate({ params: driverIdParamSchema }),
  asyncRoute(driversController.getDriverById),
)
adminDriversRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: driverIdParamSchema, body: setApprovedSchema }),
  asyncRoute(driversController.setApproved),
)
adminDriversRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: driverIdParamSchema, body: archiveDriverSchema }),
  asyncRoute(driversController.archiveDriver),
)
adminDriversRouter.post(
  '/:id/restore',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR'),
  validate({ params: driverIdParamSchema }),
  asyncRoute(driversController.restoreDriver),
)
