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
  usersNew: number
  usersActive: number
  usersBySource: Record<'WEBAPP' | 'BOT' | 'GROUP', number>
  bookingsByStatus: Record<BookingStatus, number>
  series: Array<{ date: string; bookings: number; completed: number; revenue: number; newUsers: number }>
  topRoutes: Array<{ route: string; count: number }>
  recentBookings: BookingRow[]
  recentApplications: DriverApplicationRow[]
}

// GET /admin/bot-settings/ads-stats — Telegram guruhlaridagi e’lonlar (taxiline-bot ads_stats.py).
export interface AdsStatsReport {
  days: number
  from: string
  totals: {
    ads: number
    driver: number
    passenger: number
    unknown: number
    withPhoto: number
    authors: number
    calls: number
    blocked: number
    activeGroups: number
  }
  previous: { ads: number; calls: number }
  series: Array<{ date: string; driver: number; passenger: number; calls: number }>
  hours: number[]
  groups: Array<{ chatId: string; title: string | null; kind: string | null; ads: number; driver: number; passenger: number; calls: number }>
  groupsTotal: number
  topAuthors: Array<{ telegramId: string; name: string; username: string | null; ads: number; role: string | null }>
  routed: Record<string, number>
  botUsers: {
    total: number
    drivers: number
    clients: number
    blocked: number
    new: number
    active: number
    series: Array<{ date: string; count: number }>
  }
}

// GET /admin/bot-settings/ads-timeline?unit= — e’lonlar kunlik / haftalik / oylik.
export interface AdsTimeline {
  unit: 'day' | 'week' | 'month'
  buckets: Array<{ start: string; ads: number; driver: number; passenger: number; authors: number; calls: number }>
}
