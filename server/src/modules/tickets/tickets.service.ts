import type { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { startOfDay } from '../../lib/period.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../errors/AppError.js'
import { createNotification } from '../notifications/notifications.service.js'

const PERSON_SUMMARY = { select: { id: true, name: true, phone: true } }

const TICKET_INCLUDE = {
  assignee: PERSON_SUMMARY,
  createdBy: PERSON_SUMMARY,
  booking: {
    select: {
      id: true,
      fromLabel: true,
      toLabel: true,
      status: true,
      totalPrice: true,
      departAt: true,
      rider: PERSON_SUMMARY,
      rideOffer: { select: { driver: { select: { id: true, user: PERSON_SUMMARY } } } },
    },
  },
  driver: { select: { id: true, plate: true, carModel: true, user: PERSON_SUMMARY } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: PERSON_SUMMARY },
  },
}

const TICKET_LIST_INCLUDE = {
  assignee: PERSON_SUMMARY,
  createdBy: PERSON_SUMMARY,
  booking: { select: { id: true, fromLabel: true, toLabel: true } },
  driver: { select: { id: true, plate: true, user: { select: { name: true, phone: true } } } },
  _count: { select: { messages: true } },
}

const OPEN_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING']

// How long each priority gets before a ticket counts as SLA-breached — surfaced to the UI as a
// countdown/overdue badge, computed on read rather than stored so changing the thresholds
// doesn't require a backfill.
const SLA_MINUTES: Record<TicketPriority, number> = { URGENT: 30, HIGH: 120, MEDIUM: 480, LOW: 1440 }

function withSla<T extends { priority: TicketPriority; createdAt: Date; status: TicketStatus }>(ticket: T) {
  const slaDueAt = new Date(ticket.createdAt.getTime() + SLA_MINUTES[ticket.priority] * 60_000)
  const slaBreached = OPEN_STATUSES.includes(ticket.status) && Date.now() > slaDueAt.getTime()
  return { ...ticket, slaDueAt, slaBreached }
}

export async function listTickets(filter: {
  status?: TicketStatus
  category?: TicketCategory
  q?: string
  mine?: boolean
  userId?: string
}) {
  const rows = await prisma.supportTicket.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.mine && filter.userId ? { assigneeId: filter.userId } : {}),
      ...(filter.q
        ? {
            OR: [
              { subject: { contains: filter.q, mode: 'insensitive' } },
              { requesterPhone: { contains: filter.q } },
              { requesterName: { contains: filter.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: TICKET_LIST_INCLUDE,
  })
  return rows.map(withSla)
}

export async function getTicket(id: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: TICKET_INCLUDE })
  if (!ticket) throw new NotFoundError('Murojaat topilmadi')
  return withSla(ticket)
}

