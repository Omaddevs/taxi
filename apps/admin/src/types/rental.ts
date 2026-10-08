export type RentalVehicleType = 'SCOOTER' | 'E_SCOOTER' | 'BICYCLE' | 'E_BIKE' | 'MOTORCYCLE'
export type RentalOwnerType = 'COMPANY' | 'PERSON'
export type RentalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface RentalBase {
  id: string
  ownerId: string | null
  owner: { id: string; name: string | null; firstName: string | null; phone: string } | null
  ownerType: RentalOwnerType
  companyName: string | null
  contactName: string | null
  phone: string
  telegram: string | null
  vehicleType: RentalVehicleType
  title: string
  brand: string | null
  model: string | null
  description: string | null
  pricePerHour: number | null
  pricePerDay: number | null
  pricePerWeek: number | null
  deposit: number | null
  maxSpeed: number | null
  rangeKm: number | null
  licenseRequired: boolean
  address: string | null
  lat: number | null
  lng: number | null
  status: RentalStatus
  rejectionReason: string | null
  active: boolean
  featured: boolean
  views: number
  createdAt: string
  updatedAt: string
}

/** Row in GET /admin/rentals — only the cover photo travels with the list. */
export interface RentalRow extends RentalBase {
  cover: string | null
  photoCount: number
}

/** GET /admin/rentals/:id — the full listing, for the edit form. */
export interface RentalDetail extends RentalBase {
  photos: string[]
}
