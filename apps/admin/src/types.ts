export interface AdminUserRow {
  id: string
  phone: string
  name: string | null
  firstName: string | null
  email: string | null
  avatarUrl: string | null
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  verified: boolean
  balance: number
  points: number
  coins: number
  language: string | null
  telegramId: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  driver?: {
    id: string
    carModel: string
    plate: string
    ratingAvg: number
    ratingCount: number
    tripsCount: number
    online: boolean
    approved: boolean
  } | null
}

export interface AdminUserDetail extends AdminUserRow {
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
  }>
  recentTransactions: TransactionRow[]
  ratingsReceived: Array<{
    id: string
    stars: number
    tags: string[]
    comment: string | null
    createdAt: string
    direction: RatingDirection
    rater: { id: string; name: string | null; phone: string }
  }>
}

export interface DriverUser {
  id: string
  phone: string
  name: string | null
  avatarUrl?: string | null
  telegramId?: string | null
  balance?: number
}

export interface DriverRow {
  id: string
  userId: string
  carModel: string
  plate: string
  carImageUrl: string | null
  licenseNumber: string | null
  ratingAvg: number
  ratingCount: number
  tripsCount: number
  online: boolean
  approved: boolean
  currentLat: number | null
  currentLng: number | null
  locationUpdatedAt: string | null
  createdAt: string
  archivedAt: string | null
  archivedReason: string | null
  user: DriverUser
  subscription?: { status: DriverSubscriptionStatus; expiresAt: string } | null
}

export interface SubscriptionPlanRow {
  id: string
  title: string
  durationDays: number
  price: number
  active: boolean
  sortOrder: number
}

export type DriverSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface SubscriptionPaymentRow {
  id: string
  amount: number
  method: string
  note: string | null
  planTitle: string
  createdAt: string
}

export interface DriverSubscriptionDetail {
  subscription: {
    status: DriverSubscriptionStatus
    plan: SubscriptionPlanRow
    startedAt: string
    expiresAt: string
    cancelledAt: string | null
  } | null
  payments: SubscriptionPaymentRow[]
  bookingStats: { accepted: number; cancelled: number; completed: number }
}

export interface DriverDetail extends DriverRow {
  user: DriverUser & { ratingAvg?: number; ratingCount?: number; createdAt?: string }
  recentOffers: RideOfferRow[]
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
    rider: { id: string; name: string | null; phone: string }
  }>
}

export interface DriverApplicationRow {
  id: string
  userId: string
  fullName: string
  phone: string
  carModel: string
  plate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
  user: { id: string; phone: string; name: string | null }
}

export interface ServiceRow {
  id: string
  title: string
  description: string | null
  icon: string
  basePrice: number
  active: boolean
  sortOrder: number
}

export type OfferStatus = 'ACTIVE' | 'FULL' | 'CLOSED' | 'CANCELLED'

export interface RideOfferRow {
  id: string
  fromLabel: string
  toLabel: string
  fromAddress?: string
  toAddress?: string
  departAt: string
  arriveAt?: string | null
  seatsTotal: number
  seatsAvailable: number
  luggageCapacity?: number
  pricePerSeat: number
  genderPref?: string | null
  notes?: string | null
  contactPhones?: string[]
  status: OfferStatus
  createdAt?: string
  driver: { user: { id?: string; name: string | null; phone: string } }
  service: ServiceRow
}

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'

export interface BookingRow {
  id: string
  fromLabel: string
  toLabel: string
  fromAddress?: string
  toAddress?: string
  departAt: string
  seatsBooked: number
  luggage?: number
  totalPrice: number
  discountApplied?: number | null
  status: BookingStatus
  cancelReason?: string | null
  createdAt: string
  rider: { id: string; name: string | null; phone: string; avatarUrl?: string | null }
  rideOffer: {
    driver: { user: { id?: string; name: string | null; phone: string } }
    service: ServiceRow
  }
  promoCode?: { id: string; code: string; title: string } | null
}

export interface CancellationStats {
  riders: Array<{ user: { id: string; name: string | null; phone: string }; count: number }>
  drivers: Array<{ user: { id: string; name: string | null; phone: string }; count: number }>
}

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
  createdAt: string
  pickupLat: number | null
  pickupLng: number | null
  pickupText: string | null
  confirmed: boolean
  assignedDriver: { name: string; phone: string } | null
  dispatchCount: number
}

