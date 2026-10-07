import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, LoaderCircle, MapPin, MapPinOff, Navigation } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DEFAULT_LOCATION } from '../../lib/geocode'
import { googleMapsUrl } from '../../lib/geo'
import { BaseTiles } from '../map/BaseTiles'
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

function formatKm(km) {
  if (!Number.isFinite(km)) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

const ROUND_BTN =
  'flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_rgba(16,42,67,0.14)]'

// Taxi xaritasi (pages/TaxiMap.jsx) bilan bir xil vizual til: to‘liq ekran xarita, tepada suzuvchi
// sarlavha va filtrlar, pastda orqaga/joylashuv tugmalari va eng yaqin joylar paneli.
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
  emptyText,
  art,
  onBack,
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { location, gpsFix, gpsStatus, requestUserLocation } = useApp()
  const geo = useMapGeo()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const { share, sheet } = useShare()
  // Haydovchi bo‘limida pastda doimiy nav paneli bor — xarita uning ustida tugashi kerak.
  const inDriver = pathname.startsWith('/driver')

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

  const goBack = () => {
    if (onBack) onBack()
    else if (window.history.length > 1) navigate(-1)
    else navigate(inDriver ? '/driver' : '/')
  }

  const locate = () => {
    if (gpsStatus === 'granted') requestUserLocation()
    else geo.reopen()
  }

  const gpsOff = ['denied', 'error', 'timeout', 'unsupported'].includes(gpsStatus)

  return (
    <div
      className={`relative isolate overflow-hidden bg-canvas lg:h-[calc(100svh-7rem)] lg:rounded-2xl ${
        inDriver ? 'h-[calc(100svh-4.5rem)]' : 'h-svh'
      }`}
    >
      <div className="absolute inset-0">
        <MapContainer
          center={[origin.lat, origin.lng]}
          zoom={14}
          className="home-map h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <BaseTiles />
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
      </div>

      {/* ── Tepa: sarlavha, geolokatsiya holati va filtrlar ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] space-y-2 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full bg-white/95 py-1.5 pl-1.5 pr-5 shadow-[0_6px_20px_rgba(16,42,67,0.12)] backdrop-blur">
            {art ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas">
                <img src={art} alt="" className="h-8 w-8 object-contain" />
              </span>
            ) : (
              <span className="ml-2.5 h-3 w-3 shrink-0 rounded-full bg-brand ring-4 ring-brand/20" />
            )}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[16px] font-extrabold text-ink">{title}</span>
              {hint ? <span className="block truncate text-[12px] text-muted">{hint}</span> : null}
            </span>
          </div>
        </div>

        {gpsStatus === 'pending' && !geo.open ? (
          <div className="flex justify-center px-4">
            <p className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[12px] font-semibold text-brand shadow-md">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Joylashuv aniqlanmoqda…
            </p>
          </div>
        ) : gpsOff ? (
          <div className="flex justify-center px-4">
            <button
              type="button"
              onClick={geo.reopen}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-left text-[12px] font-semibold text-amber-800 shadow-md"
            >
              <MapPinOff className="h-3.5 w-3.5 shrink-0" />
              Joylashuv o‘chiq — yaqinlarni ko‘rish uchun bosing
            </button>
          </div>
        ) : null}

        {filters?.length ? (
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto px-4 pb-2">
            {filters.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setFilter(t.id)
                  setSelected(null)
                }}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold shadow-[0_4px_14px_rgba(16,42,67,0.12)] transition ${
                  filter === t.id ? 'bg-ink text-white' : 'bg-white text-ink'
                }`}
              >
                {t.color ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} /> : null}
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        {legend?.length ? (
          <div className="flex justify-end px-4">
            <div className="rounded-2xl bg-white/95 px-2.5 py-2 text-[10px] font-bold shadow-md">
              {legend.map((row) => (
                <p key={row.label} className="mt-1 flex items-center gap-1.5 first:mt-0">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} /> {row.label}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Past: tugmalar va yaqin joylar paneli ── */}
      <div className="absolute inset-x-0 bottom-0 z-[600]">
        <div className="flex items-end justify-between px-4 pb-3">
          <button type="button" onClick={goBack} className={ROUND_BTN} aria-label="Orqaga">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <button type="button" onClick={locate} className={ROUND_BTN} aria-label="Mening joyim">
            {gpsStatus === 'pending' ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
            ) : (
              <Navigation className={`h-5 w-5 ${gpsStatus === 'granted' ? 'fill-brand text-brand' : ''}`} strokeWidth={2.2} />
            )}
          </button>
        </div>

        <section className="rounded-t-[28px] bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgba(16,42,67,0.08)]">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

          {shown.length ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-extrabold tracking-tight text-ink">Yaqin atrofda</h2>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-muted">{shown.length} ta</span>
              </div>
              {hideList ? null : (
                <ul className="no-scrollbar mt-1 max-h-[34svh] divide-y divide-line overflow-y-auto">
                  {shown.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setSelected(p)} className="flex w-full items-center gap-3 py-3 text-left">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${pinColor(p)}1f`, color: pinColor(p) }}
                        >
                          <MapPin className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold text-ink">{p.name}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {[p.address, listMeta ? listMeta(p) : ''].filter(Boolean).join(' · ') || mapLabel(p)}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold text-muted">{formatKm(p.km)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4 py-2">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-canvas">
                {art ? <img src={art} alt="" className="h-12 w-12 object-contain" /> : <MapPin className="h-7 w-7 text-muted" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-extrabold text-ink">{emptyText || 'Hozircha joylar yo‘q'}</span>
                <span className="mt-0.5 block text-[13px] text-muted">Yangi joylar qo‘shilishi bilan shu yerda chiqadi</span>
              </span>
            </div>
          )}
        </section>
      </div>

      {selected
        ? createPortal(
            <div className="fixed inset-0 z-[10000]">
              <button type="button" className="absolute inset-0 bg-ink/45" aria-label="Yopish" onClick={() => setSelected(null)} />
              <div className="absolute inset-x-0 bottom-0 z-10 max-h-[82vh] overflow-y-auto rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(28,28,40,0.28)]">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
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
