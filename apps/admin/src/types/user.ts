import type { BookingStatus } from './booking'
import type { RatingDirection } from './rating'
import type { TransactionRow, TransactionType, TransactionStatus } from './transaction'

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
  language: string | null
  telegramId: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  driver?: {
    id: string
    carModel: string
    plate: string
    ratingAvg: number
    ratingCount: number
    tripsCount: number
    online: boolean
    approved: boolean
  } | null
}

export interface AdminUserDetail extends AdminUserRow {
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
  }>
  recentTransactions: TransactionRow[]
  ratingsReceived: Array<{
    id: string
    stars: number
    tags: string[]
    comment: string | null
    createdAt: string
    direction: RatingDirection
    rater: { id: string; name: string | null; phone: string }
  }>
}

export interface DriverUser {
  id: string
  phone: string
  name: string | null
  avatarUrl?: string | null
  telegramId?: string | null
  balance?: number
  // Decides who receives "Ayollar uchun taxi" (women-only) orders.
  gender?: 'MALE' | 'FEMALE' | null
}

export type ChannelSource = 'WEBAPP' | 'BOT' | 'GROUP'

export interface PersonDriver {
  id: string
  carModel: string
  plate: string
  carImageUrl: string | null
  licenseNumber: string | null
  ratingAvg: number
  ratingCount: number
  tripsCount: number
  online: boolean
  approved: boolean
}

export interface PersonRow {
  id: string
  // null for Google sign-ups that haven't needed a number yet
  phone: string | null
  name: string | null
  firstName: string | null
  email: string | null
  avatarUrl: string | null
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  verified: boolean
  balance: number
  points: number
  coins: number
  language: string | null
  telegramId: string | null
  telegramUsername: string | null
  // set when the account signs in with Google
  googleId: string | null
  signupSource: ChannelSource
  fromWebapp: boolean
  fromBot: boolean
  fromGroup: boolean
  lastSeenAt: string | null
  notes: string | null
  loginPassword?: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  driver: PersonDriver | null
}

export interface PeopleListResponse {
  items: PersonRow[]
  total: number
  page: number
  pageSize: number
  stats: {
    total: number
    drivers: number
    passengers: number
    bot: number
    webapp: number
    group: number
    google: number
  }
}

export interface PersonDetail extends PersonRow {
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
  }>
  recentTransactions: Array<{
    id: string
    type: TransactionType
    status: TransactionStatus
    amount: number
    title: string
    createdAt: string
  }>
  ratingsReceived: Array<{
    id: string
    stars: number
    tags: string[]
    comment: string | null
    createdAt: string
    rater: { id: string; name: string | null; phone: string }
  }>
  driverBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    createdAt: string
    rider: { name: string | null; phone: string }
  }>
}
