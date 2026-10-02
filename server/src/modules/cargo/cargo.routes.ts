import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as cargoController from './cargo.controller.js'
import { cancelCargoOrderSchema, cargoOrderIdParamSchema, createCargoOrderSchema } from './cargo.schema.js'

export const cargoRouter = Router()

cargoRouter.get('/mine', requireAuth, asyncRoute(cargoController.listRiderCargoOrders))
cargoRouter.post('/', requireAuth, validate({ body: createCargoOrderSchema }), asyncRoute(cargoController.createCargoOrder))

export const driverCargoRouter = Router()

driverCargoRouter.get('/open', requireAuth, requireRole('DRIVER'), asyncRoute(cargoController.listOpenCargoOrders))
driverCargoRouter.get('/mine', requireAuth, requireRole('DRIVER'), asyncRoute(cargoController.listMyCargoOrders))
driverCargoRouter.post(
  '/:id/claim',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: cargoOrderIdParamSchema }),
  asyncRoute(cargoController.claimCargoOrder),
)
driverCargoRouter.post(
  '/:id/complete',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: cargoOrderIdParamSchema }),
  asyncRoute(cargoController.completeCargoOrder),
)
driverCargoRouter.post(
  '/:id/cancel',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: cargoOrderIdParamSchema, body: cancelCargoOrderSchema }),
  asyncRoute(cargoController.cancelCargoOrder),
)
