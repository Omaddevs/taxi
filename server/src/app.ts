import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { adminAuthRouter, authRouter } from './modules/auth/auth.routes.js'
import { adminUsersRouter, usersRouter } from './modules/users/users.routes.js'
import { adminDriversRouter, driversRouter } from './modules/drivers/drivers.routes.js'
import { adminOffersRouter, driverOffersRouter, offersRouter } from './modules/offers/offers.routes.js'
import { adminBookingsRouter, bookingsRouter } from './modules/bookings/bookings.routes.js'
import { chatRouter } from './modules/chat/chat.routes.js'
import { adminWalletRouter, walletRouter } from './modules/wallet/wallet.routes.js'
import { paymentsRouter } from './modules/payments/payments.routes.js'
import { adminNotificationsRouter, notificationsRouter } from './modules/notifications/notifications.routes.js'
import { favoritesRouter } from './modules/favorites/favorites.routes.js'
import { adminPromoRouter, promoRouter } from './modules/promo/promo.routes.js'
import { adminServicesRouter, servicesRouter } from './modules/services/services.routes.js'
import { adminDriverSubscriptionsRouter, adminSubscriptionPlansRouter } from './modules/subscriptions/subscriptions.routes.js'
import { adminAnalyticsRouter } from './modules/analytics/analytics.routes.js'
import { adminRatingsRouter } from './modules/ratings/ratings.routes.js'
import { adminPeopleRouter } from './modules/people/people.routes.js'
import { adminStaffRouter } from './modules/staff/staff.routes.js'
import { adminTicketsRouter } from './modules/tickets/tickets.routes.js'
import { adminReportsRouter } from './modules/reports/reports.routes.js'
import { adminAuditRouter } from './modules/audit/audit.routes.js'
import { adminLeadsRouter } from './modules/leads/leads.routes.js'
import { adminCannedResponsesRouter } from './modules/cannedResponses/cannedResponses.routes.js'
import { ticketSatisfactionRouter } from './modules/tickets/tickets.routes.js'
import { botRouter } from './modules/bot/bot.routes.js'
import { botOrdersRouter } from './modules/botOrders/botOrders.routes.js'
import { adminBotOrdersRouter } from './modules/botOrders/adminBotOrders.routes.js'
import { adminBotGroupsRouter } from './modules/botGroups/adminBotGroups.routes.js'
import { adminInstagramRouter, adminLeadMessagesRouter, instagramWebhookRouter } from './modules/instagram/instagram.routes.js'
import { cargoRouter, driverCargoRouter } from './modules/cargo/cargo.routes.js'
import { adminCarsRouter, carsRouter } from './modules/cars/cars.routes.js'
import { adminMapPlacesRouter, mapPlacesRouter } from './modules/mapPlaces/mapPlaces.routes.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Raw JSON bytes, captured below — Meta's X-Hub-Signature-256 is computed over these
      // exact bytes, not a re-serialized copy of req.body.
      rawBody?: Buffer
    }
  }
}

export function createApp() {
  const app = express()

  if (env.TRUST_PROXY) app.set('trust proxy', 1)
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(
    express.json({
      // Admin image uploads (car catalog) travel as data: URIs — the 100kb default rejects them.
      limit: '2mb',
      verify: (req, _res, buf) => {
        ;(req as express.Request).rawBody = buf
      },
    }),
  )

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/auth', authRouter)
  app.use('/admin/auth', adminAuthRouter)
  app.use('/users', usersRouter)
  app.use('/admin/users', adminUsersRouter)
  app.use('/drivers', driversRouter)
  app.use('/admin/drivers', adminDriversRouter)
  app.use('/offers', offersRouter)
  app.use('/drivers/me/offers', driverOffersRouter)
  app.use('/admin/offers', adminOffersRouter)
  app.use('/bookings', bookingsRouter)
  app.use('/admin/bookings', adminBookingsRouter)
  app.use('/cargo-orders', cargoRouter)
  app.use('/drivers/me/cargo-orders', driverCargoRouter)
  app.use('/conversations', chatRouter)
  app.use('/wallet', walletRouter)
  app.use('/admin/wallet', adminWalletRouter)
  app.use('/payments', paymentsRouter)
  app.use('/notifications', notificationsRouter)
  app.use('/admin/notifications', adminNotificationsRouter)
  app.use('/favorites', favoritesRouter)
  app.use('/promo', promoRouter)
  app.use('/admin/promo', adminPromoRouter)
  app.use('/services', servicesRouter)
  app.use('/admin/services', adminServicesRouter)
  app.use('/cars', carsRouter)
  app.use('/admin/cars', adminCarsRouter)
  app.use('/places', mapPlacesRouter)
  app.use('/admin/places', adminMapPlacesRouter)
  app.use('/admin/subscription-plans', adminSubscriptionPlansRouter)
  app.use('/admin/driver-subscriptions', adminDriverSubscriptionsRouter)
  app.use('/admin/analytics', adminAnalyticsRouter)
  app.use('/admin/ratings', adminRatingsRouter)
  app.use('/admin/people', adminPeopleRouter)
  app.use('/admin/staff', adminStaffRouter)
  app.use('/admin/tickets', adminTicketsRouter)
  app.use('/tickets', ticketSatisfactionRouter)
  app.use('/admin/reports', adminReportsRouter)
  app.use('/admin/audit', adminAuditRouter)
  app.use('/admin/leads', adminLeadsRouter)
  app.use('/admin/canned-responses', adminCannedResponsesRouter)
  app.use('/bot', botRouter)
  app.use('/bot-orders', botOrdersRouter)
  app.use('/admin/bot-orders', adminBotOrdersRouter)
  app.use('/admin/bot-groups', adminBotGroupsRouter)
  app.use('/webhooks/instagram', instagramWebhookRouter)
  app.use('/admin/integrations/instagram', adminInstagramRouter)
  app.use('/admin/leads', adminLeadMessagesRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  app.use(errorHandler)

  return app
}
