import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as auditController from './audit.controller.js'
import { listAuditQuerySchema } from './audit.schema.js'

export const adminAuditRouter = Router()

adminAuditRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listAuditQuerySchema }),
  asyncRoute(auditController.listAudit),
)
