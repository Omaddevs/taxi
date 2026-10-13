import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BaseTiles } from '../map/BaseTiles'
import { UZ_BOUNDS } from '../../data/uzCities'
import { isPoint } from './useRideRoute'

// lucide "person-standing" and "flag", inlined: Leaflet divIcons are plain HTML strings.
const PERSON_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>'
const FLAG_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>'

const PIN_W = 38
const PIN_H = 58

function ridePin(color, svg) {
  return L.divIcon({
    className: 'ride-marker',
    iconSize: [PIN_W, PIN_H],
    iconAnchor: [PIN_W / 2, PIN_H - 4],
    html: `<span class="ride-pin" style="--pin:${color}"><span class="ride-pin-badge">${svg}</span><span class="ride-pin-stem"></span><span class="ride-pin-foot"></span></span>`,
  })
}

const INK = '#1a2b3c'

function FitRoute({ points, padding }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(timer)
  }, [map])
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { paddingTopLeft: padding.topLeft, paddingBottomRight: padding.bottomRight })
    else if (points.length === 1) map.setView(points[0], 13)
    else map.fitBounds(UZ_BOUNDS, { padding: [12, 12] })
  }, [points, padding, map])
  return null
}

const DEFAULT_PADDING = { topLeft: [48, 72], bottomRight: [48, 56] }

/** The trip on a map: pickup badge, destination flag, and the road between them. */
export function RideRouteMap({ from, to, route, accent = '#00c7d4', className = '', interactive = true, padding = DEFAULT_PADDING }) {
  const line = useMemo(() => {
    if (route?.points?.length) return route.points
    return isPoint(from) && isPoint(to) ? [[from.lat, from.lng], [to.lat, to.lng]] : null
  }, [route, from, to])
  const fitPoints = useMemo(
    () => line || [from, to].filter(isPoint).map((p) => [p.lat, p.lng]),
    [line, from, to],
  )
  const fromIcon = useMemo(() => ridePin(accent, PERSON_SVG), [accent])
  const toIcon = useMemo(() => ridePin(INK, FLAG_SVG), [])

  return (
    <div className={`isolate overflow-hidden bg-[#eef3f0] ${className}`}>
      <MapContainer
        bounds={UZ_BOUNDS}
        className="home-map h-full w-full"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={false}
      >
        <BaseTiles />
        <FitRoute points={fitPoints} padding={padding} />
        {line ? (
          <>
            <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={line} pathOptions={{ color: accent, weight: 5, dashArray: route ? null : '2 10' }} />
          </>
        ) : null}
        {isPoint(from) ? <Marker position={[from.lat, from.lng]} icon={fromIcon} interactive={false} /> : null}
        {isPoint(to) ? <Marker position={[to.lat, to.lng]} icon={toIcon} interactive={false} zIndexOffset={100} /> : null}
      </MapContainer>
    </div>
  )
}
