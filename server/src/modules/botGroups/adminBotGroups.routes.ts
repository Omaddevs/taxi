import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as controller from './adminBotGroups.controller.js'
import { createGroupSchema, groupIdParamSchema, listGroupsQuerySchema, updateGroupSchema } from './adminBotGroups.schema.js'

export const adminBotGroupsRouter = Router()

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
