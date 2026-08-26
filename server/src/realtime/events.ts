export const SOCKET_EVENTS = {
  DRIVER_ORDER_NEW: 'driver:order:new',
  DRIVER_ORDER_TIMEOUT: 'driver:order:timeout',
  DRIVER_LOCATION: 'driver:location',
  BOOKING_STATUS: 'booking:status',
  CHAT_MESSAGE: 'chat:message',
  CHAT_READ: 'chat:read',
} as const

export function driverRoom(driverId: string) {
  return `driver:${driverId}`
}

export function bookingRoom(bookingId: string) {
  return `booking:${bookingId}`
}

export function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`
}
