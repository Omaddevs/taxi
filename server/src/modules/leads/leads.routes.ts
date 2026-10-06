import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as leadsController from './leads.controller.js'
import { createLeadSchema, leadIdParamSchema, listLeadsQuerySchema, updateLeadSchema, websiteLeadSchema } from './leads.schema.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import * as leadsService from './leads.service.js'

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

// Ochiq: landing sahifadagi forma (autentifikatsiyasiz, IP bo‘yicha cheklangan)
export const publicLeadsRouter = Router()
publicLeadsRouter.post(
  '/',
  rateLimit(20, 10 * 60_000),
  validate({ body: websiteLeadSchema }),
  asyncRoute(async (req, res) => {
    res.status(201).json(await leadsService.createWebsiteLead(req.body))
  }),
)
