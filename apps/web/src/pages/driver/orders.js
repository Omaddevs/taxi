import { driverCode } from '../../lib/utils'
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
      label: SEAT_POSITION_LABEL[s.offerSeat?.position] || s.offerSeat?.position,
      gender: s.gender,
    })),
    status: b.status,
    createdAt: b.createdAt,
    rider: b.rider,
    conversationId: b.conversationId,
    cancelReason: b.cancelReason,
    cancelledBy: b.cancelledBy,
    plate: b.rideOffer?.driver?.plate,
    carModel: b.rideOffer?.driver?.carModel,
  }
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
    from: `${o.fromRegion}${o.fromDistrict ? `, ${o.fromDistrict}` : ''}`,
    fromHint: o.pickupText,
    to: `${o.toRegion}${o.toDistrict ? `, ${o.toDistrict}` : ''}`,
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
    pickupLat: o.pickupLat,
    pickupLng: o.pickupLng,
    confirmed: o.confirmed,
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
