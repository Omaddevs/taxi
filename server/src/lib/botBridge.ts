import { env } from '../config/env.js'
import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationError } from '../errors/AppError.js'

const HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Secret': env.BOT_API_SECRET }

async function botFetch<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const { timeoutMs = 8000, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(`${env.BOT_HTTP_URL}${path}`, {
      ...rest,
      headers: { ...HEADERS, ...rest.headers },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new ServiceUnavailableError('Bot xizmati vaqtincha ishlamayapti')
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string }

  if (res.status === 400) throw new ValidationError(body.error ?? 'Noto‘g‘ri so‘rov')
  if (res.status === 403) throw new ForbiddenError(body.error ?? 'Ruxsat berilmagan')
  if (res.status === 404) {
    if (rest.method === 'DELETE') return { ok: true } as T
    throw new NotFoundError(body.error ?? 'Topilmadi')
  }
  if (res.status === 409) {
    // The bot only ever hands back terse machine codes ("invalid_state" and the like), never a
    // user-facing sentence — surface a readable message instead of the raw code.
    const message = body.error && body.error !== 'invalid_state' ? body.error : 'Buyurtma holati o‘zgargani uchun bu amalni bajarib bo‘lmadi (band qilingan yoki yopilgan bo‘lishi mumkin)'
    throw new ConflictError(message)
  }
  if (!res.ok) throw new ServiceUnavailableError(body.error ?? 'Bot xizmati xatolik qaytardi')

  return body as T
}

export interface BotOrder {
  id: number
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
  // The fare the passenger offers for the whole party; null = "Kelishiladi".
  price: number | null
  paymentMethod: string
  // Start of the chosen departure slot (ISO, UTC).
  departAt: string | null
  wholeCar: boolean
  seatPicks: SeatPick[]
  routeKm: number | null
  toLat: number | null
  toLng: number | null
  status: string
  source: string
  // "Ayollar uchun taxi" — female drivers only. passengerGender: MALE | FEMALE | COUPLE | null.
  womenOnly: boolean
  // True while a women-only order is still offered to female drivers alone (first 5 minutes).
  femaleOnly: boolean
  passengerGender: string | null
  createdAt: string
  pickupLat: number | null
  pickupLng: number | null
  pickupText: string | null
  confirmed: boolean
  claimedAt: string | null
  confirmedAt: string | null
  finishedAt: string | null
}

export interface SeatPick {
  position: 'FRONT' | 'REAR_LEFT' | 'REAR_MIDDLE' | 'REAR_RIGHT'
  gender: 'MALE' | 'FEMALE'
}

/** An order as its own passenger sees it — with the driver once somebody has taken it. */
export interface PassengerBotOrder extends BotOrder {
  driver: { name: string; phone: string; carModel: string; plate: string } | null
}

export interface DriverOrdersResponse {
  registered: boolean
  region?: string
  gender?: string | null
  openOrders?: BotOrder[]
  claimedOrder?: BotOrder | null
  claimedOrders?: BotOrder[]
}

export async function getDriverBotOrders(telegramId: string): Promise<DriverOrdersResponse> {
  return botFetch<DriverOrdersResponse>(`/webapp/driver-orders?telegramId=${encodeURIComponent(telegramId)}`)
}

export async function claimBotOrder(telegramId: string, orderId: number): Promise<{ order: BotOrder }> {
  return botFetch<{ order: BotOrder }>(`/webapp/driver-orders/${orderId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ telegramId }),
  })
}

export async function enrouteBotOrder(telegramId: string, orderId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/driver-orders/${orderId}/enroute`, {
    method: 'POST',
    body: JSON.stringify({ telegramId }),
  })
}

export async function completeBotOrder(telegramId: string, orderId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/driver-orders/${orderId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ telegramId }),
  })
}

export async function cancelBotOrder(telegramId: string, orderId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/driver-orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ telegramId }),
  })
}

/** A website passenger as the bot knows them: their linked Telegram account if any, and always
 * their website account — enough for accounts that never linked Telegram (Google sign-up). */
export interface PassengerWho {
  telegramId?: string | null
  coreUserId: string
}

const whoQuery = (who: PassengerWho) =>
  new URLSearchParams({ coreUserId: who.coreUserId, ...(who.telegramId ? { telegramId: who.telegramId } : {}) }).toString()
const whoBody = (who: PassengerWho) => ({ coreUserId: who.coreUserId, ...(who.telegramId ? { telegramId: who.telegramId } : {}) })

