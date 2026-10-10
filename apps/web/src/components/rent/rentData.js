import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { haversineKm } from '../../lib/geo'
import { DEFAULT_LOCATION } from '../../lib/geocode'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

// ---------------------------------------------------------------------------------------------
// URL state — every screen of the market lives in the query string, so the phone's back button
// steps back through it and a link like /?ijara=1&elon=<id> opens straight on a listing.
// ---------------------------------------------------------------------------------------------

export const RENT_PARAMS = ['ijara', 'elon', 'tahrir']

export function useRentNav() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const go = useCallback(
    (next, { replace = false } = {}) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          for (const key of RENT_PARAMS) p.delete(key)
          for (const [k, v] of Object.entries(next)) if (v) p.set(k, v)
          return p
        },
        { replace },
      )
    },
    [setParams],
  )

  // Step back inside the app when there is history to step through; otherwise land on `fallback`.
  const back = useCallback(
    (fallback) => {
      if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
      else go(fallback, { replace: true })
    },
    [navigate, go],
  )

  return {
    view: params.get('ijara'),
    listingId: params.get('elon'),
    editId: params.get('tahrir'),
    go,
    back,
    close: () => go({}, { replace: true }),
  }
}

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

export function useRentals() {
  return useQuery({ queryKey: ['rentals'], queryFn: () => api.get('/rentals'), staleTime: 30_000 })
}

export function useRental(id) {
  return useQuery({ queryKey: ['rentals', id], queryFn: () => api.get(`/rentals/${id}`), enabled: Boolean(id) })
}

export function useMyRentals() {
  return useQuery({ queryKey: ['rentals-mine'], queryFn: () => api.get('/rentals/mine') })
}

/** Where distances are measured from: GPS fix, then the chosen city point, then Toshkent. */
export function useOrigin() {
  const { location, gpsFix } = useApp()
  return useMemo(() => {
    if (gpsFix && !gpsFix.error && typeof gpsFix.lat === 'number') return { lat: gpsFix.lat, lng: gpsFix.lng }
    if (location?.lat) return { lat: location.lat, lng: location.lng }
    return DEFAULT_LOCATION
  }, [gpsFix, location])
}

export function distanceKm(origin, listing) {
  if (listing?.lat == null || listing?.lng == null) return Number.NaN
  return haversineKm(origin, listing)
}

export function formatKm(km) {
  if (!Number.isFinite(km)) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// Saved listings stay on this device only — no account round-trip for a heart tap.
const FAV_KEY = 'rent:favs'

function readFavs() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function useRentFavorites() {
  const [ids, setIds] = useState(readFavs)
  const toggle = useCallback((id) => {
    setIds((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(next))
      } catch {
        // Private mode / storage full — the heart still works for this session.
      }
      return next
    })
  }, [])
  return { ids, has: (id) => ids.includes(id), toggle }
}

// ---------------------------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------------------------

export function som(n) {
  return new Intl.NumberFormat('uz-UZ').format(n || 0).replace(/,/g, ' ')
}

/** The headline price of a listing: per day if set, else per hour, else per week. */
export function mainPrice(l) {
  if (l.pricePerDay) return { amount: l.pricePerDay, unit: 'kun' }
  if (l.pricePerHour) return { amount: l.pricePerHour, unit: 'soat' }
  if (l.pricePerWeek) return { amount: l.pricePerWeek, unit: 'hafta' }
  return null
}

/** Comparable price for "Arzon" sorting — everything brought to a per-day figure. */
export function dailyPrice(l) {
  if (l.pricePerDay) return l.pricePerDay
  if (l.pricePerHour) return l.pricePerHour * 8
  if (l.pricePerWeek) return Math.round(l.pricePerWeek / 7)
  return Number.POSITIVE_INFINITY
}

export function ownerName(l) {
  if (l.ownerType === 'COMPANY') return l.companyName || t('Tashkilot')
  return l.contactName || t('Shaxsiy e’lon')
}
