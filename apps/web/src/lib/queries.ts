import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { api } from './api'
import { offerToTrip, bookingToHistoryItem, type Booking, type RideOffer } from './adapters'

export function useOffersSearch(params: Record<string, unknown>, options: Partial<UseQueryOptions> = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][],
  )
  return useQuery({
    queryKey: ['offers', 'search', params],
    queryFn: async () => {
      const offers = await api.get<RideOffer[]>(`/offers/search?${query.toString()}`)
      return offers.map(offerToTrip)
    },
    // So a listing an admin deletes/unpublishes disappears from search on its own, the same
    // way driver order queues already poll (DriverHome.jsx/DriverOrders.jsx) rather than
    // relying on a socket push that doesn't exist for offers.
    refetchInterval: 15_000,
    ...options,
  })
}

export function useMyBookings(
  { status, role = 'rider' }: { status?: string; role?: string } = {},
  options: Partial<UseQueryOptions> = {},
) {
  const query = new URLSearchParams({ role, ...(status ? { status } : {}) })
  return useQuery({
    queryKey: ['bookings', role, status],
    queryFn: () => api.get<Booking[]>(`/bookings?${query.toString()}`),
    ...options,
  })
}

export function useRecentTrips(limit = 3) {
  const { data: bookings = [], ...rest } = useMyBookings({})
  return { data: (bookings as Booking[]).slice(0, limit).map(bookingToHistoryItem), ...rest }
}
