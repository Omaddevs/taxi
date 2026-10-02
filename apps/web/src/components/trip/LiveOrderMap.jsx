import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { BaseTiles } from '../map/BaseTiles'
import { geocodeUz } from '../../lib/geocode'
import { fetchDrivingRoute } from '../../lib/geo'
import { findCity } from '../../data/uzCities'
import { RouteMap } from './RouteMap'
import 'leaflet/dist/leaflet.css'

export function pinIcon(color, label, size = 30) {
  const safe = String(label || '').replace(/</g, '')
  return L.divIcon({
    className: 'fuel-marker',
    iconSize: [96, size + 22],
    iconAnchor: [48, size],
    html: `<span class="place-pin-wrap"><span class="fuel-marker-pin" style="--pin:${color};--sz:${size}px"></span><span class="place-pin-label">${safe}</span></span>`,
  })
}

export function driverDotIcon() {
  return L.divIcon({
    className: 'fuel-user',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: '<span class="fuel-user-dot"></span>',
  })
}

function FitBounds({ points, fitKey }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36] })
    else if (points.length === 1) map.setView(points[0], 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map])
  return null
}

function FollowDriver({ driverPos, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !driverPos) return
    map.panTo([driverPos.lat, driverPos.lng], { animate: true, duration: 0.6 })
  }, [enabled, driverPos?.lat, driverPos?.lng, map])
  return null
}

function useResolvedPoint(lat, lng, query) {
  const given = typeof lat === 'number' && typeof lng === 'number'
  const [point, setPoint] = useState(given ? { lat, lng } : null)

  useEffect(() => {
    if (given) {
      setPoint({ lat, lng })
      return undefined
    }
    const q = String(query || '').trim()
    if (!q) {
      setPoint(null)
      return undefined
    }
    let cancelled = false
    geocodeUz(q).then((hit) => {
      if (cancelled) return
      if (hit) {
        setPoint(hit)
        return
      }
      const city = findCity(q)
      setPoint(city ? { lat: city.lat, lng: city.lng } : null)
    })
    return () => {
      cancelled = true
    }
  }, [given, lat, lng, query])

  return point
}

export function LiveOrderMap({ order, driverPos, className = '', interactive = false, followDriver = false }) {
  const hasPickup = typeof order?.pickupLat === 'number' && typeof order?.pickupLng === 'number'
  const pickup = useResolvedPoint(
    hasPickup ? order.pickupLat : undefined,
    hasPickup ? order.pickupLng : undefined,
    [order?.fromHint, order?.from].filter(Boolean).join(', '),
  )
  const dest = useResolvedPoint(undefined, undefined, [order?.toHint, order?.to].filter(Boolean).join(', '))
  const [route, setRoute] = useState(null)

  const driverKey = driverPos ? `${driverPos.lat.toFixed(3)},${driverPos.lng.toFixed(3)}` : ''
  const pickupKey = pickup ? `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}` : ''
  const destKey = dest ? `${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}` : ''

  useEffect(() => {
    const from = driverPos || pickup
    const to = driverPos && pickup ? pickup : dest
    if (!from || !to) {
      setRoute(null)
      return undefined
    }
    if (Math.abs(from.lat - to.lat) < 0.0002 && Math.abs(from.lng - to.lng) < 0.0002) {
      setRoute(null)
      return undefined
    }
    let cancelled = false
    fetchDrivingRoute(from, to).then((next) => {
      if (!cancelled) setRoute(next)
    })
    return () => {
      cancelled = true
    }
  }, [driverKey, pickupKey, destKey, driverPos, pickup, dest])

  const points = useMemo(() => {
    const pts = []
    if (driverPos) pts.push([driverPos.lat, driverPos.lng])
    if (pickup) pts.push([pickup.lat, pickup.lng])
    if (dest) pts.push([dest.lat, dest.lng])
    return pts
  }, [driverPos, pickup, dest])

  if (!pickup && !driverPos) {
    return <RouteMap className={className} from={order?.from} to={order?.to} />
  }

  const center = points[0] || [pickup.lat, pickup.lng]

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#eef3f0] ${className}`}>
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full"
        zoomControl={interactive}
        attributionControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={false}
      >
        <BaseTiles />
        <FitBounds points={route?.points || points} fitKey={`${order?.id}|${pickupKey}|${route ? 1 : 0}`} />
        {followDriver ? <FollowDriver driverPos={driverPos} enabled={Boolean(driverPos)} /> : null}
        {route?.points?.length ? (
          <>
            <Polyline positions={route.points} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
            <Polyline positions={route.points} pathOptions={{ color: '#12a594', weight: 4 }} />
          </>
        ) : null}
        {driverPos ? <Marker position={[driverPos.lat, driverPos.lng]} icon={driverDotIcon()} /> : null}
        {pickup ? <Marker position={[pickup.lat, pickup.lng]} icon={pinIcon('#12a594', 'Mijoz', 26)} /> : null}
        {dest ? <Marker position={[dest.lat, dest.lng]} icon={pinIcon('#1c1c28', 'Manzil', 26)} /> : null}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Jonli xarita
      </div>
    </div>
  )
}
