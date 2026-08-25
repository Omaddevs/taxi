import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, LoaderCircle, LocateFixed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DEFAULT_LOCATION } from '../../lib/geocode'
import { googleMapsUrl } from '../../lib/geo'
import { GeoAskSheet, useMapGeo } from '../location/GeoAskSheet'
import { useShare } from '../ui/ShareSheet'
import 'leaflet/dist/leaflet.css'

function MapReady({ origin, selected }) {
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
    if (selected) return
    map.flyTo([origin.lat, origin.lng], map.getZoom() < 13 ? 14 : map.getZoom(), { duration: 0.7 })
  }, [origin.lat, origin.lng, map, selected])
  useEffect(() => {
    if (!selected) return
    map.invalidateSize()
    map.flyTo([selected.lat, selected.lng], 16, { duration: 0.5 })
  }, [selected, map])
  return null
}

export function pinIcon(color, label, selected) {
  const size = selected ? 34 : 26
  const safe = String(label || '').replace(/</g, '')
  return L.divIcon({
    className: 'fuel-marker',
    iconSize: [88, size + 20],
    iconAnchor: [44, size],
    html: `<span class="place-pin-wrap"><span class="fuel-marker-pin" style="--pin:${color};--sz:${size}px"></span><span class="place-pin-label">${safe}</span></span>`,
  })
}

export function PlacesMap({
  title,
  hint,
  filters,
  items,
  filterMatch,
  pinColor,
  mapLabel,
  legend,
  listMeta,
  renderDetail,
  hideList = false,
  onBack,
}) {
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

  const all = useMemo(() => items(origin), [items, origin])
  const shown = useMemo(() => {
    if (filter === 'all') return all
    return all.filter((p) => filterMatch(p, filter))
  }, [all, filter, filterMatch])

  const onShare = (place) =>
    share({
      title: place.name,
      text: `${place.name}\n${place.address || ''}\n${googleMapsUrl(place.lat, place.lng)}`,
      url: googleMapsUrl(place.lat, place.lng),
    })

  return (
    <div className="flex h-[calc(100svh-4rem)] flex-col bg-white lg:h-[calc(100svh-6rem)]">
      <header className="relative z-20 flex items-center gap-2 border-b border-line bg-white px-3 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-extrabold">{title}</h1>
          <p className="truncate text-[11px] text-muted">{hint}</p>
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
          Geolokatsiya yoqilmadi. Yaqinlar aniq chiqishi uchun bosing — ruxsat so‘raladi.
        </button>
      ) : null}

      {filters?.length ? (
        <div className="no-scrollbar z-20 flex gap-2 overflow-x-auto border-b border-line bg-white px-3 py-2">
          {filters.map((t) => (
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
      ) : null}

      <div className="relative min-h-[320px] flex-1">
        <MapContainer
          center={[origin.lat, origin.lng]}
          zoom={14}
          className="h-full min-h-[320px] w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapReady origin={origin} selected={selected} />
          <Marker
            position={[origin.lat, origin.lng]}
            icon={L.divIcon({
              className: 'fuel-user',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
              html: '<span class="fuel-user-dot"></span>',
            })}
          />
          {shown.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={pinIcon(pinColor(p), mapLabel(p), selected?.id === p.id)}
              eventHandlers={{ click: () => setSelected(p) }}
            />
          ))}
        </MapContainer>
        {legend?.length ? (
          <div className="absolute right-3 top-3 rounded-2xl bg-white/95 px-2.5 py-2 text-[10px] font-bold shadow-md">
            {legend.map((row) => (
              <p key={row.label} className="mt-1 flex items-center gap-1.5 first:mt-0">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} /> {row.label}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {!selected && !hideList ? (
        <div className="z-20 max-h-44 overflow-y-auto border-t border-line bg-white pb-2">
          {shown.slice(0, 6).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-canvas"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: pinColor(p) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{p.name}</span>
                <span className="text-[11px] text-muted">
                  {p.km.toFixed(1)} km{listMeta ? ` · ${listMeta(p)}` : ''}
                </span>
              </span>
              <span className="text-[11px] font-extrabold text-brand">{mapLabel(p)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selected
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={() => setSelected(null)} />
              <div className="absolute inset-x-0 bottom-0 z-10 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(28,28,40,0.28)]">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                {renderDetail(selected, {
                  onClose: () => setSelected(null),
                  onShare: () => onShare(selected),
                })}
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
