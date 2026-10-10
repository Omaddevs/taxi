import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as driversController from './drivers.controller.js'
import * as driverBoard from './driverBoard.service.js'
import { z } from 'zod'
import {
  applicationIdParamSchema,
  archiveDriverSchema,
  createApplicationSchema,
  driverIdParamSchema,
  listApplicationsQuerySchema,
  listDriversQuerySchema,
  reviewApplicationSchema,
  updateApplicationSchema,
  createApplicationAdminSchema,
  blockApplicationSchema,
  setApprovedSchema,
  setDriverGenderSchema,
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
driversRouter.get('/top', requireAuth, asyncRoute(driversController.listTopDrivers))
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

// "Haydovchilar" (passenger app): drivers' ads with who the driver is, and a driver's profile.
const boardQuerySchema = z.object({
  from: z.string().max(80).optional(),
  to: z.string().max(80).optional(),
  q: z.string().max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
driversRouter.get(
  '/board',
  requireAuth,
  validate({ query: boardQuerySchema }),
  asyncRoute(async (req, res) => {
    res.json(await driverBoard.driverBoard(req.query as z.infer<typeof boardQuerySchema>))
  }),
)
driversRouter.get(
  '/:id/profile',
  requireAuth,
  validate({ params: z.object({ id: z.string().min(1).max(40) }) }),
  asyncRoute(async (req, res) => {
    res.json(await driverBoard.driverProfile(req.params.id))
  }),
)

export const adminDriversRouter = Router()

adminDriversRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR'),
  validate({ query: listDriversQuerySchema }),
  asyncRoute(driversController.listDrivers),
)
// Driver applications (website, bot, typed in by staff): admins and both operator kinds.
const panelStaff = requireRole('ADMIN', 'SALES_OPERATOR', 'SUPPORT_OPERATOR')
adminDriversRouter.get(
  '/applications',
  requireAuth,
  panelStaff,
  validate({ query: listApplicationsQuerySchema }),
  asyncRoute(driversController.listApplications),
)
adminDriversRouter.post(
  '/applications',
  requireAuth,
  panelStaff,
  validate({ body: createApplicationAdminSchema }),
  asyncRoute(driversController.createApplicationAdmin),
)
adminDriversRouter.patch(
  '/applications/:id',
  requireAuth,
  panelStaff,
  validate({ params: applicationIdParamSchema, body: reviewApplicationSchema }),
  asyncRoute(driversController.reviewApplication),
)
adminDriversRouter.patch(
  '/applications/:id/details',
  requireAuth,
  panelStaff,
  validate({ params: applicationIdParamSchema, body: updateApplicationSchema }),
  asyncRoute(driversController.updateApplication),
)
adminDriversRouter.post(
  '/applications/:id/block',
  requireAuth,
  panelStaff,
  validate({ params: applicationIdParamSchema, body: blockApplicationSchema }),
  asyncRoute(driversController.blockApplication),
)
adminDriversRouter.delete(
  '/applications/:id',
  requireAuth,
  panelStaff,
  validate({ params: applicationIdParamSchema }),
  asyncRoute(driversController.deleteApplication),
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
// Women-only ("Ayollar uchun taxi") orders reach — and may be taken by — female drivers only.
adminDriversRouter.patch(
  '/:id/gender',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: driverIdParamSchema, body: setDriverGenderSchema }),
  asyncRoute(driversController.setGender),
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
