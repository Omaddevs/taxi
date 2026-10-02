import type { TicketStatus } from './ticket'

export type StaffKind = 'ADMIN' | 'SALES' | 'SUPPORT'
export type PanelRole = 'ADMIN' | 'SALES_OPERATOR' | 'SUPPORT_OPERATOR'
export type KpiPeriod = 'DAY' | 'WEEK' | 'MONTH'
export type ActivityKind = 'NEW_USER' | 'NEW_DRIVER' | 'BOOKING' | 'REVENUE' | 'CALL' | 'NOTE'

export interface StaffRow {
  id: string
  phone: string
  name: string | null
  staffKind: StaffKind
  staffActive: boolean
  busy: boolean
  online: boolean
  verified: boolean
  lastSeenAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionRow {
  id: string
  ip: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
}

export interface AuditLogRow {
  id: string
  action: string
  targetType: string
  targetId: string | null
  meta: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; name: string | null; phone: string } | null
}

export interface StaffContacts {
  customers: number
  drivers: number
  calls: number
  bookings: number
  ticketsAssigned: number
  ticketsOpen: number
  ticketsResolved: number
  ticketsCreated: number
}

export interface KpiNumbers {
  newUsers: number
  newDrivers: number
  bookings: number
  revenue: number
  calls: number
}

export interface StaffKpiSlice {
  period: KpiPeriod
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
}

export interface StaffDetail extends StaffRow {
  kpis: StaffKpiSlice[]
  lifetime: KpiNumbers
  contacts: StaffContacts
  activities: Array<{
    id: string
    kind: ActivityKind
    title: string
    note: string | null
    amount: number
    createdAt: string
  }>
  assignedTickets: Array<{
    id: string
    ticketNo: number
    subject: string
    status: TicketStatus
    requesterName: string | null
    requesterPhone: string | null
    createdAt: string
    resolvedAt: string | null
  }>
  createdTickets: Array<{
    id: string
    ticketNo: number
    subject: string
    status: TicketStatus
    requesterName: string | null
    requesterPhone: string | null
    createdAt: string
  }>
}

export interface StaffKpiRow {
  operator: StaffRow
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
}

export interface SalesDashboard {
  operator: StaffRow
  period: KpiPeriod
  range: { from: string; to: string }
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
  activities: Array<{
    id: string
    kind: ActivityKind
    title: string
    note: string | null
    amount: number
    createdAt: string
  }>
  leaderboard: Array<{
    id: string
    name: string | null
    phone: string
    actual: KpiNumbers
    score: number
  }>
}

