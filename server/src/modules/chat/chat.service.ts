import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { getIo } from '../../lib/socket.js'
import { SOCKET_EVENTS, conversationRoom, userRoom } from '../../realtime/events.js'

const PARTICIPANT_SELECT = { id: true, name: true, phone: true, avatarUrl: true } as const

async function getConversationOrThrow(id: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { participantA: { select: PARTICIPANT_SELECT }, participantB: { select: PARTICIPANT_SELECT } },
  })
  if (!conversation) throw new NotFoundError('Suhbat topilmadi')
  if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
    throw new ForbiddenError('Bu suhbat sizga tegishli emas')
  }
  return conversation
}

function otherOf(conversation: { participantAId: string; participantA: unknown; participantB: unknown }, userId: string) {
  return conversation.participantAId === userId ? conversation.participantB : conversation.participantA
}

function emitToConversation(
  conversation: { id: string; participantAId: string; participantBId: string },
  event: string,
  payload: unknown,
) {
  try {
    const io = getIo()
    io.to(conversationRoom(conversation.id)).emit(event, payload)
    io.to(userRoom(conversation.participantAId)).emit(event, payload)
    io.to(userRoom(conversation.participantBId)).emit(event, payload)
  } catch {
    // Socket.io not initialized — safe to skip (e.g. scripts/tests).
  }
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participantAId: userId }, { participantBId: userId }] },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      participantA: { select: PARTICIPANT_SELECT },
      participantB: { select: PARTICIPANT_SELECT },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  return Promise.all(
    conversations.map(async (c) => {
      const unreadCount = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      })
      return {
        id: c.id,
        otherParticipant: otherOf(c, userId),
        lastMessage: c.messages[0] ?? null,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
      }
    }),
  )
}

export async function getConversation(conversationId: string, userId: string) {
  const conversation = await getConversationOrThrow(conversationId, userId)
  const unreadCount = await prisma.message.count({
    where: { conversationId, senderId: { not: userId }, readAt: null },
  })
  const last = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  })
  return {
    id: conversation.id,
    otherParticipant: otherOf(conversation, userId),
    lastMessage: last,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount,
  }
}

export async function listMessages(conversationId: string, userId: string, cursor?: string, limit = 80) {
  await getConversationOrThrow(conversationId, userId)

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  input: { type?: 'TEXT' | 'LOCATION'; text?: string; lat?: number; lng?: number; locationLabel?: string },
) {
  const conversation = await getConversationOrThrow(conversationId, userId)
  const type = input.type === 'LOCATION' ? 'LOCATION' : 'TEXT'

  let text = input.text?.trim() || ''
  let lat: number | null = null
  let lng: number | null = null
  let locationLabel: string | null = null

  if (type === 'LOCATION') {
    if (typeof input.lat !== 'number' || typeof input.lng !== 'number') {
      throw new ValidationError('Lokatsiya koordinatasi kerak')
    }
    lat = input.lat
    lng = input.lng
    locationLabel = input.locationLabel?.trim() || 'Joylashuv'
    text = text || `📍 ${locationLabel}`
  } else if (!text) {
    throw new ValidationError('Xabar bo‘sh bo‘lmasligi kerak')
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { conversationId, senderId: userId, type, text, lat, lng, locationLabel },
    })
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } })
    return created
  })

  emitToConversation(conversation, SOCKET_EVENTS.CHAT_MESSAGE, message)
  return message
}

export async function markRead(conversationId: string, userId: string) {
  const conversation = await getConversationOrThrow(conversationId, userId)

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  })

  emitToConversation(conversation, SOCKET_EVENTS.CHAT_READ, { conversationId, readBy: userId })
}
