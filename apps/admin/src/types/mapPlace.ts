export type MapPlaceCategory = 'FUEL' | 'SERVICE' | 'WASH' | 'PARKING' | 'EV' | 'FOOD' | 'HELP' | 'SCOOTER' | 'OTHER'

export interface MapPlacePrice {
  title: string
  price: number
}

export interface MapPlaceRow {
  id: string
  category: MapPlaceCategory
  name: string
  brand: string | null
  address: string | null
  phone: string | null
  hours: string | null
  description: string | null
  lat: number
  lng: number
  imageUrl: string | null
  prices: MapPlacePrice[]
  active: boolean
  createdAt: string
  updatedAt: string
}
