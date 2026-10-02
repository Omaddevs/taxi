import { PlacesMap } from '../components/places/PlacesMap'
import { PhotoRow, PlaceSheet, PriceGrid } from '../components/places/PlaceSheet'
import { formatSom } from '../lib/utils'
import { FUEL_TYPE_LABEL } from '../data/fuel'
import {
  EV_FILTERS,
  PARKING_FILTERS,
  SERVICE_FILTERS,
  SMART_FILTERS,
  WASH_FILTERS,
  autoAround,
  evAround,
  parkingAround,
  parkingColor,
  smartPlaces,
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

function SmartDetail({ place, onClose, onShare }) {
  if (place.group === 'service') return <AutoDetail place={place} onClose={onClose} onShare={onShare} />
  if (place.group === 'wash') return <WashDetail place={place} onClose={onClose} onShare={onShare} />
  if (place.group === 'parking') return <ParkingDetail place={place} onClose={onClose} onShare={onShare} />
  if (place.group === 'ev') return <EvDetail place={place} onClose={onClose} onShare={onShare} />
  if (place.group === 'food') {
    return (
      <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
        <PhotoRow photos={place.photos} />
        <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Menyu</p>
        <div className="space-y-2">
          {place.menu?.map((m) => (
            <div key={m.title} className="flex items-center gap-3 rounded-2xl bg-canvas p-2">
              <img src={m.photo} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{m.title}</p>
                <p className="text-xs font-extrabold text-brand">{formatSom(m.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </PlaceSheet>
    )
  }
  if (place.group === 'fuel') {
    return (
      <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
        <div className="flex flex-wrap gap-1.5">
          {place.types.map((t) => (
            <span key={t} className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
              {FUEL_TYPE_LABEL[t] || t}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(place.prices || {}).map(([key, value]) => (
            <div key={key} className="rounded-2xl bg-canvas px-3 py-2.5">
              <p className="text-[11px] font-semibold capitalize text-muted">{key === 'kwh' ? 'kWh' : key}</p>
              <p className="text-[15px] font-extrabold">
                {formatSom(value)}
                {key === 'kwh' ? <span className="text-[11px] font-semibold text-muted"> / kWh</span> : null}
              </p>
            </div>
          ))}
        </div>
      </PlaceSheet>
    )
  }
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <p className="text-sm text-muted">{place.address}</p>
    </PlaceSheet>
  )
}

function smartColor(p) {
  if (p.group === 'parking') return parkingColor(p.parkingKind)
  if (p.group === 'wash') return washColor(p.washType)
  if (p.group === 'service') return p.near ? '#16a34a' : '#ef4444'
  if (p.group === 'fuel') return p.near ? '#16a34a' : '#f97316'
  if (p.group === 'ev') return p.near ? '#16a34a' : '#7c3aed'
  if (p.group === 'food') return '#f97316'
  if (p.group === 'taxi') return '#2563eb'
  return '#64748b'
}

function smartMatch(p, filter) {
  return p.group === filter
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

export function SmartPlacesMap() {
  return (
    <PlacesMap
      title="Smart xarita"
      hint="Barcha xizmatlar · belgini bosing"
      filters={SMART_FILTERS}
      items={smartPlaces}
      filterMatch={smartMatch}
      pinColor={smartColor}
      mapLabel={(p) => p.mapLabel}
      legend={[
        { color: '#16a34a', label: 'Yaqin / mumkin' },
        { color: '#f97316', label: 'Oshxona / yoqilg‘i' },
        { color: '#ef4444', label: 'Taqiqlangan' },
      ]}
      hideList
      renderDetail={(p, h) => <SmartDetail place={p} {...h} />}
    />
  )
}
