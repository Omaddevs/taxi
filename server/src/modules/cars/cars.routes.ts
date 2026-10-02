import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as carsController from './cars.controller.js'
import { carIdParamSchema, createCarSchema, updateCarSchema } from './cars.schema.js'

export const carsRouter = Router()
carsRouter.get('/', asyncRoute(carsController.listCars))

export const adminCarsRouter = Router()
adminCarsRouter.get('/', requireAuth, requireRole('ADMIN'), asyncRoute(carsController.listCarsAdmin))
adminCarsRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createCarSchema }),
  asyncRoute(carsController.createCar),
)
adminCarsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: carIdParamSchema, body: updateCarSchema }),
  asyncRoute(carsController.updateCar),
)
adminCarsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: carIdParamSchema }),
  asyncRoute(carsController.deleteCar),
)
