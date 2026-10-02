export type CarFuelType = 'BENZIN' | 'ELECTRO_HYBRID'

export interface CarRow {
  id: string
  brand: string
  model: string
  fuelType: CarFuelType
  imageUrl: string | null
  selectionCount: number
  active: boolean
  createdAt: string
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
