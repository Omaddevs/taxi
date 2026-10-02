const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

export const FALLBACK_AVATAR = 'https://i.pravatar.cc/160?img=68'
export const FALLBACK_CAR_IMAGE = '/cars/cobalt.png'

export function avatarOrFallback(url: string | null | undefined, seed?: string | null): string {
  return url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || 'TaxiLine')}`
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// Backend RideOffer shape (subset actually read here — the API response carries more fields).
export interface RideOffer {
  id: string
  fromLabel: string
  toLabel: string
  fromAddress?: string
  toAddress?: string
  departAt: string
  arriveAt?: string | null
  seatsAvailable: number
  seats?: unknown[]
  luggageCapacity?: number
  pricePerSeat: number
  service?: { id: string; title: string }
  driver?: {
    carModel?: string
    plate?: string
    carImageUrl?: string | null
    ratingAvg?: number
    ratingCount?: number
    tripsCount?: number
    user?: { name?: string | null; phone?: string; avatarUrl?: string | null }
  }
}

// Adapts a backend RideOffer into the flat "trip" shape TripCard/TripDetails/
// SearchResults/Favorites already render, so those components stay unchanged.
export function offerToTrip(offer: RideOffer) {
  return {
    id: offer.id,
    from: offer.fromLabel,
    to: offer.toLabel,
    fromAddress: offer.fromAddress,
    toAddress: offer.toAddress,
    date: formatShortDate(offer.departAt),
    time: formatTime(offer.departAt),
    arrive: formatTime(offer.arriveAt),
    departAt: offer.departAt,
    seats: offer.seatsAvailable,
    seatMap: offer.seats || [],
    luggage: offer.luggageCapacity,
    price: offer.pricePerSeat,
    service: offer.service?.id,
    serviceTitle: offer.service?.title,
    car: offer.driver?.carModel,
    plate: offer.driver?.plate,
    carImage: offer.driver?.carImageUrl || FALLBACK_CAR_IMAGE,
    driver: {
      name: offer.driver?.user?.name || offer.driver?.user?.phone || 'Haydovchi',
      // 0 alongside ratingCount 0 means "no real ratings yet" — never a fabricated default;
      // consuming UI must check ratingCount before rendering rating as a number.
      rating: offer.driver?.ratingAvg ?? 0,
      ratingCount: offer.driver?.ratingCount ?? 0,
      trips: offer.driver?.tripsCount ?? 0,
      avatar: avatarOrFallback(offer.driver?.user?.avatarUrl, offer.driver?.user?.name),
      phone: offer.driver?.user?.phone,
    },
  }
}

export interface Booking {
  id: string
  fromLabel: string
  toLabel: string
  departAt: string
  totalPrice: number
  status: string
  rideOffer?: {
    driver?: {
      plate?: string
      user?: { name?: string | null; phone?: string }
    }
  }
}

// Adapts a backend Booking (history/trip-history view) into the flat shape
// TripHistory/TripCard(compact) already render.
export function bookingToHistoryItem(booking: Booking) {
  const d = new Date(booking.departAt)
  const dateLabel = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${formatTime(booking.departAt)}`
  return {
    id: booking.id,
    from: booking.fromLabel,
    to: booking.toLabel,
    date: dateLabel,
    sortKey: booking.departAt,
    price: booking.totalPrice,
    status: booking.status,
    driver: booking.rideOffer?.driver?.user?.name || booking.rideOffer?.driver?.user?.phone || '—',
    plate: booking.rideOffer?.driver?.plate || '—',
    source: 'webapp',
  }
}

// Bot orders (taxiline-bot) use their own OPEN/CLAIMED/COMPLETED/CANCELLED status names —
// mapped onto the same labels/tones Booking statuses already use so a mixed list stays
// legible without a second set of badges.
const BOT_ORDER_STATUS_TO_BOOKING_STATUS: Record<string, string> = {
  OPEN: 'PENDING',
  CLAIMED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
}

export interface BotOrder {
  id: string | number
  fromRegion: string
  fromDistrict: string
  toRegion: string
  toDistrict: string
  createdAt: string
  status: string
}

// Adapts a taxiline-bot Order (GET /bot-orders/mine) into the same flat shape as
// bookingToHistoryItem, so TripHistory can render both in one merged, sorted list.
export function botOrderToHistoryItem(order: BotOrder) {
  const d = new Date(order.createdAt)
  const dateLabel = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${formatTime(order.createdAt)}`
  return {
    id: `bot-${order.id}`,
    from: `${order.fromRegion}, ${order.fromDistrict}`,
    to: `${order.toRegion}, ${order.toDistrict}`,
    date: dateLabel,
    sortKey: order.createdAt,
    price: null,
    status: BOT_ORDER_STATUS_TO_BOOKING_STATUS[order.status] || order.status,
    driver: '—',
    plate: '—',
    source: 'bot',
  }
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  ONGOING: 'Yo‘lda',
  COMPLETED: 'Bajarilgan',
  CANCELLED: 'Bekor qilingan',
}

export const BOOKING_STATUS_TONE: Record<string, string> = {
  PENDING: 'amber',
  ACCEPTED: 'pink',
  ONGOING: 'pink',
  COMPLETED: 'green',
  CANCELLED: 'red',
}
