import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requirePanel, requireRole } from '../../middleware/auth.js'
import { ValidationError } from '../../errors/AppError.js'
import { resolveMapLink } from '../../lib/geoLink.js'
import { validate } from '../../middleware/validate.js'
import * as mapPlacesController from './mapPlaces.controller.js'
import {
  createMapPlaceSchema,
  listMapPlacesQuerySchema,
  mapPlaceIdParamSchema,
  resolveLinkQuerySchema,
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

// "Google/Yandex havolasi → nuqta" for the panel's map pickers: short share links
// (yandex.uz/maps/-/…, maps.app.goo.gl/…) only reveal coordinates after a redirect, which the
// browser can't follow cross-origin.
export const adminGeoRouter = Router()
adminGeoRouter.get(
  '/resolve',
  requireAuth,
  requirePanel(),
  validate({ query: resolveLinkQuerySchema }),
  asyncRoute(async (req, res) => {
    const point = await resolveMapLink(String(req.query.url)).catch(() => null)
    if (!point) {
      throw new ValidationError(
        'Havoladan joylashuv aniqlanmadi. Yandex/Google xaritada nuqtani bosib, koordinatalarni nusxalang yoki xaritadan belgilang.',
      )
    }
    res.json({ lat: point[0], lng: point[1] })
  }),
)
