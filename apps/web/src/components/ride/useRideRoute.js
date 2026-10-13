import { useEffect, useMemo, useState } from 'react'
import { findCity } from '../../data/uzCities'
import { formatPlace } from '../../data/uzbekistan'
import { geocodeUz } from '../../lib/geocode'
import { fetchDrivingRoute } from '../../lib/geo'

export function isPoint(p) {
  return Number.isFinite(p?.lat) && Number.isFinite(p?.lng)
}

/** Coordinates if we have them, otherwise the place name geocoded (then the city table). */
function useResolvedPoint(lat, lng, region, place) {
  const given = Number.isFinite(lat) && Number.isFinite(lng)
  const query = given || !region ? '' : formatPlace(region, place)
  // Kept with the query it answers, so a stale answer is never shown for a new place.
  const [resolved, setResolved] = useState({ query: '', point: null })

  useEffect(() => {
    if (!query) return undefined
    let cancelled = false
    geocodeUz(query).then((hit) => {
      if (cancelled) return
      const city = hit ? null : findCity(place) || findCity(region)
      setResolved({ query, point: hit || (city ? { lat: city.lat, lng: city.lng } : null) })
    })
    return () => {
      cancelled = true
    }
  }, [query, region, place])

  const point = resolved.query === query ? resolved.point : null
  return useMemo(() => (given ? { lat, lng } : point), [given, lat, lng, point])
}

/**
 * Both ends of a trip plus the driving route between them. `route` is null until the router
 * answers (or when it can't) — callers then fall back to a straight line and no distance.
 */
export function useRideRoute({ fromLat, fromLng, fromRegion, fromPlace, toLat, toLng, toRegion, toPlace }) {
  const from = useResolvedPoint(fromLat, fromLng, fromRegion, fromPlace)
  const to = useResolvedPoint(toLat, toLng, toRegion, toPlace)
  const [routed, setRouted] = useState({ key: '', route: null })
  const key = isPoint(from) && isPoint(to) ? `${from.lat},${from.lng};${to.lat},${to.lng}` : ''

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    fetchDrivingRoute(from, to)
      .then((route) => {
        if (!cancelled) setRouted({ key, route })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // `key` already encodes both points.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { from, to, route: routed.key === key ? routed.route : null }
}
