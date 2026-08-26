import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as servicesController from './services.controller.js'
import { createServiceSchema, serviceIdParamSchema, updateServiceSchema } from './services.schema.js'

export const servicesRouter = Router()
servicesRouter.get('/', asyncRoute(servicesController.listActiveServices))

export const adminServicesRouter = Router()
adminServicesRouter.get('/', requireAuth, requireRole('ADMIN'), asyncRoute(servicesController.listAllServices))
adminServicesRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createServiceSchema }),
  asyncRoute(servicesController.createService),
)
adminServicesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: serviceIdParamSchema, body: updateServiceSchema }),
  asyncRoute(servicesController.updateService),
)
