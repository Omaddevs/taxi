import type { BookingStatus } from './booking'
import type { RideOfferRow } from './offer'
import type { DriverUser } from './user'

export interface DriverRow {
  id: string
  userId: string
  carModel: string
  plate: string
  carImageUrl: string | null
  licenseNumber: string | null
  ratingAvg: number
  ratingCount: number
  tripsCount: number
  online: boolean
  approved: boolean
  currentLat: number | null
  currentLng: number | null
  locationUpdatedAt: string | null
  createdAt: string
  archivedAt: string | null
  archivedReason: string | null
  user: DriverUser
  subscription?: { status: DriverSubscriptionStatus; expiresAt: string } | null
}

export interface SubscriptionPlanRow {
  id: string
  title: string
  durationDays: number
  price: number
  active: boolean
  sortOrder: number
}

export type DriverSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface SubscriptionPaymentRow {
  id: string
  amount: number
  method: string
  note: string | null
  planTitle: string
  createdAt: string
}

export interface DriverSubscriptionDetail {
  subscription: {
    status: DriverSubscriptionStatus
    plan: SubscriptionPlanRow
    startedAt: string
    expiresAt: string
    cancelledAt: string | null
  } | null
  payments: SubscriptionPaymentRow[]
  bookingStats: { accepted: number; cancelled: number; completed: number }
}

export interface DriverDetail extends DriverRow {
  user: DriverUser & { ratingAvg?: number; ratingCount?: number; createdAt?: string }
  recentOffers: RideOfferRow[]
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
    rider: { id: string; name: string | null; phone: string }
  }>
}

export interface DriverApplicationRow {
  id: string
  userId: string
  fullName: string
  phone: string
  carModel: string
  plate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  source?: 'WEBAPP' | 'BOT' | 'PANEL'
  region?: string | null
  toRegion?: string | null
  blocked?: boolean
  blockedReason?: string | null
  createdAt: string
  updatedAt?: string
  user: {
    id: string
    phone: string
    name: string | null
    telegramId?: string | null
    telegramUsername?: string | null
    gender?: 'MALE' | 'FEMALE' | null
  }
}
