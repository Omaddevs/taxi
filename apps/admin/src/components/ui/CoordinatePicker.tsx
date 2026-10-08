import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from './Button'
import { inputClass } from './Chart'
import { DEFAULT_CENTER, parseCoordinates } from '../../lib/mapPlaces'
import { pinIcon } from '../../lib/mapPin'

export function Tiles() {
  return <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FollowPoint({ point }: { point: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    // The modal mounts the map before its box has its final size.
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(t)
  }, [map])
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), 15))
  }, [point, map])
  return null
}

function round(n: number) {
  return Math.round(n * 1e6) / 1e6
}

/**
 * Pick a point three ways: click/drag on the map, paste a Google/Yandex link, or type lat/lng.
 * Mount it with a `key` per edited record — the text inputs are seeded from `value` once.
 */
export function CoordinatePicker({
  value,
  onChange,
  color,
}: {
  value: [number, number] | null
  onChange: (point: [number, number] | null) => void
  color: string
}) {
  const [latText, setLatText] = useState(value ? String(value[0]) : '')
  const [lngText, setLngText] = useState(value ? String(value[1]) : '')
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState('')

  function setCoords(lat: number, lng: number) {
    const next: [number, number] = [round(lat), round(lng)]
    onChange(next)
    setLatText(String(next[0]))
    setLngText(String(next[1]))
  }

  function onCoordInput(which: 'lat' | 'lng', text: string) {
    if (which === 'lat') setLatText(text)
    else setLngText(text)
    const lat = Number(which === 'lat' ? text : latText)
    const lng = Number(which === 'lng' ? text : lngText)
    if (text.trim() && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      onChange([lat, lng])
    }
  }

  function applyLink() {
    const coords = parseCoordinates(link)
    if (!coords) {
      setLinkError('Koordinata topilmadi. Google/Yandex xarita havolasini yoki "41.31, 69.27" ko‘rinishini kiriting.')
      return
    }
    setLinkError('')
    setLink('')
    setCoords(coords[0], coords[1])
  }

  return (
    <div className="space-y-2">
      <div className="isolate h-[260px] overflow-hidden rounded-xl border border-line">
        <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 16 : 12} className="h-full w-full" attributionControl={false}>
          <Tiles />
          <ClickToPick onPick={setCoords} />
          <FollowPoint point={value} />
          {value ? (
            <Marker
              position={value}
              draggable
              icon={pinIcon(color, true)}
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng()
                  setCoords(ll.lat, ll.lng)
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="flex gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyLink()
            }
          }}
          className={inputClass}
          placeholder="Google yoki Yandex xarita havolasi, yoki 41.3111, 69.2797"
        />
        <Button type="button" variant="outline" onClick={applyLink} disabled={!link.trim()}>
          Qo‘llash
        </Button>
      </div>
      {linkError ? <p className="text-xs font-semibold text-red-500">{linkError}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <input value={latText} onChange={(e) => onCoordInput('lat', e.target.value)} className={inputClass} placeholder="Kenglik (lat)" inputMode="decimal" />
        <input value={lngText} onChange={(e) => onCoordInput('lng', e.target.value)} className={inputClass} placeholder="Uzunlik (lng)" inputMode="decimal" />
      </div>
    </div>
  )
}
