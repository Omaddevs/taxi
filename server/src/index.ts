import { createServer } from 'node:http'
import { env } from './config/env.js'
import { createApp } from './app.js'
import { initSocket } from './lib/socket.js'
import { startBookingScheduler } from './modules/bookings/bookings.scheduler.js'

const app = createApp()
const httpServer = createServer(app)
initSocket(httpServer)
startBookingScheduler()

httpServer.listen(env.PORT, () => {
  console.log(`TaxiLine API listening on http://localhost:${env.PORT}`)
})
