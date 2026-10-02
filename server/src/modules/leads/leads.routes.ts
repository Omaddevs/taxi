import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as leadsController from './leads.controller.js'
import { createLeadSchema, leadIdParamSchema, listLeadsQuerySchema, updateLeadSchema } from './leads.schema.js'

const staff = ['ADMIN', 'SALES_OPERATOR'] as const

export const adminLeadsRouter = Router()

adminLeadsRouter.get(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ query: listLeadsQuerySchema }),
  asyncRoute(leadsController.listLeads),
)
adminLeadsRouter.post(
  '/',
  requireAuth,
  requireRole(...staff),
  validate({ body: createLeadSchema }),
  asyncRoute(leadsController.createLead),
)
adminLeadsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: leadIdParamSchema, body: updateLeadSchema }),
  asyncRoute(leadsController.updateLead),
)
adminLeadsRouter.delete(
  '/:id',
  requireAuth,
  requireRole(...staff),
  validate({ params: leadIdParamSchema }),
  asyncRoute(leadsController.deleteLead),
)
