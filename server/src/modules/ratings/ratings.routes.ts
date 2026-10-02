import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as ratingsController from './ratings.controller.js'
import { listRatingsQuerySchema } from './ratings.schema.js'

export const adminRatingsRouter = Router()

adminRatingsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listRatingsQuerySchema }),
  asyncRoute(ratingsController.listAllRatings),
)
