import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlacesMap } from '../components/places/PlacesMap'
import { PhotoRow, PlaceSheet, PriceGrid } from '../components/places/PlaceSheet'
import { api } from '../lib/api'
import { haversineKm } from '../lib/geo'
import { MAP_PLACE_CATEGORIES, MAP_PLACE_CATEGORY } from '../data/mapPlaceCategories'

// Every map on the site shows the places admins add in the admin panel (→ Xarita joylari),
// served by GET /places. One cached request feeds all of them.
function useMapPlaces() {
  return useQuery({
    queryKey: ['map-places'],
    queryFn: () => api.get('/places'),
    staleTime: 60_000,
  })
}

function toMapItem(place, origin) {
  const km = haversineKm(origin, place)
  return {
    ...place,
    km,
    mapLabel: place.brand || place.name,
    photos: place.imageUrl ? [place.imageUrl] : [],
  }
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return ''
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function PlaceDetail({ place, onClose, onShare }) {
  const category = MAP_PLACE_CATEGORY[place.category]
  const distance = formatDistance(place.km)
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <span
        className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ background: category?.color || '#64748b' }}
      >
        {category?.label || 'Joy'}
        {distance ? ` · ${distance}` : ''}
      </span>
      <PhotoRow photos={place.photos} />
      {place.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink">{place.description}</p> : null}
      <PriceGrid items={place.prices} />
    </PlaceSheet>
  )
}

/**
 * A map of admin-managed places. With `category` it shows just that kind (Yoqilg‘i, Moyka…);
 * without it, everything with a filter chip per category present (Smart xarita).
 */
export function AdminPlacesMap({ category, title, hint, emptyText = 'Hozircha xaritada joylar yo‘q' }) {
  const { data = [], isLoading, isError } = useMapPlaces()
  const places = useMemo(() => (category ? data.filter((p) => p.category === category) : data), [data, category])

  const items = useCallback(
    (origin) => places.map((p) => toMapItem(p, origin)).sort((a, b) => a.km - b.km),
    [places],
  )

  // Only categories that actually have places get a filter chip.
  const filters = useMemo(() => {
    if (category) return []
    const present = new Set(places.map((p) => p.category))
    const chips = MAP_PLACE_CATEGORIES.filter((c) => present.has(c.id))
    return chips.length > 1 ? [{ id: 'all', label: 'Barchasi' }, ...chips] : []
  }, [places, category])

  return (
    <PlacesMap
      title={title}
      hint={hint}
      filters={filters}
      items={items}
      filterMatch={(p, filter) => p.category === filter}
      pinColor={(p) => MAP_PLACE_CATEGORY[p.category]?.color || '#64748b'}
      mapLabel={(p) => p.mapLabel}
      hideList
      emptyText={isLoading ? 'Joylar yuklanmoqda…' : isError ? 'Joylarni yuklab bo‘lmadi' : emptyText}
      renderDetail={(p, h) => <PlaceDetail place={p} {...h} />}
    />
  )
}

export function SmartPlacesMap() {
  return <AdminPlacesMap title="Smart xarita" hint="Barcha xizmatlar bir xaritada" />
}

export function FuelMap() {
  return (
    <AdminPlacesMap category="FUEL" title="Yoqilg‘i shahobchalari" hint="Narxlar va manzillar" emptyText="Hozircha shahobchalar qo‘shilmagan" />
  )
}

export function AutoServiceMap() {
  return (
    <AdminPlacesMap category="SERVICE" title="Avtoservis" hint="Ustaxonalar va xizmatlar" emptyText="Hozircha avtoservislar qo‘shilmagan" />
  )
}

export function WashMap() {
  return <AdminPlacesMap category="WASH" title="Moyka" hint="Avtomoykalar" emptyText="Hozircha moykalar qo‘shilmagan" />
}

export function ParkingMap() {
  return <AdminPlacesMap category="PARKING" title="Parking" hint="To‘xtash joylari" emptyText="Hozircha parkinglar qo‘shilmagan" />
}

export function EvMap() {
  return <AdminPlacesMap category="EV" title="EV zaryad" hint="Elektr zaryad stansiyalari" emptyText="Hozircha zaryad stansiyalari qo‘shilmagan" />
}

export function FoodMap() {
  return <AdminPlacesMap category="FOOD" title="Oshxona" hint="Oshxona va restoranlar" emptyText="Hozircha oshxonalar qo‘shilmagan" />
}
