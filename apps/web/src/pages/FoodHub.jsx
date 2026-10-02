import { useMemo, useState } from 'react'
import { ArrowLeft, Clock, MapPin, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PlacesMap } from '../components/places/PlacesMap'
import { PhotoRow, PlaceSheet } from '../components/places/PlaceSheet'
import { formatSom } from '../lib/utils'
import { FOOD_FILTERS, foodAround } from '../data/places'
import { useApp } from '../context/AppContext'
import { DEFAULT_LOCATION } from '../lib/geocode'
import { googleMapsUrl } from '../lib/geo'
import { useShare } from '../components/ui/ShareSheet'

export default function FoodHub() {
  const navigate = useNavigate()
  const { location, gpsFix } = useApp()
  const [mode, setMode] = useState('feed')
  const [picked, setPicked] = useState(null)
  const { share, sheet } = useShare()

  const origin = useMemo(() => {
    if (gpsFix && !gpsFix.error && typeof gpsFix.lat === 'number') {
      return { lat: gpsFix.lat, lng: gpsFix.lng }
    }
    if (location?.lat) return { lat: location.lat, lng: location.lng }
    return DEFAULT_LOCATION
  }, [gpsFix, location])

  const posts = useMemo(() => foodAround(origin), [origin])

  if (mode === 'map') {
    return (
      <PlacesMap
        title="Oshxona"
        hint="Xaritadan oshxona tanlang"
        filters={FOOD_FILTERS}
        items={foodAround}
        filterMatch={(p, f) => p.types?.includes(f)}
        pinColor={() => '#f97316'}
        mapLabel={(_p) => 'Oshxona'}
        legend={[{ color: '#f97316', label: 'Oshxona' }]}
        hideList
        renderDetail={(p, h) => <KitchenDetail place={p} {...h} />}
        onBack={() => setMode('feed')}
      />
    )
  }

  return (
    <div className="min-h-[calc(100svh-5.5rem)] bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 px-4 pb-3 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold">Oshxona</h1>
            <p className="text-[11px] text-muted">Rasmlar, menyu va yetkazish</p>
          </div>
          <button
            type="button"
            onClick={() => setMode('map')}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-extrabold text-white"
          >
            <Search className="h-3.5 w-3.5" /> Xaritadan qidirish
          </button>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4 pb-28 lg:pb-8">
        {posts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPicked(p)}
            className="w-full overflow-hidden rounded-2xl bg-canvas text-left shadow-[0_8px_24px_rgba(28,28,40,0.06)]"
          >
            <div className="relative h-44">
              <img src={p.cover} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold">
                {p.cuisine}
              </span>
              <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">
                {p.mins} daq
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[17px] font-extrabold">{p.name}</p>
                <span className="inline-flex items-center gap-0.5 text-sm font-extrabold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3.5 w-3.5" /> {p.address} · {p.km.toFixed(1)} km
              </p>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {p.menu.slice(0, 4).map((m) => (
                  <span key={m.title} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold">
                    {m.title} · {formatSom(m.price)}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {picked ? (
        <div className="fixed inset-0 z-[10000]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setPicked(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <KitchenDetail
              place={picked}
              onClose={() => setPicked(null)}
              onShare={() =>
                share({
                  title: picked.name,
                  text: `${picked.name}\n${picked.address}\n${googleMapsUrl(picked.lat, picked.lng)}`,
                  url: googleMapsUrl(picked.lat, picked.lng),
                })
              }
            />
          </div>
        </div>
      ) : null}

      {sheet}
    </div>
  )
}

function KitchenDetail({ place, onClose, onShare }) {
  return (
    <PlaceSheet place={place} onClose={onClose} onShare={onShare}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand-soft px-2.5 py-1 font-bold text-brand">{place.cuisine}</span>
        {place.rating ? (
          <span className="inline-flex items-center gap-1 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {place.rating}
          </span>
        ) : null}
        {place.mins ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock className="h-3.5 w-3.5" /> {place.mins} daqiqa
          </span>
        ) : null}
      </div>
      <PhotoRow photos={place.photos} />
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Menyu</p>
      <div className="space-y-2">
        {place.menu?.map((m) => (
          <div key={m.title} className="flex items-center gap-3 rounded-2xl bg-canvas p-2">
            <img src={m.photo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{m.title}</p>
              <p className="text-sm font-extrabold text-brand">{formatSom(m.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </PlaceSheet>
  )
}
