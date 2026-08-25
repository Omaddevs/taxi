import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ArrowLeft,
  Clock,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Share2,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEFAULT_LOCATION } from '../lib/geocode'
import { formatSom } from '../lib/utils'
import { GeoAskSheet, useMapGeo } from '../components/location/GeoAskSheet'
import { useShare } from '../components/ui/ShareSheet'
import {
  FUEL_TYPES,
  PRICE_LABELS,
  googleMapsUrl,
  shareText,
  stationsAround,
  yandexMapsUrl,
} from '../data/fuel'
import 'leaflet/dist/leaflet.css'

function pinIcon(near, selected) {
  const color = near ? '#16a34a' : '#e91e63'
  const size = selected ? 36 : 28
  return L.divIcon({
    className: 'fuel-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<span class="fuel-marker-pin" style="--pin:${color};--sz:${size}px"></span>`,
  })
}

function MapReady({ center, selected }) {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 60)
    const t2 = setTimeout(() => map.invalidateSize(), 280)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map])
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom() < 13 ? 14 : map.getZoom(), { duration: 0.7 })
  }, [center.lat, center.lng, map])
  useEffect(() => {
    if (!selected) return
    map.flyTo([selected.lat, selected.lng], 16, { duration: 0.55 })
  }, [selected, map])
  return null
}


export default function Fuel() {
  const navigate = useNavigate()
  const { location, gpsFix, gpsStatus, requestUserLocation } = useApp()
  const geo = useMapGeo()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const { share, sheet } = useShare()

  const origin = useMemo(() => {
    if (gpsFix && !gpsFix.error && typeof gpsFix.lat === 'number') {
      return { lat: gpsFix.lat, lng: gpsFix.lng }
    }
    if (location?.lat) return { lat: location.lat, lng: location.lng }
    return DEFAULT_LOCATION
  }, [gpsFix, location])

  const stations = useMemo(() => {
    const all = stationsAround(origin)
    if (filter === 'all') return all
    return all.filter((s) => s.types.includes(filter))
  }, [origin, filter])

  const center = selected || origin

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col bg-white lg:h-[calc(100svh-6rem)]">
      <header className="relative z-20 flex items-center gap-2 border-b border-line bg-white px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold">Yoqilg‘i shahobchalari</h1>
          <p className="truncate text-[11px] text-muted">Yaqini yashil · uzoqrog‘i pushti</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (gpsStatus === 'granted') requestUserLocation()
            else geo.reopen()
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"
          aria-label="Mening joyim"
        >
          {gpsStatus === 'pending' ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
          ) : (
            <LocateFixed className={`h-5 w-5 ${gpsStatus === 'granted' ? 'text-brand' : ''}`} />
          )}
        </button>
      </header>

      {gpsStatus === 'pending' && !geo.open ? (
        <p className="bg-brand-soft px-4 py-2 text-xs font-semibold text-brand">Joylashuv aniqlanmoqda…</p>
      ) : gpsStatus === 'denied' || gpsStatus === 'error' || gpsStatus === 'timeout' || gpsStatus === 'unsupported' ? (
        <button type="button" onClick={geo.reopen} className="w-full bg-amber-50 px-4 py-2 text-left text-xs font-semibold text-amber-800">
          Geolokatsiya yoqilmadi. Yaqin shahobchalar uchun bosing — ruxsat so‘raladi.
        </button>
      ) : null}

      <div className="no-scrollbar z-20 flex gap-2 overflow-x-auto border-b border-line bg-white px-3 py-2">
        {FUEL_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setFilter(t.id)
              setSelected(null)
            }}
            className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-bold ${
              filter === t.id ? 'bg-brand text-white' : 'bg-canvas text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative min-h-[320px] flex-1">
        <MapContainer center={[origin.lat, origin.lng]} zoom={14} className="h-full min-h-[320px] w-full" zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapReady center={center} selected={selected} />
          <Marker
            position={[origin.lat, origin.lng]}
            icon={L.divIcon({
              className: 'fuel-user',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<span class="fuel-user-dot"></span>',
            })}
          />
          {stations.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={pinIcon(s.near, selected?.id === s.id)}
              eventHandlers={{ click: () => setSelected(s) }}
            />
          ))}
        </MapContainer>
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/85 px-2 py-0.5 text-[10px] text-muted">
          OpenStreetMap · CARTO
        </p>
        <div className="absolute right-3 top-3 rounded-2xl bg-white/95 px-2.5 py-2 text-[10px] font-bold shadow-md">
          <p className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> Yaqin
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Uzoqroq
          </p>
        </div>
      </div>

      {selected
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={() => setSelected(null)} />
              <div className="absolute inset-x-0 bottom-0 z-10 max-h-[82vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.28)]">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                <DetailBody
                  station={selected}
                  onClose={() => setSelected(null)}
                  onShare={() =>
                    share({
                      title: selected.name,
                      text: shareText(selected),
                      url: googleMapsUrl(selected.lat, selected.lng),
                    })
                  }
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      {sheet}

      <GeoAskSheet open={geo.open} status={geo.status} onAllow={geo.allow} onSkip={geo.skip} />
    </div>
  )
}

function DetailBody({ station, onClose, onShare }) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold leading-tight">{station.name}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            {station.address}
          </p>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas" aria-label="Yopish">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {station.types.map((t) => (
          <span key={t} className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
            {FUEL_TYPES.find((x) => x.id === t)?.label}
          </span>
        ))}
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${station.open ? 'bg-emerald-50 text-success' : 'bg-slate-100 text-muted'}`}>
          {station.open ? 'Ochiq' : 'Yopiq'}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${station.near ? 'bg-emerald-50 text-success' : 'bg-brand-soft text-brand'}`}>
          {station.km.toFixed(1)} km
        </span>
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-muted">
        <Clock className="h-4 w-4" /> {station.hours}
        <a href={`tel:${station.phone.replace(/\s/g, '')}`} className="ml-auto flex items-center gap-1 font-bold text-ink">
          <Phone className="h-3.5 w-3.5 text-brand" /> {station.phone}
        </a>
      </p>

      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Narxlar</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(station.prices).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-canvas px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted">{PRICE_LABELS[key] || key}</p>
            <p className="text-[15px] font-extrabold text-ink">
              {formatSom(value)}
              {key === 'kwh' ? <span className="text-[11px] font-semibold text-muted"> / kWh</span> : null}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href={yandexMapsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-center text-[11px] font-extrabold leading-tight"
        >
          Yandex
        </a>
        <a
          href={googleMapsUrl(station.lat, station.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-center text-[11px] font-extrabold leading-tight"
        >
          Google
        </a>
        <button
          type="button"
          onClick={onShare}
          className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-canvas text-[11px] font-extrabold"
        >
          <Share2 className="h-3.5 w-3.5" /> Ulashish
        </button>
      </div>
      <a
        href={googleMapsUrl(station.lat, station.lng)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white"
      >
        <Navigation className="h-4 w-4" /> Yo‘nalish olish
      </a>
    </div>
  )
}
