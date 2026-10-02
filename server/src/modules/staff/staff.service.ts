import bcrypt from 'bcryptjs'
import type { ActivityKind, KpiPeriod, StaffKind } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { normalizePhone } from '../../lib/otp.js'
import { kpiPeriodStart } from '../../lib/period.js'
import { writeAudit } from '../../lib/audit.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/AppError.js'

const STAFF_SELECT = {
  id: true,
  phone: true,
  name: true,
  staffKind: true,
  staffActive: true,
  busy: true,
  verified: true,
  loginPassword: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const

// A staff member counts as "online" if something touched their session in the last 90s — the
// admin frontend pings /me/heartbeat every 30s while the panel tab is open, so this stays fresh
// without needing a websocket presence channel.
const ONLINE_WINDOW_MS = 90_000

function withOnline<T extends { lastSeenAt: Date | null }>(row: T) {
  return { ...row, online: Boolean(row.lastSeenAt && Date.now() - row.lastSeenAt.getTime() < ONLINE_WINDOW_MS) }
}

export function emptyActuals() {
  return { newUsers: 0, newDrivers: 0, bookings: 0, revenue: 0, calls: 0 }
}

export function actualsFromActivities(
  rows: { kind: ActivityKind; amount: number }[],
) {
  const actual = emptyActuals()
  for (const row of rows) {
    if (row.kind === 'NEW_USER') actual.newUsers += 1
    if (row.kind === 'NEW_DRIVER') actual.newDrivers += 1
    if (row.kind === 'BOOKING') actual.bookings += 1
    if (row.kind === 'CALL') actual.calls += 1
    if (row.kind === 'REVENUE' || row.kind === 'BOOKING') actual.revenue += row.amount
  }
  return actual
}

export function kpiPct(actual: number, target: number) {
  if (!target) return actual > 0 ? 100 : 0
  return Math.min(999, Math.round((actual / target) * 100))
}

export async function listStaff(filter: { kind?: StaffKind; q?: string }) {
  const rows = await prisma.user.findMany({
    where: {
      staffKind: filter.kind ? filter.kind : { not: null },
      ...(filter.q
        ? { OR: [{ phone: { contains: filter.q } }, { name: { contains: filter.q, mode: 'insensitive' } }] }
        : {}),
    },
    orderBy: [{ staffKind: 'asc' }, { createdAt: 'desc' }],
    select: STAFF_SELECT,
  })
  return rows.map(withOnline)
}

export async function createStaff(
  input: { phone: string; name: string; password: string; kind: StaffKind },
  actorId?: string,
) {
  const phone = normalizePhone(input.phone)
  const passwordHash = await bcrypt.hash(input.password, 10)
  const existing = await prisma.user.findUnique({ where: { phone } })

  if (existing?.staffKind) {
    throw new ConflictError('Bu raqam allaqachon operator sifatida mavjud')
  }

  const created = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          passwordHash,
          loginPassword: input.password,
          verified: true,
          staffKind: input.kind,
          staffActive: true,
        },
        select: STAFF_SELECT,
      })
    : await prisma.user.create({
        data: {
          phone,
          name: input.name,
          passwordHash,
          loginPassword: input.password,
          verified: true,
          role: 'PASSENGER',
          staffKind: input.kind,
          staffActive: true,
        },
        select: STAFF_SELECT,
      })

  await writeAudit({
    actorId,
    action: 'STAFF_CREATED',
    targetType: 'User',
    targetId: created.id,
    meta: { kind: input.kind, phone: created.phone },
  })

  return withOnline(created)
}

export async function updateStaff(
  id: string,
  patch: { name?: string; kind?: StaffKind; staffActive?: boolean; password?: string; phone?: string },
  actorId?: string,
) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user?.staffKind) throw new NotFoundError('Operator topilmadi')

  let phone: string | undefined
  if (patch.phone) {
    phone = normalizePhone(patch.phone)
    const taken = await prisma.user.findFirst({ where: { phone, NOT: { id } } })
    if (taken) throw new ConflictError('Bu telefon raqami boshqa hisobda bor')
  }

  const passwordHash = patch.password ? await bcrypt.hash(patch.password, 10) : undefined

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.kind ? { staffKind: patch.kind } : {}),
      ...(patch.staffActive === undefined ? {} : { staffActive: patch.staffActive }),
      ...(phone ? { phone } : {}),
      ...(passwordHash ? { passwordHash, loginPassword: patch.password } : {}),
    },
    select: STAFF_SELECT,
  })

  if (phone || passwordHash) {
    await prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } })
  }

  const changed: string[] = []
  if (patch.name && patch.name !== user.name) changed.push('name')
  if (patch.kind && patch.kind !== user.staffKind) changed.push('kind')
  if (patch.staffActive !== undefined && patch.staffActive !== user.staffActive) changed.push('staffActive')
  if (phone) changed.push('phone')
  if (passwordHash) changed.push('password')
  if (changed.length) {
    await writeAudit({
      actorId,
      action: 'STAFF_UPDATED',
      targetType: 'User',
      targetId: id,
      meta: { changed, kind: patch.kind, staffActive: patch.staffActive },
    })
  }

  return withOnline(updated)
}

