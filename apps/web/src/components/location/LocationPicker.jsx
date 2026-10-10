import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Circle, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { meLocationIcon } from '../../lib/meMarker'
import { ArrowLeft, LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { extractCity, formatAddress, reverseGeocode, searchPlaces } from '../../lib/geocode'
import { BaseTiles } from '../map/BaseTiles'
import { GeoAskSheet, useMapGeo } from './GeoAskSheet'
import 'leaflet/dist/leaflet.css'
import { lockScroll } from '../../lib/scrollLock'

function MapController({ focus, onDragging, onIdle }) {
  const map = useMap()

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => map.invalidateSize(), 280)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])

  useEffect(() => {
    if (!focus) return
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 17), { duration: 0.85 })
  }, [focus, map])

  useMapEvents({
    movestart: () => onDragging(true),
    dragstart: () => onDragging(true),
    moveend: () => {
      onDragging(false)
      const c = map.getCenter()
      onIdle(c.lat, c.lng)
    },
  })

  return null
}

const ME_ICON = meLocationIcon()

function GpsLayer({ gps }) {
  if (!gps?.lat || !gps?.lng) return null
  const radius = Math.min(Math.max(gps.accuracy || 40, 22), 160)
  return (
    <>
      <Circle
        center={[gps.lat, gps.lng]}
        radius={radius}
        pathOptions={{ color: '#00c7d4', fillColor: '#00c7d4', fillOpacity: 0.14, weight: 1 }}
      />
      <Marker position={[gps.lat, gps.lng]} icon={ME_ICON} interactive={false} />
    </>
  )
}

