// A ride request (taxiline-bot Order, served by /bot-orders/mine) as the passenger's screens
// read it. The bot's own status names map onto the booking statuses the UI already speaks.

export function botOrderStatus(order) {
  if (order.status === 'OPEN') return 'PENDING'
  if (order.status === 'CLAIMED') return order.confirmed ? 'ONGOING' : 'ACCEPTED'
  if (order.status === 'COMPLETED') return 'COMPLETED'
  // CANCELLED by the passenger or an admin, or CLOSED (unpublished) by an admin.
  return 'CANCELLED'
}

export function isActiveBotOrder(order) {
  return order.status === 'OPEN' || order.status === 'CLAIMED'
}

// The bot's seat codes (app/keyboards/trip.py) for orders made before seats were picked on a map.
export const BOT_SEAT_LABEL = {
  front: 'Old o‘rindiq',
  rear_right: 'Orqa o‘ng',
  rear_left: 'Orqa chap',
  rear_middle: 'Orqa o‘rta',
  any: 'Farqi yo‘q',
}