export interface CreatePassengerOrderPayload extends PassengerWho {
  name: string
  language?: string
  phone: string
  fromRegion: string
  fromDistrict?: string
  toRegion: string
  toDistrict?: string
  whenText: string
  passengers: number
  seat?: string
  luggage?: string
  gender?: string
  womenOnly?: boolean
  carBrand?: string
  pickupText?: string
  pickupLat?: number
  pickupLng?: number
  toLat?: number
  toLng?: number
  routeKm?: number
  wholeCar?: boolean
  seats?: SeatPick[]
  price?: number | null
  paymentMethod?: string
  departAt?: string
  note?: string
}

export type UpdatePassengerOrderPayload = Partial<
  Pick<
    CreatePassengerOrderPayload,
    'whenText' | 'departAt' | 'passengers' | 'wholeCar' | 'seats' | 'luggage' | 'carBrand' | 'pickupText' | 'price'
  >
>

export async function createPassengerBotOrder(
  payload: CreatePassengerOrderPayload,
): Promise<{ order: BotOrder; sent: number }> {
  // Dispatch posts to groups and DMs every matching driver (incl. TTS) — give it time.
  return botFetch<{ order: BotOrder; sent: number }>('/webapp/passenger-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
    timeoutMs: 30000,
  })
}

export async function getPassengerBotOrders(who: PassengerWho): Promise<{ orders: PassengerBotOrder[] }> {
  return botFetch<{ orders: PassengerBotOrder[] }>(`/webapp/passenger-orders?${whoQuery(who)}`)
}

export async function getPassengerBotOrder(who: PassengerWho, orderId: number): Promise<{ order: PassengerBotOrder }> {
  return botFetch<{ order: PassengerBotOrder }>(`/webapp/passenger-orders/${orderId}?${whoQuery(who)}`)
}

export async function updatePassengerBotOrder(
  who: PassengerWho,
  orderId: number,
  patch: UpdatePassengerOrderPayload,
): Promise<{ order: PassengerBotOrder }> {
  // Re-renders every dispatched copy of the order in Telegram — same budget as creating one.
  return botFetch<{ order: PassengerBotOrder }>(`/webapp/passenger-orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...whoBody(who), ...patch }),
    timeoutMs: 30000,
  })
}

export async function cancelPassengerBotOrder(who: PassengerWho, orderId: number): Promise<{ order: PassengerBotOrder }> {
  return botFetch<{ order: PassengerBotOrder }>(`/webapp/passenger-orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(whoBody(who)),
    timeoutMs: 30000,
  })
}

export interface AdminBotOrder extends BotOrder {
  assignedDriver: { name: string; phone: string; gender: string | null } | null
  dispatchCount: number
}

export async function getAdminBotOrders(params: { status?: string; q?: string; women?: boolean }): Promise<AdminBotOrder[]> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)
  if (params.women) query.set('women', '1')
  const { orders } = await botFetch<{ orders: AdminBotOrder[] }>(`/webapp/admin/orders?${query.toString()}`)
  return orders
}

export async function getAdminBotOrder(orderId: number): Promise<AdminBotOrder> {
  const { order } = await botFetch<{ order: AdminBotOrder }>(`/webapp/admin/orders/${orderId}`)
  return order
}

