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
