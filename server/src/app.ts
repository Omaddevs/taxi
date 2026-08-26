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
import { walletRouter } from './modules/wallet/wallet.routes.js'
import { paymentsRouter } from './modules/payments/payments.routes.js'
import { notificationsRouter } from './modules/notifications/notifications.routes.js'
import { favoritesRouter } from './modules/favorites/favorites.routes.js'
import { adminPromoRouter, promoRouter } from './modules/promo/promo.routes.js'
import { adminServicesRouter, servicesRouter } from './modules/services/services.routes.js'
import { adminAnalyticsRouter } from './modules/analytics/analytics.routes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }))
  app.use(express.json())

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
  app.use('/conversations', chatRouter)
  app.use('/wallet', walletRouter)
  app.use('/payments', paymentsRouter)
  app.use('/notifications', notificationsRouter)
  app.use('/favorites', favoritesRouter)
  app.use('/promo', promoRouter)
  app.use('/admin/promo', adminPromoRouter)
  app.use('/services', servicesRouter)
  app.use('/admin/services', adminServicesRouter)
  app.use('/admin/analytics', adminAnalyticsRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  })

  app.use(errorHandler)

  return app
}
