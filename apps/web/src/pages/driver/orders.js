import { driverCode } from '../../lib/utils'
import { t } from '../../i18n'
import { orderInWorkRegions } from '../../data/regions'

const SEAT_POSITION_LABEL = {
  FRONT: 'Old o‘rindiq',
  REAR_LEFT: 'Orqa chap',
  REAR_MIDDLE: 'Orqa o‘rta',
  REAR_RIGHT: 'Orqa o‘ng',
}

export function bookingToDriverOrder(b) {
  return {
    kind: 'booking',
    id: b.id,
    code: driverCode(b.id),
    from: b.fromLabel,
    fromHint: b.fromAddress,
    to: b.toLabel,
    toHint: b.toAddress,
    price: b.totalPrice,
    seats: b.seatsBooked,
    seatChips: (b.seats || []).map((s) => ({
      label: t(SEAT_POSITION_LABEL[s.offerSeat?.position]) || s.offerSeat?.position,
      gender: s.gender,
    })),
    status: b.status,
    createdAt: b.createdAt,
    rider: b.rider,
    details: { passengers: b.seatsBooked, source: 'Sayt' },
    conversationId: b.conversationId,
    cancelReason: b.cancelReason,
    cancelledBy: b.cancelledBy,
    plate: b.rideOffer?.driver?.plate,
    carModel: b.rideOffer?.driver?.carModel,
  }
}

// The bot's own codes (taxiline-bot app/keyboards/trip.py).
const BOT_SEAT_LABEL = {
  front: 'Old o‘rindiq',
  rear_right: 'Orqa o‘ng',
  rear_left: 'Orqa chap',
  rear_middle: 'Orqa o‘rta',
  any: 'Farqi yo‘q',
}
const BOT_LUGGAGE_LABEL = { S: 'Kichik', M: 'O‘rta', L: 'Katta' }
const BOT_SOURCE_LABEL = { BOT: 'Telegram bot', WEBAPP: 'Sayt', GROUP: 'Guruh' }

// Website requests without a district arrive as "-".
function withDistrict(region, district) {
  return district && district !== '-' ? `${region}, ${district}` : region
}

export function botToDriverOrder(o) {
  const status =
    o.status === 'OPEN'
      ? 'PENDING'
      : o.status === 'CLAIMED'
        ? o.confirmed
          ? 'ONGOING'
          : 'ACCEPTED'
        : o.status === 'COMPLETED'
          ? 'COMPLETED'
          : 'CANCELLED'

  return {
    kind: 'bot',
    id: `bot-${o.id}`,
    botId: o.id,
    code: driverCode(o.id),
    from: withDistrict(o.fromRegion, o.fromDistrict),
    fromHint: o.pickupText,
    to: withDistrict(o.toRegion, o.toDistrict),
    // No real destination-address hint exists for bot orders (only pickup can carry a shared
    // location/free-text address) — whenText is the requested departure time, not a place, and
    // must not be fed into toHint: RouteStops shows it as "Mo'ljal" (address hint), and
    // LiveOrderMap feeds toHint straight into the destination geocoding query, so stuffing a
    // time string like "Hozir" in there both mislabels the UI and corrupts the map pin lookup.
    whenText: o.whenText,
    price: null,
    seats: o.passengers,
    status,
    createdAt: o.createdAt,
    rider: { name: o.passengerName, phone: o.passengerPhone },
    // What the passenger asked for — shown on the driver's order screen.
    details: {
      passengers: o.passengers,
      seat: t(BOT_SEAT_LABEL[o.seat]) || o.seat || null,
      luggage: t(BOT_LUGGAGE_LABEL[o.luggageSize]) || o.luggageSize || null,
      car: o.carBrand || null,
      note: o.contactNote || null,
      source: t(BOT_SOURCE_LABEL[o.source]) || null,
    },
    pickupLat: o.pickupLat,
    pickupLng: o.pickupLng,
    confirmed: o.confirmed,
    // "Ayollar uchun taxi" (female drivers only) and who travels: MALE | FEMALE | COUPLE.
    womenOnly: Boolean(o.womenOnly),
    passengerGender: o.passengerGender || null,
  }
}

export function mergeDriverOrders(bookings = [], botOrders) {
  const list = bookings.map(bookingToDriverOrder)
  if (botOrders?.registered) {
    if (botOrders.claimedOrder) list.unshift(botToDriverOrder(botOrders.claimedOrder))
    for (const o of botOrders.openOrders || []) list.push(botToDriverOrder(o))
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function isActiveStatus(status) {
  return status === 'PENDING' || status === 'ACCEPTED' || status === 'ONGOING'
}

export function latestPendingOrder(orders = []) {
  return orders
    .filter((o) => o.status === 'PENDING' && o.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null
}

export function filterByWorkRegions(orders = [], regions) {
  if (!regions?.length) return orders
  return orders.filter((o) => orderInWorkRegions(o, regions))
}

export function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
