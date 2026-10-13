import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { offerToTrip, bookingToHistoryItem } from './adapters'

export function useOffersSearch(params, options = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  return useQuery({
    queryKey: ['offers', 'search', params],
    queryFn: async () => {
      const offers = await api.get(`/offers/search?${query.toString()}`)
      return offers.map(offerToTrip)
    },
    // So a listing an admin deletes/unpublishes disappears from search on its own, the same
    // way driver order queues already poll (DriverHome.jsx/DriverOrders.jsx) rather than
    // relying on a socket push that doesn't exist for offers.
    refetchInterval: 15_000,
    ...options,
  })
}

export function useMyBookings({ status, role = 'rider' } = {}, options = {}) {
  const query = new URLSearchParams({ role, ...(status ? { status } : {}) })
  return useQuery({
    queryKey: ['bookings', role, status],
    queryFn: () => api.get(`/bookings?${query.toString()}`),
    ...options,
  })
}

export function useRecentTrips(limit = 3) {
  const { data: bookings = [], ...rest } = useMyBookings({})
  return { data: bookings.slice(0, limit).map(bookingToHistoryItem), ...rest }
}

const round4 = (n) => Math.round(n * 1e4) / 1e4

/** The server's suggested fare range for this trip and party (POST /bot-orders/estimate). */
export function useFareEstimate({ from, to, routeKm, passengers, wholeCar, enabled = true }) {
  const ready = Number.isFinite(from?.lat) && Number.isFinite(to?.lat)
  const body = ready
    ? {
        from: { lat: round4(from.lat), lng: round4(from.lng) },
        to: { lat: round4(to.lat), lng: round4(to.lng) },
        routeKm: routeKm ? Math.round(routeKm * 10) / 10 : undefined,
        passengers: Number(passengers) || 1,
        wholeCar: wholeCar || undefined,
      }
    : null
  return useQuery({
    queryKey: ['fare-estimate', body],
    queryFn: () => api.post('/bot-orders/estimate', body),
    enabled: enabled && ready,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
