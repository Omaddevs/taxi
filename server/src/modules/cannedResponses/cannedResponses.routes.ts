import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as cannedController from './cannedResponses.controller.js'
import {
  cannedIdParamSchema,
  createCannedSchema,
  listCannedQuerySchema,
  updateCannedSchema,
} from './cannedResponses.schema.js'

const staff = ['ADMIN', 'SUPPORT_OPERATOR'] as const

export const adminCannedResponsesRouter = Router()

adminCannedResponsesRouter.get(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ query: listCannedQuerySchema }),
  asyncRoute(cannedController.listCanned),
)
adminCannedResponsesRouter.post(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ body: createCannedSchema }),
  asyncRoute(cannedController.createCanned),
)
adminCannedResponsesRouter.patch(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: cannedIdParamSchema, body: updateCannedSchema }),
  asyncRoute(cannedController.updateCanned),
)
adminCannedResponsesRouter.delete(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: cannedIdParamSchema }),
  asyncRoute(cannedController.deleteCanned),
)
