import type { BookingStatus, DriverSubscriptionStatus, OfferStatus, OrderStatus, RatingDirection, TransactionStatus, TransactionType } from '../types'

export const BOOKING_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilingan',
  ONGOING: 'Jarayonda',
  COMPLETED: 'Yakunlangan',
  CANCELLED: 'Bekor qilingan',
}

export const BOOKING_TONE: Record<BookingStatus, 'amber' | 'pink' | 'green' | 'red'> = {
  PENDING: 'amber',
  ACCEPTED: 'pink',
  ONGOING: 'pink',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

export const OFFER_LABEL: Record<OfferStatus, string> = {
  ACTIVE: 'Faol',
  FULL: 'To‘la',
  CLOSED: 'Yopilgan',
  CANCELLED: 'Bekor',
}

export const OFFER_TONE: Record<OfferStatus, 'green' | 'amber' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  FULL: 'amber',
  CLOSED: 'gray',
  CANCELLED: 'red',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: 'Faol',
  CLAIMED: 'Band qilindi',
  COMPLETED: 'Yakunlangan',
  CLOSED: 'Yopilgan',
  CANCELLED: 'Bekor',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, 'green' | 'amber' | 'pink' | 'gray' | 'red'> = {
  OPEN: 'amber',
  CLAIMED: 'pink',
  COMPLETED: 'green',
  CLOSED: 'gray',
  CANCELLED: 'red',
}

export const ROLE_LABEL = {
  PASSENGER: 'Yo‘lovchi',
  DRIVER: 'Haydovchi',
  ADMIN: 'Admin',
  SALES_OPERATOR: 'Sotuv operatori',
  SUPPORT_OPERATOR: 'Texnik operator',
} as const

export const ROLE_TONE = {
  PASSENGER: 'gray',
  DRIVER: 'pink',
  ADMIN: 'amber',
  SALES_OPERATOR: 'green',
  SUPPORT_OPERATOR: 'pink',
} as const

export const STAFF_LABEL = {
  ADMIN: 'Administrator',
  SALES: 'Sotuv operatori',
  SUPPORT: 'Texnik operator',
} as const

export const STAFF_TONE = {
  ADMIN: 'amber',
  SALES: 'green',
  SUPPORT: 'pink',
} as const

export const ACTIVITY_LABEL = {
  NEW_USER: 'Yangi mijoz',
  NEW_DRIVER: 'Yangi haydovchi',
  BOOKING: 'Bron',
  REVENUE: 'Savdo',
  CALL: 'Qo‘ng‘iroq',
  NOTE: 'Izoh',
} as const

export const TICKET_STATUS_LABEL = {
  OPEN: 'Yangi',
  IN_PROGRESS: 'Jarayonda',
  WAITING: 'Kutilmoqda',
  RESOLVED: 'Hal qilindi',
  CLOSED: 'Yopilgan',
} as const

export const TICKET_STATUS_TONE = {
  OPEN: 'amber',
  IN_PROGRESS: 'pink',
  WAITING: 'gray',
  RESOLVED: 'green',
  CLOSED: 'gray',
} as const

export const TICKET_PRIORITY_LABEL = {
  LOW: 'Past',
  MEDIUM: 'O‘rta',
  HIGH: 'Yuqori',
  URGENT: 'Shoshilinch',
} as const

export const TICKET_CATEGORY_LABEL = {
  TECHNICAL: 'Texnik',
  PAYMENT: 'To‘lov',
  BOOKING: 'Bron',
  ACCOUNT: 'Hisob',
  OTHER: 'Boshqa',
} as const

export const TX_TYPE_LABEL: Record<TransactionType, string> = {
  TOPUP: 'To‘ldirish',
  RIDE_PAYMENT: 'Safar to‘lovi',
  REFUND: 'Qaytarish',
  PROMO_BONUS: 'Promo bonus',
  PAYOUT: 'Yechish',
}

export const TX_STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: 'Kutilmoqda',
  SUCCESS: 'Muvaffaqiyatli',
  FAILED: 'Muvaffaqiyatsiz',
}

export const SUB_STATUS_LABEL: Record<DriverSubscriptionStatus, string> = {
  ACTIVE: 'Faol',
  EXPIRED: 'Muddati tugagan',
  CANCELLED: 'Bekor qilingan',
}

export const SUB_STATUS_TONE: Record<DriverSubscriptionStatus, 'green' | 'amber' | 'red'> = {
  ACTIVE: 'green',
  EXPIRED: 'amber',
  CANCELLED: 'red',
}

export const SUB_METHOD_LABEL: Record<string, string> = {
  cash: 'Naqd',
  transfer: "O'tkazma",
  other: 'Boshqa',
}

export const RATING_DIR_LABEL: Record<RatingDirection, string> = {
  PASSENGER_RATES_DRIVER: 'Haydovchiga',
  DRIVER_RATES_PASSENGER: 'Yo‘lovchiga',
}

export const CHANNEL_LABEL = {
  WEBAPP: 'Web ilova',
  BOT: 'Telegram bot',
  GROUP: 'Guruh',
} as const

export const CHANNEL_TONE = {
  WEBAPP: 'gray',
  BOT: 'pink',
  GROUP: 'amber',
} as const

export const APP_STATUS_LABEL = {
  PENDING: 'Kutilmoqda',
  APPROVED: 'Tasdiqlangan',
  REJECTED: 'Rad etilgan',
} as const

export const LEAD_STATUS_LABEL = {
  NEW: 'Yangi',
  CONTACTED: 'Bog‘lanildi',
  QUALIFIED: 'Malakali',
  CONVERTED: 'Mijozga aylandi',
  LOST: 'Yo‘qotildi',
} as const

export const LEAD_STATUS_TONE = {
  NEW: 'gray',
  CONTACTED: 'amber',
  QUALIFIED: 'pink',
  CONVERTED: 'green',
  LOST: 'red',
} as const

export const LEAD_TYPE_LABEL = {
  PASSENGER: 'Yo‘lovchi',
  DRIVER: 'Haydovchi',
} as const

export const LEAD_CHANNEL_LABEL = {
  MANUAL: 'Qo‘lda kiritilgan',
  INSTAGRAM_DM: 'Instagram DM',
  INSTAGRAM_LEAD_AD: 'Instagram forma',
  WEBSITE: 'Sayt formasi',
} as const

export const LEAD_CHANNEL_TONE = {
  MANUAL: 'gray',
  INSTAGRAM_DM: 'pink',
  INSTAGRAM_LEAD_AD: 'pink',
  WEBSITE: 'green',
} as const

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  STAFF_CREATED: 'Operator yaratildi',
  STAFF_UPDATED: 'Operator ma’lumotlari o‘zgartirildi',
  PERSON_PASSWORD_SET: 'Mijozga parol o‘rnatildi',
  SESSION_REVOKED: 'Sessiya bekor qilindi',
  OFFER_UPDATED: 'Reys tahrirlandi',
  OFFER_STATUS_CHANGED: 'Reys holati o‘zgartirildi',
  OFFER_DELETED: 'Reys o‘chirildi',
  BOT_ORDER_UPDATED: 'Yo‘lovchi eloni tahrirlandi',
  BOT_ORDER_STATUS_CHANGED: 'Yo‘lovchi eloni holati o‘zgartirildi',
  BOT_ORDER_DELETED: 'Yo‘lovchi eloni o‘chirildi',
}
