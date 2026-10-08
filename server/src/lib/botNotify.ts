import { env } from '../config/env.js'

export type BookingNotifyKind = 'new' | 'pending_timeout' | 'start_timeout'

export interface BookingNotifyPayload {
  telegramId: string
  language?: string | null
  kind: BookingNotifyKind
  riderName: string
  riderPhone: string
  fromLabel: string
  toLabel: string
  departAt: string
  bookingId: string
  seatsSummary?: string
}

// Best-effort push to taxiline-bot's inbound webhook (app/webserver.py) so a driver gets an
// instant Telegram DM alongside the in-app Notification. Never throws — a DM hiccup (bot
// down, driver blocked it, network blip) must never fail booking creation or the timeout
// sweep that calls this.
export async function notifyDriverViaBot(payload: BookingNotifyPayload): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}/webapp/booking-created`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('notifyDriverViaBot failed:', err)
  }
}

export interface OfferPostedPayload {
  offerId: string
  fromRegion?: string | null
  toRegion?: string | null
  fromLabel: string
  toLabel: string
  departAt: string
  pricePerSeat: number
  seatsTotal: number
  driverName: string
  driverPhone: string
  carModel: string
  plate: string
}

// Best-effort push to taxiline-bot so a newly posted RideOffer also lands in the driver's
// regional Telegram group (mirrors how bot-native trip requests already get dispatched to
// groups) — never throws, a group-post hiccup must not fail offer creation.
export async function notifyGroupOfferPosted(payload: OfferPostedPayload): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}/webapp/offer-posted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('notifyGroupOfferPosted failed:', err)
  }
}

export interface CargoPostedPayload {
  cargoOrderId: string
  fromRegion?: string | null
  toRegion?: string | null
  fromLabel: string
  toLabel: string
  cargoType: string
  weightLabel: string
  recipientName: string
  recipientPhone: string
  price: number
  note?: string | null
  vehicle?: string | null
}

// Best-effort push to taxiline-bot so a newly posted cargo job also lands in the driver's
// regional Telegram group (same bridge/group-resolution as notifyGroupOfferPosted above) —
// never throws, a group-post hiccup must not fail cargo order creation.
export async function notifyGroupCargoPosted(payload: CargoPostedPayload): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}/webapp/cargo-posted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('notifyGroupCargoPosted failed:', err)
  }
}

export interface OtpNotifyPayload {
  telegramId: string
  language?: string | null
  code: string
  phone: string
}

// Same best-effort pattern — the SMS send already happened, so a failure here must never
// fail requestOtp; the user just won't see the Telegram fast-path this one time.
export async function notifyOtpViaBot(payload: OtpNotifyPayload): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}/webapp/otp-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('notifyOtpViaBot failed:', err)
  }
}

export interface DriverReviewedPayload {
  telegramId: string | null
  phone: string
  status: 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
  gender?: 'MALE' | 'FEMALE' | null
}

// Best-effort push so a review done in the admin panel reaches the bot too: the bot flips its
// own DriverProfile, DMs the driver and switches them to the driver menu (or tells them why
// they were rejected). Never throws — the review itself is already committed.
export async function notifyDriverReviewed(payload: DriverReviewedPayload): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}/webapp/driver-reviewed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    console.error('notifyDriverReviewed failed:', err)
  }
}

async function postToBot(path: string, payload: unknown, label: string): Promise<void> {
  try {
    await fetch(`${env.BOT_HTTP_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
  } catch (err) {
    console.error(`${label} failed:`, err)
  }
}

export type CargoStatusForBot = 'NEW' | 'CLAIMED' | 'DELIVERED' | 'CANCELLED'

/**
 * A cargo order changed outside Telegram (website claim, release, delivery, rider cancel) —
 * the bot rewrites every group/DM copy so nobody taps "Qabul qilish" on a taken order.
 */
export async function notifyCargoStatus(payload: {
  cargoOrderId: string
  status: CargoStatusForBot
  driverName?: string | null
  // The claiming driver's own DM is turned into the full card by the bot — leave it alone.
  driverTelegramId?: string | null
}) {
  await postToBot('/webapp/cargo-status', payload, 'notifyCargoStatus')
}

/** Plain Telegram message to one user (rider/driver updates). No-op without a linked account. */
export async function notifyUserViaBot(telegramId: string | null | undefined, text: string) {
  if (!telegramId) return
  await postToBot('/webapp/notify-user', { telegramId, text }, 'notifyUserViaBot')
}
