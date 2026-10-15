export type GroupDriverAdStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED'
export type GroupDriverAdTab = 'PENDING' | 'PUBLISHED' | 'EXPIRED' | 'REJECTED'
export type GroupAdFeature = 'CARGO' | 'AIRCON' | 'LUGGAGE' | 'WIFI' | 'WOMEN'

// A driver's ad from a Telegram group (server: GroupDriverAd).
export interface GroupDriverAdRow {
  id: string
  status: GroupDriverAdStatus
  chatId: string
  chatTitle: string | null
  chatUsername: string | null
  messageId: string | null
  authorTelegramId: string
  authorName: string
  authorUsername: string | null
  rawText: string
  repostCount: number
  lastSeenAt: string
  fromLabel: string | null
  toLabel: string | null
  departAt: string | null
  departNote: string | null
  seats: number | null
  pricePerSeat: number | null
  carModel: string | null
  driverName: string | null
  phones: string[]
  features: GroupAdFeature[]
  notes: string | null
  driverId: string | null
  driver: { id: string; carModel: string; plate: string; user: { name: string | null; phone: string | null } } | null
  editedAt: string | null
  rejectReason: string | null
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface GroupDriverAdList {
  items: GroupDriverAdRow[]
  counts: { pending: number; published: number; expired: number; rejected: number }
}