export async function setBusy(id: string, busy: boolean) {
  const updated = await prisma.user.update({ where: { id }, data: { busy }, select: STAFF_SELECT })
  return withOnline(updated)
}

export async function heartbeat(id: string) {
  await prisma.user.update({ where: { id }, data: { lastSeenAt: new Date() } })
}

const SESSION_SELECT = { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true } as const

export async function listSessions(userId: string) {
  return prisma.refreshToken.findMany({
    where: { userId, revoked: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: SESSION_SELECT,
  })
}

export async function revokeSession(userId: string, sessionId: string, actorId?: string) {
  const row = await prisma.refreshToken.findUnique({ where: { id: sessionId } })
  if (!row || row.userId !== userId) throw new NotFoundError('Sessiya topilmadi')
  await prisma.refreshToken.update({ where: { id: sessionId }, data: { revoked: true } })
  await writeAudit({ actorId, action: 'SESSION_REVOKED', targetType: 'User', targetId: userId, meta: { sessionId } })
}

export async function getStaffDetail(id: string) {
  const operator = await prisma.user.findUnique({ where: { id }, select: STAFF_SELECT })
  if (!operator?.staffKind) throw new NotFoundError('Operator topilmadi')

  const periods: KpiPeriod[] = ['DAY', 'WEEK', 'MONTH']
  const kpis = await Promise.all(
    periods.map(async (period) => {
      const from = kpiPeriodStart(period)
      const to = new Date()
      const [target, rows] = await Promise.all([
        prisma.operatorKpiTarget.findUnique({
          where: { operatorId_period_periodStart: { operatorId: id, period, periodStart: from } },
        }),
        prisma.operatorActivity.findMany({
          where: { operatorId: id, createdAt: { gte: from, lte: to } },
          select: { kind: true, amount: true },
        }),
      ])
      const actual = actualsFromActivities(rows)
      const goals = target ?? emptyActuals()
      return {
        period,
        target: goals,
        actual,
        progress: {
          newUsers: kpiPct(actual.newUsers, goals.newUsers),
          newDrivers: kpiPct(actual.newDrivers, goals.newDrivers),
          bookings: kpiPct(actual.bookings, goals.bookings),
          revenue: kpiPct(actual.revenue, goals.revenue),
          calls: kpiPct(actual.calls, goals.calls),
        },
      }
    }),
  )

  const [activities, assignedTickets, createdTickets] = await Promise.all([
    prisma.operatorActivity.findMany({
      where: { operatorId: id },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.supportTicket.findMany({
      where: { assigneeId: id },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        ticketNo: true,
        subject: true,
        status: true,
        requesterName: true,
        requesterPhone: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.supportTicket.findMany({
      where: { createdById: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        ticketNo: true,
        subject: true,
        status: true,
        requesterName: true,
        requesterPhone: true,
        createdAt: true,
      },
    }),
  ])

  const lifetime = actualsFromActivities(activities)
  const requesterPhones = [...assignedTickets, ...createdTickets]
    .map((t) => t.requesterPhone)
    .filter((p): p is string => Boolean(p))
  const uniqueTicketCustomers = new Set(requesterPhones).size
  const resolvedTickets = assignedTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length
  const openTickets = assignedTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING').length

  return {
    ...withOnline(operator),
    kpis,
    lifetime,
    contacts: {
      customers: lifetime.newUsers + uniqueTicketCustomers,
      drivers: lifetime.newDrivers,
      calls: lifetime.calls,
      bookings: lifetime.bookings,
      ticketsAssigned: assignedTickets.length,
      ticketsOpen: openTickets,
      ticketsResolved: resolvedTickets,
      ticketsCreated: createdTickets.length,
    },
    activities,
    assignedTickets,
    createdTickets,
  }
}

export async function upsertKpi(
  operatorId: string,
  input: {
    period: KpiPeriod
    newUsers?: number
    newDrivers?: number
    bookings?: number
    revenue?: number
    calls?: number
  },
) {
  const operator = await prisma.user.findUnique({ where: { id: operatorId } })
  if (operator?.staffKind !== 'SALES') {
    throw new ValidationError('KPI faqat sotuv operatorlari uchun')
  }

  const periodStart = kpiPeriodStart(input.period)
  return prisma.operatorKpiTarget.upsert({
    where: { operatorId_period_periodStart: { operatorId, period: input.period, periodStart } },
    create: {
      operatorId,
      period: input.period,
      periodStart,
      newUsers: input.newUsers ?? 0,
      newDrivers: input.newDrivers ?? 0,
      bookings: input.bookings ?? 0,
      revenue: input.revenue ?? 0,
      calls: input.calls ?? 0,
    },
    update: {
      ...(input.newUsers === undefined ? {} : { newUsers: input.newUsers }),
      ...(input.newDrivers === undefined ? {} : { newDrivers: input.newDrivers }),
      ...(input.bookings === undefined ? {} : { bookings: input.bookings }),
      ...(input.revenue === undefined ? {} : { revenue: input.revenue }),
      ...(input.calls === undefined ? {} : { calls: input.calls }),
    },
  })
}

export async function logActivity(
  operatorId: string,
  input: { kind: ActivityKind; title: string; note?: string; amount?: number; refId?: string },
) {
  const operator = await prisma.user.findUnique({ where: { id: operatorId }, select: { staffKind: true, staffActive: true } })
  if (operator?.staffKind !== 'SALES' || !operator.staffActive) {
    throw new ForbiddenError('Faqat sotuv operatorlari KPI yozishi mumkin')
  }

  return prisma.operatorActivity.create({
    data: {
      operatorId,
      kind: input.kind,
      title: input.title,
      note: input.note,
      amount: input.amount ?? 0,
      refId: input.refId,
    },
  })
}

export async function salesDashboard(operatorId: string, period: KpiPeriod = 'DAY') {
  const operator = await prisma.user.findUnique({ where: { id: operatorId }, select: STAFF_SELECT })
  if (operator?.staffKind !== 'SALES') throw new ForbiddenError('Bu panel faqat sotuv operatorlari uchun')
  const { loginPassword: _pw, ...safeOperator } = operator

  const { from, to } = { from: kpiPeriodStart(period), to: new Date() }

  const [target, myActivities, team, teamActivities] = await Promise.all([
    prisma.operatorKpiTarget.findUnique({
      where: { operatorId_period_periodStart: { operatorId, period, periodStart: from } },
    }),
    prisma.operatorActivity.findMany({
      where: { operatorId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.user.findMany({
      where: { staffKind: 'SALES', staffActive: true },
      select: { id: true, name: true, phone: true },
    }),
    prisma.operatorActivity.findMany({
      where: { createdAt: { gte: from, lte: to }, operator: { staffKind: 'SALES' } },
      select: { operatorId: true, kind: true, amount: true },
    }),
  ])

  const byOperator = new Map<string, ReturnType<typeof emptyActuals>>()
  for (const member of team) byOperator.set(member.id, emptyActuals())
  for (const row of teamActivities) {
    const current = byOperator.get(row.operatorId) ?? emptyActuals()
    const next = actualsFromActivities([row])
    byOperator.set(row.operatorId, {
      newUsers: current.newUsers + next.newUsers,
      newDrivers: current.newDrivers + next.newDrivers,
      bookings: current.bookings + next.bookings,
      revenue: current.revenue + next.revenue,
      calls: current.calls + next.calls,
    })
  }

  const targets = target ?? emptyActuals()
  const actual = actualsFromActivities(myActivities)
  const score = (row: ReturnType<typeof emptyActuals>) =>
    row.newUsers * 10 + row.newDrivers * 15 + row.bookings * 8 + row.calls * 2 + Math.round(row.revenue / 10000)

  const leaderboard = team
    .map((member) => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      actual: byOperator.get(member.id) ?? emptyActuals(),
      score: score(byOperator.get(member.id) ?? emptyActuals()),
    }))
    .sort((a, b) => b.score - a.score)

  return {
    operator: safeOperator,
    period,
    range: { from, to },
    target: targets,
    actual,
    progress: {
      newUsers: kpiPct(actual.newUsers, targets.newUsers),
      newDrivers: kpiPct(actual.newDrivers, targets.newDrivers),
      bookings: kpiPct(actual.bookings, targets.bookings),
      revenue: kpiPct(actual.revenue, targets.revenue),
      calls: kpiPct(actual.calls, targets.calls),
    },
    activities: myActivities,
    leaderboard,
  }
}

export async function teamKpiOverview(period: KpiPeriod = 'DAY') {
  const from = kpiPeriodStart(period)
  const to = new Date()
  const sales = await prisma.user.findMany({
    where: { staffKind: 'SALES' },
    select: STAFF_SELECT,
  })
  const [targets, activities] = await Promise.all([
    prisma.operatorKpiTarget.findMany({ where: { period, periodStart: from } }),
    prisma.operatorActivity.findMany({
      where: { createdAt: { gte: from, lte: to }, operator: { staffKind: 'SALES' } },
      select: { operatorId: true, kind: true, amount: true },
    }),
  ])

  const targetByOp = new Map(targets.map((t) => [t.operatorId, t]))
  return sales.map((op) => {
    const rows = activities.filter((a) => a.operatorId === op.id)
    const actual = actualsFromActivities(rows)
    const target = targetByOp.get(op.id) ?? emptyActuals()
    return { operator: op, target, actual, progress: {
      newUsers: kpiPct(actual.newUsers, target.newUsers),
      newDrivers: kpiPct(actual.newDrivers, target.newDrivers),
      bookings: kpiPct(actual.bookings, target.bookings),
      revenue: kpiPct(actual.revenue, target.revenue),
      calls: kpiPct(actual.calls, target.calls),
    } }
  })
}
