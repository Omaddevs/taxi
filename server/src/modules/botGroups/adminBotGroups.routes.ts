import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as controller from './adminBotGroups.controller.js'
import {
  createGroupAdSchema,
  createGroupSchema,
  groupAdIdParamSchema,
  groupIdParamSchema,
  listGroupAdsQuerySchema,
  listGroupsQuerySchema,
  updateBotSettingsSchema,
  updateGroupAdSchema,
  updateGroupSchema,
  repeatGuardQuerySchema,
  adsStatsQuerySchema,
  repeatGuardUnmuteSchema,
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
  '/ads-stats',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: adsStatsQuerySchema }),
  asyncRoute(controller.adsStats),
)
adminBotSettingsRouter.get(
  '/repeat-guard',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: repeatGuardQuerySchema }),
  asyncRoute(controller.repeatGuardReport),
)
adminBotSettingsRouter.post(
  '/repeat-guard/unmute',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: repeatGuardUnmuteSchema }),
  asyncRoute(controller.repeatGuardUnmute),
)
adminBotSettingsRouter.get(
  '/group-ads',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listGroupAdsQuerySchema }),
  asyncRoute(controller.listGroupAds),
)
adminBotSettingsRouter.post(
  '/group-ads',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createGroupAdSchema }),
  asyncRoute(controller.createGroupAd),
)
adminBotSettingsRouter.patch(
  '/group-ads/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: groupAdIdParamSchema, body: updateGroupAdSchema }),
  asyncRoute(controller.updateGroupAd),
)
adminBotSettingsRouter.delete(
  '/group-ads/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: groupAdIdParamSchema }),
  asyncRoute(controller.deleteGroupAd),
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