export async function lookupBookings(q: string) {
  const digits = q.replace(/\D/g, '')
  return prisma.booking.findMany({
    where: {
      OR: [
        ...(digits.length >= 4 ? [{ rider: { is: { phone: { contains: digits } } } }] : []),
        { rider: { is: { name: { contains: q, mode: 'insensitive' as const } } } },
        { id: { contains: q } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      fromLabel: true,
      toLabel: true,
      status: true,
      departAt: true,
      createdAt: true,
      rider: { select: { id: true, name: true, phone: true } },
    },
  })
}

export async function lookupDrivers(q: string) {
  const digits = q.replace(/\D/g, '')
  return prisma.driver.findMany({
    where: {
      OR: [
        ...(digits.length >= 4 ? [{ user: { is: { phone: { contains: digits } } } }] : []),
        { user: { is: { name: { contains: q, mode: 'insensitive' as const } } } },
        { plate: { contains: q, mode: 'insensitive' as const } },
      ],
    },
    take: 10,
    select: { id: true, plate: true, carModel: true, user: { select: { id: true, name: true, phone: true } } },
  })
}

export async function createTicket(
  userId: string,
  input: {
    subject: string
    description: string
    category: TicketCategory
    priority?: TicketPriority
    requesterPhone?: string
    requesterName?: string
  },
) {
  return prisma.supportTicket.create({
    data: {
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority ?? 'MEDIUM',
      requesterPhone: input.requesterPhone,
      requesterName: input.requesterName,
      createdById: userId,
      messages: {
        create: { authorId: userId, body: input.description, internal: false },
      },
    },
    include: TICKET_INCLUDE,
  })
}

export async function updateTicket(
  id: string,
  actorId: string,
  patch: {
    status?: TicketStatus
    priority?: TicketPriority
    category?: TicketCategory
    assigneeId?: string | null
    claim?: boolean
    bookingId?: string | null
    driverId?: string | null
  },
) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } })
  if (!ticket) throw new NotFoundError('Murojaat topilmadi')

  const status = patch.status
  const resolved = status === 'RESOLVED' || status === 'CLOSED'
  const reopened = status && OPEN_STATUSES.includes(status)
  const justResolved = resolved && !ticket.resolvedAt
  const shouldRequestSatisfaction = justResolved && Boolean(ticket.userId) && !ticket.satisfactionRequestedAt

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(patch.priority ? { priority: patch.priority } : {}),
      ...(patch.category ? { category: patch.category } : {}),
      ...(patch.claim ? { assigneeId: actorId, status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status } : {}),
      ...(patch.assigneeId !== undefined && !patch.claim ? { assigneeId: patch.assigneeId } : {}),
      ...(patch.bookingId !== undefined ? { bookingId: patch.bookingId } : {}),
      ...(patch.driverId !== undefined ? { driverId: patch.driverId } : {}),
      ...(justResolved ? { resolvedAt: new Date() } : {}),
      ...(reopened ? { resolvedAt: null } : {}),
      ...(shouldRequestSatisfaction ? { satisfactionRequestedAt: new Date() } : {}),
    },
    include: TICKET_INCLUDE,
  })

  if (shouldRequestSatisfaction && ticket.userId) {
    await createNotification(
      ticket.userId,
      'TICKET_SATISFACTION',
      'Xizmatni baholang',
      `Murojaatingiz #${ticket.ticketNo} hal qilindi. Xizmatimizni baholab bering.`,
      ticket.id,
    )
  }

  return withSla(updated)
}

export async function submitSatisfaction(id: string, userId: string, rating: number, comment?: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } })
  if (!ticket) throw new NotFoundError('Murojaat topilmadi')
  if (ticket.userId !== userId) throw new ForbiddenError('Bu murojaat sizga tegishli emas')
  if (ticket.satisfactionRating !== null) throw new ValidationError('Baho allaqachon qo‘yilgan')

  return prisma.supportTicket.update({
    where: { id },
    data: { satisfactionRating: rating, satisfactionComment: comment },
    select: { id: true, ticketNo: true, satisfactionRating: true, satisfactionComment: true },
  })
}

export async function addMessage(id: string, authorId: string, body: string, internal = false) {
  await getTicket(id)
  const message = await prisma.supportTicketMessage.create({
    data: { ticketId: id, authorId, body, internal },
    include: { author: { select: { id: true, name: true, phone: true } } },
  })
  return message
}

export async function ticketStats() {
  const today = startOfDay()
  const [open, mineWait, resolvedToday, createdToday, urgent] = await Promise.all([
    prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.supportTicket.count({ where: { status: 'WAITING' } }),
    prisma.supportTicket.count({ where: { resolvedAt: { gte: today } } }),
    prisma.supportTicket.count({ where: { createdAt: { gte: today } } }),
    prisma.supportTicket.count({ where: { status: { in: OPEN_STATUSES }, priority: 'URGENT' } }),
  ])

  const resolved = await prisma.supportTicket.findMany({
    where: { resolvedAt: { not: null }, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    select: { createdAt: true, resolvedAt: true },
    take: 200,
  })
  const avgMs =
    resolved.length === 0
      ? 0
      : resolved.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()), 0) / resolved.length

  return {
    open,
    waiting: mineWait,
    resolvedToday,
    createdToday,
    urgent,
    avgResolveHours: Math.round((avgMs / 36e5) * 10) / 10,
  }
}
