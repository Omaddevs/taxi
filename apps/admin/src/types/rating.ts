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
