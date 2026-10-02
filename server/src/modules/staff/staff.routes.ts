import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requirePanel, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as staffController from './staff.controller.js'
import {
  createActivitySchema,
  createStaffSchema,
  listStaffQuerySchema,
  salesDashboardQuerySchema,
  sessionIdParamSchema,
  setBusySchema,
  staffIdParamSchema,
  staffSessionParamSchema,
  updateMeSchema,
  updateStaffSchema,
  upsertKpiSchema,
} from './staff.schema.js'

export const adminStaffRouter = Router()

adminStaffRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listStaffQuerySchema }),
  asyncRoute(staffController.listStaff),
)
adminStaffRouter.get(
  '/kpis',
  requireAuth,
  requireRole('ADMIN'),
  asyncRoute(staffController.teamKpi),
)
adminStaffRouter.get(
  '/me',
  requireAuth,
  requirePanel(),
  asyncRoute(staffController.myProfile),
)
adminStaffRouter.patch(
  '/me',
  requireAuth,
  requirePanel(),
  validate({ body: updateMeSchema }),
  asyncRoute(staffController.updateMe),
)
adminStaffRouter.patch(
  '/me/busy',
  requireAuth,
  requirePanel(),
  validate({ body: setBusySchema }),
  asyncRoute(staffController.setMyBusy),
)
adminStaffRouter.post('/me/heartbeat', requireAuth, requirePanel(), asyncRoute(staffController.heartbeat))
adminStaffRouter.get('/me/sessions', requireAuth, requirePanel(), asyncRoute(staffController.mySessions))
adminStaffRouter.delete(
  '/me/sessions/:sessionId',
  requireAuth,
  requirePanel(),
  validate({ params: sessionIdParamSchema }),
  asyncRoute(staffController.revokeMySession),
)
adminStaffRouter.get(
  '/me/dashboard',
  requireAuth,
  requireRole('SALES_OPERATOR'),
  validate({ query: salesDashboardQuerySchema }),
  asyncRoute(staffController.myDashboard),
)
adminStaffRouter.post(
  '/me/activities',
  requireAuth,
  requireRole('SALES_OPERATOR'),
  validate({ body: createActivitySchema }),
  asyncRoute(staffController.logMyActivity),
)
adminStaffRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createStaffSchema }),
  asyncRoute(staffController.createStaff),
)
adminStaffRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: staffIdParamSchema }),
  asyncRoute(staffController.getStaff),
)
adminStaffRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: staffIdParamSchema, body: updateStaffSchema }),
  asyncRoute(staffController.updateStaff),
)
adminStaffRouter.post(
  '/:id/kpi',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: staffIdParamSchema, body: upsertKpiSchema }),
  asyncRoute(staffController.upsertKpi),
)
adminStaffRouter.get(
  '/:id/sessions',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: staffIdParamSchema }),
  asyncRoute(staffController.staffSessions),
)
adminStaffRouter.delete(
  '/:id/sessions/:sessionId',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: staffSessionParamSchema }),
  asyncRoute(staffController.revokeStaffSession),
)
