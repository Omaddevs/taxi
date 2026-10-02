import type { ServiceRow } from './offer'

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

export interface BookingListResponse {
  items: BookingRow[]
  total: number
  page: number
  pageSize: number
}

export interface CancellationStats {
  riders: Array<{ user: { id: string; name: string | null; phone: string }; count: number }>
  drivers: Array<{ user: { id: string; name: string | null; phone: string }; count: number }>
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
