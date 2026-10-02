import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { UZ_BOUNDS, findCity } from '../../data/uzCities'
import { haversineKm } from '../../lib/geo'
import { BaseTiles } from '../map/BaseTiles'
import 'leaflet/dist/leaflet.css'

function cityPin(color, label) {
  return L.divIcon({
    className: 'fuel-marker',
    iconSize: [96, 48],
    iconAnchor: [48, 28],
    html: `<span class="place-pin-wrap"><span class="fuel-marker-pin" style="--pin:${color};--sz:26px"></span><span class="place-pin-label">${String(
      label || '',
    ).replace(/</g, '')}</span></span>`,
  })
}

// Marshrut to‘g‘ri chiziq bo‘lmasin — ikki shahar orasiga yengil yoy chizamiz.
function arcPoints(a, b, steps = 48) {
  const midLat = (a.lat + b.lat) / 2
  const midLng = (a.lng + b.lng) / 2
  const dLat = b.lat - a.lat
  const dLng = b.lng - a.lng
  const ctrlLat = midLat + dLng * 0.12
  const ctrlLng = midLng - dLat * 0.12
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const k = (1 - t) ** 2
    const m = 2 * (1 - t) * t
    const n = t ** 2
    return [k * a.lat + m * ctrlLat + n * b.lat, k * a.lng + m * ctrlLng + n * b.lng]
  })
}

function FitRoute({ points }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (points?.length) map.fitBounds(points, { padding: [42, 42] })
    else map.fitBounds(UZ_BOUNDS, { padding: [12, 12] })
  }, [points, map])
  return null
}

export function RouteMap({ from = 'Qarshi', to = 'Toshkent', className = '' }) {
  const origin = useMemo(() => findCity(from), [from])
  const target = useMemo(() => findCity(to), [to])
  const line = useMemo(() => (origin && target ? arcPoints(origin, target) : null), [origin, target])
  const km = origin && target ? Math.round(haversineKm(origin, target)) : null

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#eef3f0] ${className}`}>
      <MapContainer
        bounds={line || UZ_BOUNDS}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <BaseTiles />
        <FitRoute points={line} />
        {line ? (
          <>
            <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={line} pathOptions={{ color: '#12a594', weight: 5 }} />
            <Marker position={[origin.lat, origin.lng]} icon={cityPin('#12a594', origin.name)} />
            <Marker position={[target.lat, target.lng]} icon={cityPin('#1c1c28', target.name)} />
          </>
        ) : null}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold shadow-sm">
        <span className="h-2 w-2 rounded-full bg-brand" />
        {origin?.name || from}
        <span className="text-muted">→</span>
        <span className="h-2 w-2 rounded-full bg-ink" />
        {target?.name || to}
      </div>
      {km ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-white shadow-sm">
          ≈ {km} km
        </div>
      ) : null}
    </div>
  )
}

export function CarArt() {
  return (
    <svg viewBox="0 0 220 110" className="h-[92px] w-[180px] drop-shadow-md">
      <ellipse cx="110" cy="96" rx="70" ry="8" fill="rgba(255,255,255,0.25)" />
      <path d="M30 72 L48 48 C54 40 62 36 78 36 H142 C160 36 170 42 178 52 L196 72 V84 H30 Z" fill="#fff" />
      <path d="M70 38 C78 26 90 20 110 20 C132 20 146 28 152 38" fill="#f8bbd0" />
      <rect x="78" y="40" width="28" height="16" rx="3" fill="#e3f6f3" />
      <rect x="112" y="40" width="28" height="16" rx="3" fill="#e3f6f3" />
      <circle cx="62" cy="84" r="12" fill="#1c1c28" />
      <circle cx="62" cy="84" r="6" fill="#d1d5db" />
      <circle cx="164" cy="84" r="12" fill="#1c1c28" />
      <circle cx="164" cy="84" r="6" fill="#d1d5db" />
      <rect x="100" y="68" width="18" height="6" rx="2" fill="#12a594" />
    </svg>
  )
}
