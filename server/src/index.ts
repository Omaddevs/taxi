import { createServer } from 'node:http'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { initSocket } from './lib/socket.js'
import { ensureAdminFromEnv } from './lib/ensureAdmin.js'
import { startBookingScheduler } from './modules/bookings/bookings.scheduler.js'
import { startSubscriptionScheduler } from './modules/subscriptions/subscriptions.lifecycle.js'

const app = createApp()
const httpServer = createServer(app)
initSocket(httpServer)
startBookingScheduler()
startSubscriptionScheduler()
ensureAdminFromEnv().catch((err) => console.error('ensureAdminFromEnv failed:', err))

httpServer.listen(env.PORT, () => {
  console.log(`TaxiLine API listening on http://localhost:${env.PORT}`)
  if (process.env.NODE_ENV === 'production' && env.SMS_PROVIDER === 'console') {
    console.warn('[warn] SMS_PROVIDER=console — OTP codes are only logged; users can sign in via the Telegram bot only.')
  }
})