export interface PromoRow {
  id: string
  code: string
  title: string
  discountType: 'FIXED' | 'PERCENT'
  discountValue: number
  validFrom: string
  validUntil: string
  maxUses: number | null
  usesCount: number
  active: boolean
}

export type TransactionType = 'TOPUP' | 'RIDE_PAYMENT' | 'REFUND' | 'PROMO_BONUS' | 'PAYOUT'
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export interface TransactionRow {
  id: string
  userId: string
  bookingId: string | null
  type: TransactionType
  status: TransactionStatus
  amount: number
  title: string
  routeLabel: string | null
  provider: string | null
  createdAt: string
  user?: { id: string; name: string | null; phone: string }
}

export type RatingDirection = 'PASSENGER_RATES_DRIVER' | 'DRIVER_RATES_PASSENGER'

export interface RatingRow {
  id: string
  tripRef: string
  direction: RatingDirection
  stars: number
  tags: string[]
  comment: string | null
  createdAt: string
  rater: { id: string; name: string | null; phone: string }
  ratee: { id: string; name: string | null; phone: string }
}

export type ChannelSource = 'WEBAPP' | 'BOT' | 'GROUP'

export interface PersonDriver {
  id: string
  carModel: string
  plate: string
  carImageUrl: string | null
  licenseNumber: string | null
  ratingAvg: number
  ratingCount: number
  tripsCount: number
  online: boolean
  approved: boolean
}

export interface PersonRow {
  id: string
  phone: string
  name: string | null
  firstName: string | null
  email: string | null
  avatarUrl: string | null
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
  verified: boolean
  balance: number
  points: number
  coins: number
  language: string | null
  telegramId: string | null
  telegramUsername: string | null
  signupSource: ChannelSource
  fromWebapp: boolean
  fromBot: boolean
  fromGroup: boolean
  lastSeenAt: string | null
  notes: string | null
  loginPassword?: string | null
  ratingAvg: number
  ratingCount: number
  createdAt: string
  updatedAt: string
  driver: PersonDriver | null
}

export interface PeopleListResponse {
  items: PersonRow[]
  stats: {
    total: number
    drivers: number
    passengers: number
    bot: number
    webapp: number
    group: number
  }
}

export interface PersonDetail extends PersonRow {
  recentBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    departAt: string
    createdAt: string
  }>
  recentTransactions: Array<{
    id: string
    type: TransactionType
    status: TransactionStatus
    amount: number
    title: string
    createdAt: string
  }>
  ratingsReceived: Array<{
    id: string
    stars: number
    tags: string[]
    comment: string | null
    createdAt: string
    rater: { id: string; name: string | null; phone: string }
  }>
  driverBookings: Array<{
    id: string
    fromLabel: string
    toLabel: string
    status: BookingStatus
    totalPrice: number
    createdAt: string
    rider: { name: string | null; phone: string }
  }>
}

export interface AnalyticsSummary {
  range: { from: string; to: string }
  bookingsCount: number
  completedCount: number
  revenue: number
  activeDrivers: number
  usersCount: number
  driversCount: number
  pendingApplications: number
  telegramLinkedCount: number
  bookingsByStatus: Record<BookingStatus, number>
  series: Array<{ date: string; bookings: number; completed: number; revenue: number }>
  topRoutes: Array<{ route: string; count: number }>
  recentBookings: BookingRow[]
  recentApplications: DriverApplicationRow[]
}

export type StaffKind = 'ADMIN' | 'SALES' | 'SUPPORT'
export type PanelRole = 'ADMIN' | 'SALES_OPERATOR' | 'SUPPORT_OPERATOR'
export type KpiPeriod = 'DAY' | 'WEEK' | 'MONTH'
export type ActivityKind = 'NEW_USER' | 'NEW_DRIVER' | 'BOOKING' | 'REVENUE' | 'CALL' | 'NOTE'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketCategory = 'TECHNICAL' | 'PAYMENT' | 'BOOKING' | 'ACCOUNT' | 'OTHER'

