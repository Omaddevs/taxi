export interface AdminUserRow {
  id: string
  phone: string
  name: string | null
  firstName: string | null
  email: string | null
  avatarUrl: string | null
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  verified: boolean
  balance: number
  points: number
  coins: number
  createdAt: string
  updatedAt: string
}

export interface DriverRow {
  id: string
  userId: string
  carModel: string
  plate: string
  ratingAvg: number
  tripsCount: number
  online: boolean
  approved: boolean
  createdAt: string
  user: { id: string; phone: string; name: string | null }
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
  createdAt: string
  user: { id: string; phone: string; name: string | null }
}

export interface ServiceRow {
  id: string
  title: string
  description: string | null
  icon: string
  basePrice: number
  active: boolean
  sortOrder: number
}

export interface RideOfferRow {
  id: string
  fromLabel: string
  toLabel: string
  departAt: string
  seatsTotal: number
  seatsAvailable: number
  pricePerSeat: number
  status: 'ACTIVE' | 'FULL' | 'CLOSED' | 'CANCELLED'
  driver: { user: { name: string | null; phone: string } }
  service: ServiceRow
}

export interface BookingRow {
  id: string
  fromLabel: string
  toLabel: string
  departAt: string
  seatsBooked: number
  totalPrice: number
  status: 'PENDING' | 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  rider: { id: string; name: string | null; phone: string }
  rideOffer: { driver: { user: { name: string | null; phone: string } }; service: ServiceRow }
}

export interface PromoRow {
  id: string
  code: string
  title: string
  discountType: 'FIXED' | 'PERCENT'
  discountValue: number
  validFrom: string
  validUntil: string
  maxUses: number | null
  usesCount: number
  active: boolean
}

export interface AnalyticsSummary {
  range: { from: string; to: string }
  bookingsCount: number
  completedCount: number
  revenue: number
  activeDrivers: number
}
