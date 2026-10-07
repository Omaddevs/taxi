const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

export const FALLBACK_AVATAR = 'https://i.pravatar.cc/160?img=68'
export const FALLBACK_CAR_IMAGE = '/cars/cobalt.png'

export function avatarOrFallback(url, seed) {
  return url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed || 'TaxiLine')}`
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatShortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// Adapts a backend RideOffer into the flat "trip" shape TripCard/TripDetails/
// SearchResults/Favorites already render, so those components stay unchanged.
export function offerToTrip(offer) {
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

// Adapts a backend Booking (history/trip-history view) into the flat shape
// TripHistory/TripCard(compact) already render.
export function bookingToHistoryItem(booking) {
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
const BOT_ORDER_STATUS_TO_BOOKING_STATUS = {
  OPEN: 'PENDING',
  CLAIMED: 'ACCEPTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
}

// Adapts a taxiline-bot Order (GET /bot-orders/mine) into the same flat shape as
// bookingToHistoryItem, so TripHistory can render both in one merged, sorted list.
export function botOrderToHistoryItem(order) {
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
    womenOnly: Boolean(order.womenOnly),
  }
}

export const BOOKING_STATUS_LABEL = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  ONGOING: 'Yo‘lda',
  COMPLETED: 'Bajarilgan',
  CANCELLED: 'Bekor qilingan',
}

export const BOOKING_STATUS_TONE = {
  PENDING: 'amber',
  ACCEPTED: 'pink',
  ONGOING: 'pink',
  COMPLETED: 'green',
  CANCELLED: 'red',
}