export interface StaffRow {
  id: string
  phone: string
  name: string | null
  staffKind: StaffKind
  staffActive: boolean
  busy: boolean
  online: boolean
  verified: boolean
  loginPassword?: string | null
  lastSeenAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface SessionRow {
  id: string
  ip: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
}

export interface AuditLogRow {
  id: string
  action: string
  targetType: string
  targetId: string | null
  meta: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; name: string | null; phone: string } | null
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
export type LeadType = 'PASSENGER' | 'DRIVER'
export type LeadChannel = 'MANUAL' | 'INSTAGRAM_DM' | 'INSTAGRAM_LEAD_AD'

export interface LeadRow {
  id: string
  name: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  leadType: LeadType
  channel: LeadChannel
  igUsername: string | null
  adName: string | null
  formName: string | null
  note: string | null
  followUpAt: string | null
  ownerId: string
  owner: { id: string; name: string | null; phone: string }
  createdAt: string
  updatedAt: string
}

export type LeadMessageDirection = 'IN' | 'OUT'

export interface LeadMessageRow {
  id: string
  leadId: string
  direction: LeadMessageDirection
  body: string
  createdAt: string
}

export interface InstagramStatus {
  configured: boolean
  connected: boolean
  igUsername?: string
  pageId?: string
  connectedAt?: string
  connectedByName?: string
}

export interface CannedResponseRow {
  id: string
  category: TicketCategory | null
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface StaffContacts {
  customers: number
  drivers: number
  calls: number
  bookings: number
  ticketsAssigned: number
  ticketsOpen: number
  ticketsResolved: number
  ticketsCreated: number
}

export interface StaffKpiSlice {
  period: KpiPeriod
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
}

export interface StaffDetail extends StaffRow {
  loginPassword: string | null
  kpis: StaffKpiSlice[]
  lifetime: KpiNumbers
  contacts: StaffContacts
  activities: Array<{
    id: string
    kind: ActivityKind
    title: string
    note: string | null
    amount: number
    createdAt: string
  }>
  assignedTickets: Array<{
    id: string
    ticketNo: number
    subject: string
    status: TicketStatus
    requesterName: string | null
    requesterPhone: string | null
    createdAt: string
    resolvedAt: string | null
  }>
  createdTickets: Array<{
    id: string
    ticketNo: number
    subject: string
    status: TicketStatus
    requesterName: string | null
    requesterPhone: string | null
    createdAt: string
  }>
}

export interface KpiNumbers {
  newUsers: number
  newDrivers: number
  bookings: number
  revenue: number
  calls: number
}

export interface StaffKpiRow {
  operator: StaffRow
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
}

export interface SalesDashboard {
  operator: StaffRow
  period: KpiPeriod
  range: { from: string; to: string }
  target: KpiNumbers
  actual: KpiNumbers
  progress: KpiNumbers
  activities: Array<{
    id: string
    kind: ActivityKind
    title: string
    note: string | null
    amount: number
    createdAt: string
  }>
  leaderboard: Array<{
    id: string
    name: string | null
    phone: string
    actual: KpiNumbers
    score: number
  }>
}

export interface TicketBookingSummary {
  id: string
  fromLabel: string
  toLabel: string
  status?: BookingStatus
  totalPrice?: number
  departAt?: string
  rider?: { id: string; name: string | null; phone: string }
  rideOffer?: { driver: { id: string; user: { id: string; name: string | null; phone: string } } | null }
}

export interface TicketDriverSummary {
  id: string
  plate: string
  carModel?: string
  user: { id?: string; name: string | null; phone: string }
}

export interface TicketRow {
  id: string
  ticketNo: number
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  subject: string
  description: string
  requesterPhone: string | null
  requesterName: string | null
  assigneeId: string | null
  bookingId: string | null
  driverId: string | null
  satisfactionRating: number | null
  satisfactionComment: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  slaDueAt: string
  slaBreached: boolean
  assignee?: { id: string; name: string | null; phone: string } | null
  createdBy?: { id: string; name: string | null; phone: string } | null
  booking?: TicketBookingSummary | null
  driver?: TicketDriverSummary | null
  _count?: { messages: number }
}

export interface TicketDetail extends TicketRow {
  messages: Array<{
    id: string
    body: string
    internal: boolean
    createdAt: string
    author: { id: string; name: string | null; phone: string } | null
  }>
}

export interface BookingLookupRow {
  id: string
  fromLabel: string
  toLabel: string
  status: BookingStatus
  departAt: string
  createdAt: string
  rider: { id: string; name: string | null; phone: string }
}

export interface DriverLookupRow {
  id: string
  plate: string
  carModel: string
  user: { id: string; name: string | null; phone: string }
}

export interface TicketStats {
  open: number
  waiting: number
  resolvedToday: number
  createdToday: number
  urgent: number
  avgResolveHours: number
}

export interface ReportSheet {
  name: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface ReportPreview {
  period: 'day' | 'week' | 'month'
  label: string
  range: { from: string; to: string }
  sheets: ReportSheet[]
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
