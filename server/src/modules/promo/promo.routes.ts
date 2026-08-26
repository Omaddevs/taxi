import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as promoController from './promo.controller.js'
import {
  applyPromoSchema,
  createPromoSchema,
  promoIdParamSchema,
  updatePromoSchema,
  validatePromoSchema,
} from './promo.schema.js'

export const promoRouter = Router()

promoRouter.post('/validate', requireAuth, validate({ body: validatePromoSchema }), asyncRoute(promoController.validatePromo))
promoRouter.post('/apply', requireAuth, validate({ body: applyPromoSchema }), asyncRoute(promoController.applyPromo))

export const adminPromoRouter = Router()

adminPromoRouter.get('/', requireAuth, requireRole('ADMIN'), asyncRoute(promoController.listPromos))
adminPromoRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createPromoSchema }),
  asyncRoute(promoController.createPromo),
)
adminPromoRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: promoIdParamSchema, body: updatePromoSchema }),
  asyncRoute(promoController.updatePromo),
)
