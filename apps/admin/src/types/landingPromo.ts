export type LandingPromoPeriod = 'haftalik' | 'oylik' | 'doimiy'

export interface LandingPromoPrize {
  place: string
  reward: string
  tail?: string
}

export interface LandingPromoRow {
  id: string
  period: LandingPromoPeriod
  prizes: LandingPromoPrize[]
  terms: string
  termsBold: string | null
  soon: boolean
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
