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