export function LocationPicker() {
  const {
    location,
    setLocation,
    locationPickerOpen,
    locationPickerRequest,
    closeLocationPicker,
    gpsFix,
    gpsStatus,
    requestUserLocation,
  } = useApp()
  const geo = useMapGeo(locationPickerOpen)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hint, setHint] = useState('')
  const [draft, setDraft] = useState(location)
  const [focus, setFocus] = useState(null)
  const geoTimer = useRef(0)
  const searchTimer = useRef(0)
  const lastGpsAt = useRef(0)

  useEffect(() => {
    if (!locationPickerOpen) return
    const start = locationPickerRequest?.initial || location
    setDraft(start)
    setQuery('')
    setResults([])
    setHint('')
    setFocus({ lat: start.lat, lng: start.lng, key: Date.now() })
    return lockScroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationPickerOpen])

  useEffect(() => {
    if (!locationPickerOpen || !gpsFix?.at || gpsFix.at === lastGpsAt.current) return
    lastGpsAt.current = gpsFix.at
    if (gpsFix.error) {
      setHint(
        gpsStatus === 'denied'
          ? 'Joylashuvga ruxsat berilmadi. Xaritadan o‘zingiz belgilang.'
          : gpsStatus === 'unsupported'
            ? 'Brauzer geolokatsiyani qo‘llab-quvvatlamaydi. Xaritadan tanlang.'
            : 'Joylashuv olinmadi. Xaritadan tanlang yoki qayta urinib ko‘ring.',
      )
      return
    }
    if (typeof gpsFix.lat !== 'number') return
    setHint('')
    setFocus({ lat: gpsFix.lat, lng: gpsFix.lng, key: gpsFix.at })
    lookup(gpsFix.lat, gpsFix.lng)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsFix, gpsStatus, locationPickerOpen])

  useEffect(() => {
    if (!locationPickerOpen) return
    clearTimeout(searchTimer.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchPlaces(query))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 320)
    return () => clearTimeout(searchTimer.current)
  }, [query, locationPickerOpen])

  function lookup(lat, lng) {
    clearTimeout(geoTimer.current)
    setGeocoding(true)
    geoTimer.current = setTimeout(async () => {
      try {
        const data = await reverseGeocode(lat, lng)
        setDraft({
          label: formatAddress(data),
          lat,
          lng,
          city: extractCity(data),
          state: data?.address?.state,
        })
        setHint((prev) => (gpsStatus === 'denied' ? prev : ''))
      } catch {
        setDraft((prev) => ({ ...prev, lat, lng, label: 'Tanlangan nuqta' }))
      } finally {
        setGeocoding(false)
      }
    }, 380)
  }

  function pickResult(item) {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    setQuery('')
    setResults([])
    setFocus({ lat, lng, key: Date.now() })
    setDraft({
      label: formatAddress(item),
      lat,
      lng,
      city: extractCity(item),
      state: item?.address?.state,
    })
  }

  function confirm() {
    if (locationPickerRequest) locationPickerRequest.onPick(draft)
    else setLocation(draft)
    closeLocationPicker()
  }

  if (!locationPickerOpen) return null

  const gpsOk = gpsFix && !gpsFix.error && typeof gpsFix.lat === 'number'

  return createPortal(
    <div className="fixed inset-0 z-[140] flex flex-col bg-white">
      <header className="relative z-20 flex items-center gap-2 bg-white px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))] shadow-sm">
        <button
          type="button"
          onClick={closeLocationPicker}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Manzil, ko‘cha yoki joy qidiring"
            className="h-11 w-full rounded-2xl bg-canvas pl-9 pr-9 text-sm font-medium outline-none ring-brand/20 focus:bg-white focus:ring-2"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      {results.length > 0 ? (
        <div className="relative z-30 max-h-56 overflow-y-auto border-b border-line bg-white">
          {results.map((item) => (
            <button
              key={item.place_id}
              type="button"
              onClick={() => pickResult(item)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{formatAddress(item)}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{item.display_name}</span>
              </span>
            </button>
          ))}
        </div>
      ) : searching ? (
        <p className="relative z-30 bg-white px-4 py-2 text-xs text-muted">Qidirilmoqda…</p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <MapContainer
          center={[draft.lat, draft.lng]}
          zoom={16}
          maxZoom={19}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <BaseTiles />
          <GpsLayer gps={gpsOk ? gpsFix : null} />
          <MapController focus={focus} onDragging={setDragging} onIdle={lookup} />
        </MapContainer>

        <div className="pointer-events-none absolute left-1/2 top-[46%] z-[400] -translate-x-1/2 -translate-y-full">
          <div className={`flex flex-col items-center transition-transform duration-200 ${dragging ? '-translate-y-2' : ''}`}>
            <span className="location-pin" />
            <span className={`location-pin-shadow ${dragging ? 'scale-75 opacity-40' : ''}`} />
          </div>
        </div>

        {gpsStatus === 'pending' ? (
          <div className="absolute left-3 right-16 top-3 z-[420] rounded-2xl bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-black/5">
            <p className="text-sm font-extrabold">Joylashuvga ruxsat bering</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">
              Brauzer so‘rovini tasdiqlang — igna hozirgi joyingizga tushadi.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (gpsStatus === 'granted') requestUserLocation()
            else geo.reopen()
          }}
          className="absolute right-4 top-4 z-[410] flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-md"
          aria-label="Mening joyim"
        >
          {gpsStatus === 'pending' ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
          ) : (
            <LocateFixed className={`h-5 w-5 ${gpsStatus === 'granted' ? 'text-brand' : ''}`} />
          )}
        </button>

        <p className="pointer-events-none absolute bottom-3 left-3 z-[410] rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-muted">
          OpenStreetMap
        </p>
      </div>

      <div className="z-20 border-t border-line bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {hint ? (
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-xs text-amber-700">{hint}</p>
            {gpsStatus === 'denied' || gpsStatus === 'error' ? (
              <button type="button" onClick={geo.reopen} className="shrink-0 text-xs font-bold text-brand">
                Qayta so‘rash
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {locationPickerRequest?.title || 'Joriy manzil'}
        </p>
        <p className="mt-1 flex items-center gap-2 text-[17px] font-extrabold leading-snug">
          {geocoding || dragging ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-brand" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0 text-brand" />
          )}
          <span className="min-w-0">{dragging ? 'Belgilash…' : draft.label}</span>
        </p>
        <p className="mt-1 text-[11px] text-muted">Xaritani siljiting — igna yetib olish nuqtasini belgilaydi.</p>
        <button
          type="button"
          onClick={confirm}
          disabled={geocoding || dragging}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
        >
          Shu yerni tasdiqlash
        </button>
      </div>
      <GeoAskSheet open={locationPickerOpen && geo.open} status={geo.status} onAllow={geo.allow} onSkip={geo.skip} />
    </div>,
    document.body,
  )
}
