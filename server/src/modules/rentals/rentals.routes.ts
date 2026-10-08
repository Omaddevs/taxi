import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requirePanel, requireRole } from '../../middleware/auth.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { validate } from '../../middleware/validate.js'
import * as rentalsController from './rentals.controller.js'
import {
  adminCreateRentalSchema,
  adminListRentalsQuerySchema,
  adminUpdateRentalSchema,
  browseRentalsQuerySchema,
  createRentalSchema,
  listRentalsQuerySchema,
  rentalIdParamSchema,
  updateRentalSchema,
} from './rentals.schema.js'

// Website "Skuter ijara" market. Browsing is open; posting needs a passenger/driver account
// (panel tokens are kept out so staff post through the panel, where it's audited).
export const rentalsRouter = Router()
const owner = [requireAuth, requireRole('PASSENGER', 'DRIVER')]

rentalsRouter.get('/', validate({ query: listRentalsQuerySchema }), asyncRoute(rentalsController.listPublic))
rentalsRouter.get('/mine', ...owner, asyncRoute(rentalsController.listMine))
// Telegram bot browsing (public data, one card per call).
rentalsRouter.get('/browse', validate({ query: browseRentalsQuerySchema }), asyncRoute(rentalsController.browse))
rentalsRouter.get('/:id', validate({ params: rentalIdParamSchema }), asyncRoute(rentalsController.getPublic))
rentalsRouter.post(
  '/',
  ...owner,
  rateLimit(20, 60 * 60_000),
  validate({ body: createRentalSchema }),
  asyncRoute(rentalsController.createMine),
)
rentalsRouter.patch(
  '/:id',
  ...owner,
  validate({ params: rentalIdParamSchema, body: updateRentalSchema }),
  asyncRoute(rentalsController.updateMine),
)
rentalsRouter.delete('/:id', ...owner, validate({ params: rentalIdParamSchema }), asyncRoute(rentalsController.deleteMine))

// Panel: admins and both operator kinds moderate and manage listings.
export const adminRentalsRouter = Router()
adminRentalsRouter.use(requireAuth, requirePanel())
adminRentalsRouter.get('/', validate({ query: adminListRentalsQuerySchema }), asyncRoute(rentalsController.listAdmin))
adminRentalsRouter.get('/:id', validate({ params: rentalIdParamSchema }), asyncRoute(rentalsController.getAdmin))
adminRentalsRouter.post('/', validate({ body: adminCreateRentalSchema }), asyncRoute(rentalsController.createAdmin))
adminRentalsRouter.patch(
  '/:id',
  validate({ params: rentalIdParamSchema, body: adminUpdateRentalSchema }),
  asyncRoute(rentalsController.updateAdmin),
)
adminRentalsRouter.delete('/:id', validate({ params: rentalIdParamSchema }), asyncRoute(rentalsController.deleteAdmin))
