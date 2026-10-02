import { Router } from 'express'
import { asyncRoute } from '../../middleware/asyncRoute.js'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import * as bookingsController from './bookings.controller.js'
import {
  bookingIdParamSchema,
  cancelBookingSchema,
  createBookingSchema,
  listBookingsAdminQuerySchema,
  listBookingsQuerySchema,
  rateBookingSchema,
} from './bookings.schema.js'

export const bookingsRouter = Router()

bookingsRouter.post('/', requireAuth, validate({ body: createBookingSchema }), asyncRoute(bookingsController.createBooking))
bookingsRouter.get('/', requireAuth, validate({ query: listBookingsQuerySchema }), asyncRoute(bookingsController.listBookings))
bookingsRouter.get('/:id', requireAuth, validate({ params: bookingIdParamSchema }), asyncRoute(bookingsController.getBooking))
bookingsRouter.patch('/:id/accept', requireAuth, validate({ params: bookingIdParamSchema }), asyncRoute(bookingsController.acceptBooking))
bookingsRouter.patch('/:id/reject', requireAuth, validate({ params: bookingIdParamSchema }), asyncRoute(bookingsController.rejectBooking))
bookingsRouter.patch('/:id/start', requireAuth, validate({ params: bookingIdParamSchema }), asyncRoute(bookingsController.startBooking))
bookingsRouter.patch(
  '/:id/complete',
  requireAuth,
  validate({ params: bookingIdParamSchema }),
  asyncRoute(bookingsController.completeBooking),
)
bookingsRouter.patch(
  '/:id/cancel',
  requireAuth,
  validate({ params: bookingIdParamSchema, body: cancelBookingSchema }),
  asyncRoute(bookingsController.cancelBooking),
)
bookingsRouter.get(
  '/:id/rating',
  requireAuth,
  validate({ params: bookingIdParamSchema }),
  asyncRoute(bookingsController.getBookingRatingStatus),
)
bookingsRouter.post(
  '/:id/rating',
  requireAuth,
  validate({ params: bookingIdParamSchema, body: rateBookingSchema }),
  asyncRoute(bookingsController.rateBooking),
)

export const adminBookingsRouter = Router()
adminBookingsRouter.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listBookingsAdminQuerySchema }),
  asyncRoute(bookingsController.listAllBookingsAdmin),
)
adminBookingsRouter.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: bookingIdParamSchema }),
  asyncRoute(bookingsController.getBooking),
)
adminBookingsRouter.patch(
  '/:id/cancel',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: bookingIdParamSchema, body: cancelBookingSchema }),
  asyncRoute(bookingsController.adminCancelBooking),
)
