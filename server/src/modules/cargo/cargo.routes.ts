import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as cargoController from './cargo.controller.js'
import { cancelCargoOrderSchema, cargoOrderIdParamSchema, createCargoOrderSchema } from './cargo.schema.js'

// Rider ("Yetkazib berish")
export const cargoRouter = Router()

cargoRouter.get('/mine', requireAuth, asyncRoute(cargoController.listRiderCargoOrders))
cargoRouter.post('/', requireAuth, validate({ body: createCargoOrderSchema }), asyncRoute(cargoController.createCargoOrder))
cargoRouter.get('/:id', requireAuth, validate({ params: cargoOrderIdParamSchema }), asyncRoute(cargoController.getRiderCargoOrder))
cargoRouter.post(
  '/:id/cancel',
  requireAuth,
  validate({ params: cargoOrderIdParamSchema, body: cancelCargoOrderSchema }),
  asyncRoute(cargoController.cancelByRider),
)

// Driver (website "Yuklar")
export const driverCargoRouter = Router()
const driverOnly = [requireAuth, requireRole('DRIVER')]

driverCargoRouter.get('/open', ...driverOnly, asyncRoute(cargoController.listOpenCargoOrders))
driverCargoRouter.get('/mine', ...driverOnly, asyncRoute(cargoController.listMyCargoOrders))
driverCargoRouter.get('/:id', ...driverOnly, validate({ params: cargoOrderIdParamSchema }), asyncRoute(cargoController.getDriverCargoOrder))
driverCargoRouter.post('/:id/claim', ...driverOnly, validate({ params: cargoOrderIdParamSchema }), asyncRoute(cargoController.claimCargoOrder))
driverCargoRouter.post('/:id/complete', ...driverOnly, validate({ params: cargoOrderIdParamSchema }), asyncRoute(cargoController.completeCargoOrder))
// "Voz kechish": the job goes back to NEW for another driver. `/cancel` is the old name.
for (const path of ['/:id/release', '/:id/cancel']) {
  driverCargoRouter.post(
    path,
    ...driverOnly,
    validate({ params: cargoOrderIdParamSchema, body: cancelCargoOrderSchema }),
    asyncRoute(cargoController.releaseCargoOrder),
  )
}
