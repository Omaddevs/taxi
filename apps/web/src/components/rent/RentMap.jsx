import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { haversineKm } from '../../lib/geo'
import { RENT_SCOOTER_COLOR, VEHICLE_TYPE } from '../../data/rentals'
import { PlacesMap } from '../places/PlacesMap'
import { PhotoRow, PlaceSheet, PriceGrid } from '../places/PlaceSheet'
import { Cover } from './shared'
import { mainPrice, ownerName, som, useRentals } from './rentData'

const LISTING_COLOR = '#1a2b3c'

/**
 * The market's own Smart xarita: rental points admins pin on the map (Xarita joylari →
 * "Skuter ijara") plus every listing whose owner set a location.
 */
export function RentMap({ onBack, onOpenListing }) {
  const { data: places = [] } = useQuery({ queryKey: ['map-places'], queryFn: () => api.get('/places'), staleTime: 60_000 })
  const { data: listings = [] } = useRentals()

  const points = useMemo(() => places.filter((p) => p.category === 'SCOOTER'), [places])

  const items = useCallback(
    (origin) =>
      [
        ...points.map((p) => ({
          ...p,
          kind: 'point',
          km: haversineKm(origin, p),
          photos: p.imageUrl ? [p.imageUrl] : [],
        })),
        ...listings
          .filter((l) => l.lat != null && l.lng != null)
          .map((l) => ({ ...l, kind: 'listing', name: l.title, km: haversineKm(origin, l) })),
      ].sort((a, b) => a.km - b.km),
    [points, listings],
  )

  return (
    <PlacesMap
      fill
      title="Skuter ijara xaritasi"
      hint="Ijara nuqtalari va e’lonlar"
      art="/home/scooter-rent.webp"
      filters={[
        { id: 'all', label: 'Barchasi' },
        { id: 'point', label: 'Ijara nuqtalari', color: RENT_SCOOTER_COLOR },
        { id: 'listing', label: 'E’lonlar', color: LISTING_COLOR },
      ]}
      items={items}
      filterMatch={(p, filter) => p.kind === filter}
      pinColor={(p) => (p.kind === 'point' ? RENT_SCOOTER_COLOR : LISTING_COLOR)}
      mapLabel={(p) => (p.kind === 'point' ? p.brand || p.name : priceLabel(p) || ownerName(p))}
      listMeta={(p) => (p.kind === 'listing' ? priceLabel(p) : p.hours || '')}
      emptyText="Hozircha xaritada ijara joylari yo‘q"
      onBack={onBack}
      renderDetail={(p, h) =>
        p.kind === 'point' ? <PointDetail place={p} {...h} /> : <ListingPreview listing={p} onOpen={() => onOpenListing(p.id)} />
      }
    />
  )
}

function priceLabel(l) {
  const price = mainPrice(l)
  return price ? `${som(price.amount)}/${price.unit}` : ''
}

function PointDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: RENT_SCOOTER_COLOR }}>
        Ijara nuqtasi
      </span>
      <PhotoRow photos={place.photos} />
      {place.description ? <p className="mt-3 whitespace-pre-line text-sm text-ink">{place.description}</p> : null}
      <PriceGrid items={place.prices} />
    </PlaceSheet>
  )
}

function ListingPreview({ listing, onOpen }) {
  const type = VEHICLE_TYPE[listing.vehicleType]
  const price = mainPrice(listing)
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-left">
      <Cover src={listing.cover} className="h-24 w-24 shrink-0 rounded-[20px]" />
      <span className="min-w-0 flex-1">
        {type ? <span className="text-[11px] font-bold uppercase tracking-wide text-brand-dark">{type.label}</span> : null}
        <span className="mt-0.5 line-clamp-2 block text-[16px] font-extrabold leading-snug text-ink">{listing.title}</span>
        {price ? (
          <span className="mt-1 block text-[15px] font-extrabold text-ink">
            {som(price.amount)} <span className="text-[12px] font-bold text-muted">so‘m/{price.unit}</span>
          </span>
        ) : null}
        <span className="mt-1 block truncate text-[12px] text-muted">{ownerName(listing)}</span>
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white">
        <ChevronRight className="h-5 w-5" />
      </span>
    </button>
  )
}
