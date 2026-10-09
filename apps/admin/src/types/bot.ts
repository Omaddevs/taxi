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
  // On/off group services keyed like the bot's SETTING_LABELS (anti_spam, ad_router, …).
  settings: Record<string, boolean>
  // Closed driver group (BotGroup.id) an open group's passenger ads are routed to.
  linkedGroupId: number | null
}

export interface BotGroupsResponse {
  groups: BotGroup[]
  regions: string[]
  settingLabels: Record<string, string>
}

export interface BotSettingField {
  key: string
  label: string
  type: 'int' | 'bool' | 'url' | 'text' | 'longtext'
  help: string
  min: number | null
  max: number | null
  default: string | number | boolean
  value: string | number | boolean
}

export interface BotSettingsSection {
  key: string
  label: string
  description: string
  fields: BotSettingField[]
}

export interface BotSettingsResponse {
  sections: BotSettingsSection[]
}

export type BotGroupAdStatus = 'PENDING' | 'SENT' | 'TAKEN' | 'DRIVER' | 'EXPIRED' | 'CANCELLED'

export interface BotGroupAd {
  id: number
  sourceChatId: string
  targetChatId: string | null
  authorTelegramId: string
  authorName: string
  authorUsername: string | null
  text: string
  hasPhoto: boolean
  role: 'PASSENGER' | 'DRIVER' | null
  status: BotGroupAdStatus
  takenByName: string | null
  // Typed in from the dashboard (no Telegram author).
  manual: boolean
  hasCard: boolean
  createdAt: string | null
  answeredAt: string | null
}

export interface BotGroupAdsResponse {
  ads: BotGroupAd[]
  stats24h: Partial<Record<BotGroupAdStatus, number>>
  chatTitles: Record<string, string | null>
}

// Bot sozlamalari → Aloqa (taxiline-bot/app/services/calls.py report()).
export interface CallReport {
  totals: { calls: number; identifiedCalls: number; uniqueCallers: number; numbers: number }
  // False while Telegram rejects login_url buttons (bot domain not set) — callers are then unknown.
  loginButtons: boolean
  summary: {
    phone: string
    phoneDisplay: string
    calls: number
    knownCallers: number
    lastAt: string | null
    ownerName: string | null
    ownerUsername: string | null
    ownerTelegramId: string | null
    chatTitle: string | null
    ownerRole: string | null
  }[]
  calls: {
    id: number
    createdAt: string | null
    phone: string
    phoneDisplay: string
    ownerName: string | null
    ownerUsername: string | null
    ownerRole: string | null
    chatTitle: string | null
    adKind: string
    callerTelegramId: string | null
    callerName: string | null
    callerUsername: string | null
    callerIsDriver: boolean
    userAgent: string | null
  }[]
}
