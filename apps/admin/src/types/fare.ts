// "Yo‘l haqi tariflari" — the rates behind the fare suggested to a passenger on the ride screen
// (server: modules/botOrders/fare.ts).
export interface FareRates {
  /** so‘m per seat per road kilometre */
  perKm: number
  /** the least one seat is ever suggested for */
  minPerSeat: number
  /** how far "Tejamkor" / "Tez topiladi" sit from the middle price, % */
  spreadPercent: number
  /** taken off the four-seat total for a whole car, % */
  wholeCarDiscountPercent: number
}

export interface FareSettingsResponse {
  rates: FareRates
  defaults: FareRates
  limits: Record<keyof FareRates, { min: number; max: number }>
  updatedAt: string | null
}

export interface FareRange {
  min: number
  mid: number
  max: number
}

export interface FareEstimate {
  km: number
  seats: number
  perSeat: FareRange
  total: FareRange
}

export interface FarePreview {
  oneSeat: FareEstimate
  wholeCar: FareEstimate
}
