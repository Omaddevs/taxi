import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as controller from './adminBotGroups.controller.js'
import {
  createGroupSchema,
  groupIdParamSchema,
  listGroupAdsQuerySchema,
  listGroupsQuerySchema,
  updateBotSettingsSchema,
  updateGroupSchema,
} from './adminBotGroups.schema.js'

export const adminBotGroupsRouter = Router()

// Bot sozlamalari and the group-ads log — mounted at /admin/bot-settings (see app.ts).
export const adminBotSettingsRouter = Router()

adminBotSettingsRouter.get('/', requireAuth, requireRole('ADMIN'), asyncRoute(controller.getBotSettings))
adminBotSettingsRouter.patch(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: updateBotSettingsSchema }),
  asyncRoute(controller.updateBotSettings),
)
adminBotSettingsRouter.get(
  '/group-ads',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listGroupAdsQuerySchema }),
  asyncRoute(controller.listGroupAds),
)

adminBotGroupsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listGroupsQuerySchema }),
  asyncRoute(controller.listGroups),
)
adminBotGroupsRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createGroupSchema }),
  asyncRoute(controller.createGroup),
)
adminBotGroupsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: groupIdParamSchema, body: updateGroupSchema }),
  asyncRoute(controller.updateGroup),
)
adminBotGroupsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: groupIdParamSchema }),
  asyncRoute(controller.deleteGroup),
)
