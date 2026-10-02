import type { BookingStatus } from './booking'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketCategory = 'TECHNICAL' | 'PAYMENT' | 'BOOKING' | 'ACCOUNT' | 'OTHER'

export interface CannedResponseRow {
  id: string
  category: TicketCategory | null
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface TicketBookingSummary {
  id: string
  fromLabel: string
  toLabel: string
  status?: BookingStatus
  totalPrice?: number
  departAt?: string
  rider?: { id: string; name: string | null; phone: string }
  rideOffer?: { driver: { id: string; user: { id: string; name: string | null; phone: string } } | null }
}

export interface TicketDriverSummary {
  id: string
  plate: string
  carModel?: string
  user: { id?: string; name: string | null; phone: string }
}

export interface TicketRow {
  id: string
  ticketNo: number
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  requesterPhone: string | null
  requesterName: string | null
  assigneeId: string | null
  bookingId: string | null
  driverId: string | null
  satisfactionRating: number | null
  satisfactionComment: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  slaDueAt: string
  slaBreached: boolean
  assignee?: { id: string; name: string | null; phone: string } | null
  createdBy?: { id: string; name: string | null; phone: string } | null
  booking?: TicketBookingSummary | null
  driver?: TicketDriverSummary | null
  _count?: { messages: number }
}

export interface TicketDetail extends TicketRow {
  messages: Array<{
    id: string
    body: string
    internal: boolean
    createdAt: string
    author: { id: string; name: string | null; phone: string } | null
  }>
}

export interface TicketStats {
  open: number
  waiting: number
  resolvedToday: number
  createdToday: number
  urgent: number
  avgResolveHours: number
}
