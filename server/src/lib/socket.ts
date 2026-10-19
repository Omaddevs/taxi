import type { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { verifyAccessToken } from './jwt.js'
import { env } from '../config/env.js'
import { prisma } from './prisma.js'
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

    // Rooms carry other people's bookings and messages — join only your own driver profile and
    // conversations you are part of.
    socket.on('driver:join', async (driverId: unknown) => {
      if (typeof driverId !== 'string') return
      const own = await prisma.driver
        .findFirst({ where: { id: driverId, userId: socket.data.userId }, select: { id: true } })
        .catch(() => null)
      if (own) socket.join(driverRoom(driverId))
    })
    socket.on('conversation:join', async (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return
      const userId = socket.data.userId
      const mine = await prisma.conversation
        .findFirst({
          where: { id: conversationId, OR: [{ participantAId: userId }, { participantBId: userId }] },
          select: { id: true },
        })
        .catch(() => null)
      if (mine) socket.join(conversationRoom(conversationId))
    })
  })

  return io
}

export function getIo(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first')
  return io
}
