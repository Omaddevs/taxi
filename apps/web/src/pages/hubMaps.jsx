import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlacesMap } from '../components/places/PlacesMap'
import { PhotoRow, PlaceSheet, PriceGrid } from '../components/places/PlaceSheet'
import { formatSom } from '../lib/utils'
import { api } from '../lib/api'
import { haversineKm } from '../lib/geo'
import { MAP_PLACE_CATEGORIES, MAP_PLACE_CATEGORY } from '../data/mapPlaceCategories'
import {
  EV_FILTERS,
  PARKING_FILTERS,
  SERVICE_FILTERS,
  WASH_FILTERS,
  autoAround,
  evAround,
  parkingAround,
  parkingColor,
  washAround,
  washColor,
} from '../data/places'

function matchTypes(place, filter) {
  return place.types?.includes(filter)
}

function AutoDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <div className="flex flex-wrap gap-1.5">
        {place.types.map((t) => (
          <span key={t} className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold capitalize text-brand">
            {SERVICE_FILTERS.find((x) => x.id === t)?.label || t}
          </span>
        ))}
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${place.open ? 'bg-emerald-50 text-success' : 'bg-slate-100 text-muted'}`}>
          {place.open ? 'Ochiq' : 'Yopiq'}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${place.near ? 'bg-emerald-50 text-success' : 'bg-red-50 text-red-600'}`}>
          {place.km.toFixed(1)} km
        </span>
      </div>
      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Xizmatlar va narxlar</p>
      <PriceGrid items={place.services} />
    </PlaceSheet>
  )
}

function WashDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <span
        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ background: washColor(place.washType) }}
      >
        {place.washType === 'self' ? 'Samo-moyka' : 'Yuvib berish'}
      </span>
      <PhotoRow photos={place.photos} />
      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Narxlar</p>
      <PriceGrid items={place.prices} />
    </PlaceSheet>
  )
}

function ParkingDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: parkingColor(place.parkingKind) }}>
        {place.mapLabel}
      </span>
      {place.note ? <p className="mt-3 text-sm leading-relaxed text-ink">{place.note}</p> : null}
      {place.spots ? (
        <p className="mt-3 text-sm font-semibold">
          {place.free} / {place.spots} joy bo‘sh
        </p>
      ) : null}
      <PriceGrid items={place.prices} />
    </PlaceSheet>
  )
}

function EvDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">{place.brand}</span>
        <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold">{place.powerKw} kW</span>
        {place.connectors.map((c) => (
          <span key={c} className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-canvas px-4 py-3">
        <p className="text-[11px] font-semibold text-muted">1 kWh narxi</p>
        <p className="text-2xl font-extrabold">{formatSom(place.kwh)}</p>
      </div>
    </PlaceSheet>
  )
}

export function AutoServiceMap() {
  return (
    <PlacesMap
      title="Avtoservis"
      hint="Yaqini yashil · uzoqrog‘i qizil"
      filters={SERVICE_FILTERS}
      items={autoAround}
      filterMatch={matchTypes}
      pinColor={(p) => (p.near ? '#16a34a' : '#ef4444')}
      mapLabel={(p) => p.mapLabel}
      legend={[
        { color: '#16a34a', label: 'Yaqin' },
        { color: '#ef4444', label: 'Uzoqroq' },
      ]}
      hideList
      renderDetail={(p, h) => <AutoDetail place={p} {...h} />}
    />
  )
}

export function WashMap() {
  return (
    <PlacesMap
      title="Moyka"
      hint="Moviy — samo-moyka · binafsha — yuvib berish"
      filters={WASH_FILTERS}
      items={washAround}
      filterMatch={matchTypes}
      pinColor={(p) => washColor(p.washType)}
      mapLabel={(p) => p.mapLabel}
      legend={[
        { color: '#0ea5e9', label: 'Samo-moyka' },
        { color: '#a855f7', label: 'Yuvib berish' },
      ]}
      hideList
      renderDetail={(p, h) => <WashDetail place={p} {...h} />}
    />
  )
}

export function ParkingMap() {
  return (
    <PlacesMap
      title="Parking"
      hint="Yashil — mumkin · qizil — mumkin emas · sariq — to‘xtash taqiqlanadi"
      filters={PARKING_FILTERS}
      items={parkingAround}
      filterMatch={matchTypes}
      pinColor={(p) => parkingColor(p.parkingKind)}
      mapLabel={(p) => p.mapLabel}
      legend={[
        { color: '#16a34a', label: 'Mumkin' },
        { color: '#ef4444', label: 'Mumkin emas' },
        { color: '#f59e0b', label: 'To‘xtash taqiqlanadi' },
      ]}
      hideList
      renderDetail={(p, h) => <ParkingDetail place={p} {...h} />}
    />
  )
}

export function EvMap() {
  return (
    <PlacesMap
      title="EV zaryad"
      hint="Brend nomi va 1 kWh narxi xaritada"
      filters={EV_FILTERS}
      items={evAround}
      filterMatch={matchTypes}
      pinColor={(p) => (p.near ? '#16a34a' : '#7c3aed')}
      mapLabel={(p) => p.brand}
      legend={[
        { color: '#16a34a', label: 'Yaqin' },
        { color: '#7c3aed', label: 'Uzoqroq' },
      ]}
      hideList
      renderDetail={(p, h) => <EvDetail place={p} {...h} />}
    />
  )
}

// Places added by admins in the admin panel (→ Xarita joylari), served by GET /places.
function toMapItem(place, origin) {
  const km = haversineKm(origin, place)
  return {
    ...place,
    km,
    near: km <= 3,
    mapLabel: place.brand || place.name,
    photos: place.imageUrl ? [place.imageUrl] : [],
  }
}

function SmartPlaceDetail({ place, onClose, onShare }) {
  const category = MAP_PLACE_CATEGORY[place.category]
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <span
        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ background: category?.color || '#64748b' }}
      >
        {category?.label || 'Joy'}
        {Number.isFinite(place.km) ? ` · ${place.km < 1 ? `${Math.round(place.km * 1000)} m` : `${place.km.toFixed(1)} km`}` : ''}
      </span>
      <PhotoRow photos={place.photos} />
      {place.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink">{place.description}</p> : null}
      <PriceGrid items={place.prices} />
    </PlaceSheet>
  )
}

export function SmartPlacesMap() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['map-places'],
    queryFn: () => api.get('/places'),
    staleTime: 60_000,
  })

  const items = useCallback((origin) => data.map((p) => toMapItem(p, origin)).sort((a, b) => a.km - b.km), [data])

  // Only categories that actually have places get a filter chip.
  const filters = useMemo(() => {
    const present = new Set(data.map((p) => p.category))
    const chips = MAP_PLACE_CATEGORIES.filter((c) => present.has(c.id))
    return chips.length > 1 ? [{ id: 'all', label: 'Barchasi' }, ...chips] : []
  }, [data])

  return (
    <PlacesMap
      title="Smart xarita"
      hint="Barcha xizmatlar bir xaritada"
      filters={filters}
      items={items}
      filterMatch={(p, filter) => p.category === filter}
      pinColor={(p) => MAP_PLACE_CATEGORY[p.category]?.color || '#64748b'}
      mapLabel={(p) => p.mapLabel}
      hideList
      emptyText={isLoading ? 'Joylar yuklanmoqda…' : isError ? 'Joylarni yuklab bo‘lmadi' : 'Hozircha xaritada joylar yo‘q'}
      renderDetail={(p, h) => <SmartPlaceDetail place={p} {...h} />}
    />
  )
}
