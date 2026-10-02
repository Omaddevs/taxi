import type { BookingStatus, BookingRow } from './booking'
import type { DriverApplicationRow } from './driver'

export interface AnalyticsSummary {
  range: { from: string; to: string }
  bookingsCount: number
  completedCount: number
  revenue: number
  activeDrivers: number
  usersCount: number
  driversCount: number
  pendingApplications: number
  telegramLinkedCount: number
  bookingsByStatus: Record<BookingStatus, number>
  series: Array<{ date: string; bookings: number; completed: number; revenue: number }>
  topRoutes: Array<{ route: string; count: number }>
  recentBookings: BookingRow[]
  recentApplications: DriverApplicationRow[]
}
