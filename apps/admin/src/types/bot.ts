// Passenger-posted listings, created through the Telegram bot (taxiline-bot), not this
// backend — served to the admin panel via a Node bridge (server/src/lib/botBridge.ts) that
// proxies to the bot's own HTTP API. `orderId` is the bot's numeric id; `id` is that same
// value coerced to a string so this row can satisfy Table's `{id: string}` constraint.
export type OrderStatus = 'OPEN' | 'CLAIMED' | 'COMPLETED' | 'CLOSED' | 'CANCELLED'

export interface BotOrderRow {
  id: string
  orderId: number
  passengerName: string
  passengerPhone: string
  fromRegion: string
  fromDistrict: string
  toRegion: string
  toDistrict: string
  carBrand: string
  seat: string
  passengers: number
  luggageSize: string
  whenText: string
  status: OrderStatus
  source: 'BOT' | 'WEBAPP' | 'GROUP'
  // "Ayollar uchun taxi" — offered to female drivers first, to everyone after 5 minutes.
  womenOnly: boolean
  // Still in that female-drivers-first window.
  femaleOnly?: boolean
  passengerGender: 'MALE' | 'FEMALE' | 'COUPLE' | null
  createdAt: string
  pickupLat: number | null
  pickupLng: number | null
  pickupText: string | null
  confirmed: boolean
  assignedDriver: { name: string; phone: string; gender?: 'MALE' | 'FEMALE' | null } | null
  dispatchCount: number
}

export interface BotGroupRoute {
  fromRegion: string | null
  toRegion: string | null
  threadId: number | null
  label: string | null
}

export interface BotGroup {
  id: number
  chatId: string
  title: string | null
  kind: string
  region: string | null
  username: string | null
  inviteLink: string | null
  routes: BotGroupRoute[]
  createdAt: string | null
}

export interface BotGroupsResponse {
  groups: BotGroup[]
  regions: string[]
}