export async function updateAdminBotOrder(
  orderId: number,
  patch: Partial<
    Pick<
      BotOrder,
      | 'passengerName'
      | 'passengerPhone'
      | 'fromRegion'
      | 'fromDistrict'
      | 'toRegion'
      | 'toDistrict'
      | 'carBrand'
      | 'seat'
      | 'passengers'
      | 'luggageSize'
      | 'whenText'
      | 'price'
      | 'pickupLat'
      | 'pickupLng'
      | 'pickupText'
    >
  >,
): Promise<AdminBotOrder> {
  const { order } = await botFetch<{ order: AdminBotOrder }>(`/webapp/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return order
}

export async function setAdminBotOrderStatus(
  orderId: number,
  status: 'OPEN' | 'CLOSED' | 'CANCELLED',
): Promise<AdminBotOrder> {
  const { order } = await botFetch<{ order: AdminBotOrder }>(`/webapp/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return order
}

/** An admin set a driver's gender on the website — mirror it onto the bot's DriverProfile. */
export async function setBotDriverGender(payload: {
  telegramId: string | null
  phone: string
  gender: 'MALE' | 'FEMALE' | null
}): Promise<{ ok: true; driverProfile: boolean }> {
  return botFetch<{ ok: true; driverProfile: boolean }>('/webapp/driver-gender', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminBotOrder(orderId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/admin/orders/${orderId}`, { method: 'DELETE' })
}

export async function ratePassengerBotOrder(
  who: PassengerWho,
  orderId: number,
  data: { stars: number; tags?: string[]; comment?: string },
): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/passenger-orders/${orderId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ ...whoBody(who), ...data }),
  })
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
  language: string | null
  username: string | null
  inviteLink: string | null
  routes: BotGroupRoute[]
  createdAt: string | null
  settings: Record<string, boolean>
  linkedGroupId: number | null
}

export interface BotGroupsResponse {
  groups: BotGroup[]
  regions: string[]
  settingLabels: Record<string, string>
}

export interface BotGroupTopicInput {
  fromRegion: string
  toRegion: string
  ref?: string
  threadId?: number
  label?: string
}

export interface BotGroupPayload {
  kind?: 'CLOSED' | 'ROUTE' | 'CHANNEL' | 'MAIN'
  settings?: Record<string, boolean>
  linkedGroupId?: number | null
  ref?: string
  title?: string
  fromRegion?: string
  toRegion?: string
  includeReverse?: boolean
  topics?: BotGroupTopicInput[]
}

const GROUP_TIMEOUT = { timeoutMs: 20_000 }

export async function getAdminBotGroups(kind?: string): Promise<BotGroupsResponse> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return botFetch<BotGroupsResponse>(`/webapp/admin/groups${query}`, GROUP_TIMEOUT)
}

export async function createAdminBotGroup(payload: BotGroupPayload): Promise<BotGroup> {
  const { group } = await botFetch<{ group: BotGroup }>('/webapp/admin/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...GROUP_TIMEOUT,
  })
  return group
}

export async function updateAdminBotGroup(groupId: number, payload: BotGroupPayload): Promise<BotGroup> {
  const { group } = await botFetch<{ group: BotGroup }>(`/webapp/admin/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...GROUP_TIMEOUT,
  })
  return group
}

export async function deleteAdminBotGroup(groupId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/admin/groups/${groupId}`, { method: 'DELETE', ...GROUP_TIMEOUT })
}

// ── Bot sozlamalari: runtime settings the bot keeps in its own DB (see bot_config.py) ──────
export interface BotSettingField {
  key: string
  label: string
  type: 'int' | 'bool' | 'url' | 'text' | 'longtext'
  help: string
  min: number | null
  max: number | null
  default: unknown
  value: unknown
}

export interface BotSettingsResponse {
  sections: { key: string; label: string; description: string; fields: BotSettingField[] }[]
}

export async function getBotSettings(): Promise<BotSettingsResponse> {
  return botFetch<BotSettingsResponse>('/webapp/admin/bot-settings')
}

export async function updateBotSettings(values: Record<string, unknown>): Promise<BotSettingsResponse> {
  return botFetch<BotSettingsResponse>('/webapp/admin/bot-settings', {
    method: 'PATCH',
    body: JSON.stringify({ values }),
  })
}

// Messages caught by an open group's "yo'lovchi/haydovchi" question (bot's group_ads table).
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
  status: string
  takenByName: string | null
  // Typed in from the dashboard (no Telegram author).
  manual: boolean
  hasCard: boolean
  createdAt: string | null
  answeredAt: string | null
}

export interface BotGroupAdsResponse {
  ads: BotGroupAd[]
  stats24h: Record<string, number>
  chatTitles: Record<string, string | null>
}

export async function getBotGroupAds(status?: string, limit = 100): Promise<BotGroupAdsResponse> {
  const query = new URLSearchParams({ limit: String(limit) })
  if (status) query.set('status', status)
  return botFetch<BotGroupAdsResponse>(`/webapp/admin/group-ads?${query}`, GROUP_TIMEOUT)
}

export async function createBotGroupAd(payload: {
  targetGroupId: number
  text: string
  authorName?: string
}): Promise<BotGroupAd> {
  const { ad } = await botFetch<{ ad: BotGroupAd }>('/webapp/admin/group-ads', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...GROUP_TIMEOUT,
  })
  return ad
}

export async function updateBotGroupAd(id: number, payload: { text?: string; status?: 'SENT' | 'CANCELLED' }): Promise<BotGroupAd> {
  const { ad } = await botFetch<{ ad: BotGroupAd }>(`/webapp/admin/group-ads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...GROUP_TIMEOUT,
  })
  return ad
}

