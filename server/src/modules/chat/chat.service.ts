import { prisma } from '../../lib/prisma.js'
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js'
import { getIo } from '../../lib/socket.js'
import { SOCKET_EVENTS, conversationRoom } from '../../realtime/events.js'

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
      const other = c.participantAId === userId ? c.participantB : c.participantA
      const unreadCount = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      })
      return {
        id: c.id,
        otherParticipant: other,
        lastMessage: c.messages[0] ?? null,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
      }
    }),
  )
}

export async function listMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
  await getConversationOrThrow(conversationId, userId)

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  })
}

export async function sendMessage(conversationId: string, userId: string, text: string) {
  await getConversationOrThrow(conversationId, userId)

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({ data: { conversationId, senderId: userId, text } })
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } })
    return created
  })

  try {
    getIo().to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.CHAT_MESSAGE, message)
  } catch {
    // Socket.io not initialized — safe to skip (e.g. scripts/tests).
  }

  return message
}

export async function markRead(conversationId: string, userId: string) {
  await getConversationOrThrow(conversationId, userId)

  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  })

  try {
    getIo().to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.CHAT_READ, { conversationId, readBy: userId })
  } catch {
    // Socket.io not initialized — safe to skip.
  }
}
