import type { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { verifyAccessToken } from './jwt.js'
import { env } from '../config/env.js'
import { driverRoom, conversationRoom, userRoom } from '../realtime/events.js'

let io: SocketIOServer | undefined

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Missing auth token'))
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.sub
      socket.data.role = payload.role
      next()
    } catch {
      next(new Error('Invalid auth token'))
    }
  })

  io.on('connection', (socket) => {
    if (socket.data.userId) socket.join(userRoom(socket.data.userId))

    socket.on('driver:join', (driverId: string) => {
      if (socket.data.userId) socket.join(driverRoom(driverId))
    })
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(conversationRoom(conversationId))
    })
  })

  return io
}

export function getIo(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first')
  return io
}