export async function deleteBotGroupAd(id: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/admin/group-ads/${id}`, { method: 'DELETE', ...GROUP_TIMEOUT })
}

// ── Takroriy e'lonlar himoyasi (taxiline-bot/app/services/repeat_guard.py) ──────────────────
export interface RepeatGuardReport {
  totals: { posts: number; cooldown: number; duplicate: number; mutes: number }
  offenders: {
    chatId: number
    chatTitle: string | null
    telegramId: number
    name: string | null
    strikes: number
    mutes: number
    lastAt: string | null
    mutedUntil: string | null
  }[]
}

// Bosh sahifa: guruhlardagi e'lonlar va bot foydalanuvchilari (taxiline-bot/app/services/ads_stats.py).
export interface AdsStatsReport {
  days: number
  from: string
  totals: {
    ads: number
    driver: number
    passenger: number
    unknown: number
    withPhoto: number
    authors: number
    calls: number
    blocked: number
    activeGroups: number
  }
  previous: { ads: number; calls: number }
  series: { date: string; driver: number; passenger: number; calls: number }[]
  hours: number[]
  groups: { chatId: string; title: string | null; kind: string | null; ads: number; driver: number; passenger: number; calls: number }[]
  groupsTotal: number
  topAuthors: { telegramId: string; name: string; username: string | null; ads: number; role: string | null }[]
  routed: Record<string, number>
  botUsers: {
    total: number
    drivers: number
    clients: number
    blocked: number
    new: number
    active: number
    series: { date: string; count: number }[]
  }
}

export async function getAdsStats(days: number): Promise<AdsStatsReport> {
  return botFetch<AdsStatsReport>(`/webapp/admin/ads-stats?days=${days}`, GROUP_TIMEOUT)
}

export interface AdsTimeline {
  unit: 'day' | 'week' | 'month'
  buckets: { start: string; ads: number; driver: number; passenger: number; authors: number; calls: number }[]
}

export async function getAdsTimeline(unit: string): Promise<AdsTimeline> {
  return botFetch<AdsTimeline>(`/webapp/admin/ads-timeline?unit=${unit}`, GROUP_TIMEOUT)
}

export async function getRepeatGuardReport(days: number): Promise<RepeatGuardReport> {
  return botFetch<RepeatGuardReport>(`/webapp/admin/repeat-guard?days=${days}`, GROUP_TIMEOUT)
}

export async function repeatGuardUnmute(chatId: number, telegramId: number): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>('/webapp/admin/repeat-guard/unmute', {
    method: 'POST',
    body: JSON.stringify({ chatId, telegramId }),
    ...GROUP_TIMEOUT,
  })
}

// ── Aloqa: «Tel qilish» calls (bot's call_logs table, see taxiline-bot/app/services/calls.py) ──
export interface RecordedCall {
  phone: string
  phoneDisplay: string
  ownerName: string | null
  role: 'DRIVER' | 'PASSENGER'
  chatTitle: string | null
  callerName: string | null
}

export async function recordCall(payload: {
  k?: string
  i?: number
  s?: string
  n?: string
  tg?: Record<string, unknown> | null
  ua: string | null
  ip: string | null
}): Promise<RecordedCall> {
  return botFetch<RecordedCall>('/webapp/call', { method: 'POST', body: JSON.stringify(payload) })
}

export interface CallReport {
  totals: { calls: number; identifiedCalls: number; uniqueCallers: number; numbers: number }
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

export async function getCallReport(days: number, phone?: string): Promise<CallReport> {
  const query = new URLSearchParams({ days: String(days) })
  if (phone) query.set('phone', phone)
  return botFetch<CallReport>(`/webapp/admin/calls?${query}`, GROUP_TIMEOUT)
}

// ── Random mijoz: Telegram kanal/guruh a'zoligini tekshirish ───────────────────────────────
// The bot runs getChatMember for every (chat, user) pair. Per chat the answer is `true`
// (member/admin/creator), `false` (left/kicked/never joined) or an error string when the chat
// itself can't be queried (wrong id, bot isn't an admin of the channel).
export interface ChatMembersResult {
  members: Record<string, Record<string, boolean>>
  chatErrors: Record<string, string>
}

export async function checkChatMembers(chats: string[], telegramIds: string[]): Promise<ChatMembersResult> {
  return botFetch<ChatMembersResult>('/webapp/chat-members', {
    method: 'POST',
    body: JSON.stringify({ chats, telegramIds }),
    // ~25 getChatMember calls per second on the bot side; large rechecks are chunked by the caller.
    timeoutMs: 60_000,
  })
}

// Driver applications managed in the admin panel — mirrored onto the bot's DriverProfile.
export async function setBotDriverBlocked(payload: {
  telegramId: string | null
  phone: string
  blocked: boolean
}): Promise<{ ok: true; driverProfile: boolean }> {
  return botFetch<{ ok: true; driverProfile: boolean }>('/webapp/driver-blocked', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateBotDriverProfile(payload: {
  telegramId: string | null
  phone: string
  fullName: string
  carModel: string
  plate: string
  region: string | null
  toRegion: string | null
  gender: 'MALE' | 'FEMALE' | null
}): Promise<{ ok: true; driverProfile: boolean }> {
  return botFetch<{ ok: true; driverProfile: boolean }>('/webapp/driver-update', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
