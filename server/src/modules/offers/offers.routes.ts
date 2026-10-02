import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as offersController from './offers.controller.js'
import {
  adminSetOfferStatusSchema,
  adminUpdateOfferSchema,
  createOfferSchema,
  listOffersAdminQuerySchema,
  offerIdParamSchema,
  searchOffersQuerySchema,
  updateOfferSchema,
} from './offers.schema.js'

export const offersRouter = Router()

offersRouter.get('/search', validate({ query: searchOffersQuerySchema }), asyncRoute(offersController.searchOffers))
offersRouter.get('/:id', validate({ params: offerIdParamSchema }), asyncRoute(offersController.getOffer))

export const driverOffersRouter = Router()

driverOffersRouter.post(
  '/',
  requireAuth,
  requireRole('DRIVER'),
  validate({ body: createOfferSchema }),
  asyncRoute(offersController.createOffer),
)
driverOffersRouter.get('/', requireAuth, requireRole('DRIVER'), asyncRoute(offersController.listMyOffers))
driverOffersRouter.patch(
  '/:id',
  requireAuth,
  requireRole('DRIVER'),
  validate({ params: offerIdParamSchema, body: updateOfferSchema }),
  asyncRoute(offersController.updateOffer),
)

export const adminOffersRouter = Router()
adminOffersRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listOffersAdminQuerySchema }),
  asyncRoute(offersController.listAllOffersAdmin),
)
adminOffersRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: offerIdParamSchema }),
  asyncRoute(offersController.getOffer),
)
adminOffersRouter.patch(
  '/:id/cancel',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: offerIdParamSchema }),
  asyncRoute(offersController.adminCancelOffer),
)
adminOffersRouter.patch(
  '/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: offerIdParamSchema, body: adminSetOfferStatusSchema }),
  asyncRoute(offersController.adminSetOfferStatus),
)
adminOffersRouter.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: offerIdParamSchema, body: adminUpdateOfferSchema }),
  asyncRoute(offersController.adminUpdateOffer),
)
adminOffersRouter.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: offerIdParamSchema }),
  asyncRoute(offersController.adminDeleteOffer),
)
