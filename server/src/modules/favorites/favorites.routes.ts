import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as favoritesController from './favorites.controller.js'
import { rideOfferIdParamSchema } from './favorites.schema.js'

export const favoritesRouter = Router()

favoritesRouter.get('/', requireAuth, asyncRoute(favoritesController.listFavorites))
favoritesRouter.post(
  '/:rideOfferId',
  requireAuth,
  validate({ params: rideOfferIdParamSchema }),
  asyncRoute(favoritesController.addFavorite),
)
favoritesRouter.delete(
  '/:rideOfferId',
  requireAuth,
  validate({ params: rideOfferIdParamSchema }),
  asyncRoute(favoritesController.removeFavorite),
)
