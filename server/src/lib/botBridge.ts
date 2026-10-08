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
}

export interface DriverOrdersResponse {
  registered: boolean
  region?: string
  gender?: string | null
  openOrders?: BotOrder[]
  claimedOrder?: BotOrder | null
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

export interface CreatePassengerOrderPayload {
  telegramId: string
  name: string
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
  note?: string
}

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

export async function getPassengerBotOrders(telegramId: string): Promise<{ orders: BotOrder[] }> {
  return botFetch<{ orders: BotOrder[] }>(`/webapp/passenger-orders?telegramId=${encodeURIComponent(telegramId)}`)
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
  telegramId: string,
  orderId: number,
  data: { stars: number; tags?: string[]; comment?: string },
): Promise<{ ok: true }> {
  return botFetch<{ ok: true }>(`/webapp/passenger-orders/${orderId}/rate`, {
    method: 'POST',
    body: JSON.stringify({ telegramId, ...data }),
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
}

export interface BotGroupsResponse {
  groups: BotGroup[]
  regions: string[]
}

export interface BotGroupTopicInput {
  fromRegion: string
  toRegion: string
  ref?: string
  threadId?: number
  label?: string
}

export interface BotGroupPayload {
  kind?: 'CLOSED' | 'ROUTE' | 'CHANNEL'
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
