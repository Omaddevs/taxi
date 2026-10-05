import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as mapPlacesController from './mapPlaces.controller.js'
import {
  createMapPlaceSchema,
  listMapPlacesQuerySchema,
  mapPlaceIdParamSchema,
  updateMapPlaceSchema,
} from './mapPlaces.schema.js'

// Public — the website's Smart xarita (works for guests too).
export const mapPlacesRouter = Router()
mapPlacesRouter.get('/', asyncRoute(mapPlacesController.listActivePlaces))

export const adminMapPlacesRouter = Router()
adminMapPlacesRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listMapPlacesQuerySchema }),
  asyncRoute(mapPlacesController.listPlacesAdmin),
)
adminMapPlacesRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createMapPlaceSchema }),
  asyncRoute(mapPlacesController.createPlace),
)
adminMapPlacesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: mapPlaceIdParamSchema, body: updateMapPlaceSchema }),
  asyncRoute(mapPlacesController.updatePlace),
)
adminMapPlacesRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: mapPlaceIdParamSchema }),
  asyncRoute(mapPlacesController.deletePlace),
)
