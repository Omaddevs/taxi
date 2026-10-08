import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, LayoutGrid, Map as MapIcon, Plus, Search, X } from 'lucide-react'
import { VEHICLE_TYPES } from '../../data/rentals'
import { cn } from '../../lib/utils'
import { Cover, EmptyBlock, ListingCard } from './shared'
import { dailyPrice, distanceKm, mainPrice, som, useOrigin, useRentFavorites, useRentNav, useRentals } from './rentData'

const SORTS = [
  { id: 'new', label: 'Yangi' },
  { id: 'cheap', label: 'Arzon' },
  { id: 'near', label: 'Yaqin' },
]

export function RentCatalog({ onClose }) {
  const { go } = useRentNav()
  const origin = useOrigin()
  const favs = useRentFavorites()
  const { data = [], isLoading, isError, refetch } = useRentals()
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('new')
  const [query, setQuery] = useState('')

  const withKm = useMemo(() => data.map((l) => ({ ...l, km: distanceKm(origin, l) })), [data, origin])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = withKm.filter((l) => {
      if (type !== 'all' && l.vehicleType !== type) return false
      if (!q) return true
      return [l.title, l.brand, l.model, l.companyName, l.address].some((v) => v?.toLowerCase().includes(q))
    })
    if (sort === 'cheap') list.sort((a, b) => dailyPrice(a) - dailyPrice(b))
    else if (sort === 'near') list.sort((a, b) => (Number.isFinite(a.km) ? a.km : 1e9) - (Number.isFinite(b.km) ? b.km : 1e9))
    // "Yangi": the server already sends TOP first, then newest.
    return list
  }, [withKm, type, sort, query])

  // Header strip: pinned listings first, topped up with the cheapest ones to fill three slots.
  const highlights = useMemo(() => {
    const top = withKm.filter((l) => l.featured)
    const rest = withKm.filter((l) => !l.featured).sort((a, b) => dailyPrice(a) - dailyPrice(b))
    return [...top, ...rest].slice(0, 3)
  }, [withKm])

  const open = (id) => go({ ijara: '1', elon: id })

  return (
    <div className="pb-6">
      {/* ── Brend sarlavha: qidiruv va TOP e’lonlar ── */}
      <header className="relative overflow-hidden rounded-b-[30px] bg-[linear-gradient(150deg,#00d2de_0%,#00b5c2_55%,#0098a6_100%)] px-4 pb-4 pt-8 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_6px_16px_rgba(0,80,90,0.25)]">
            <img src="/home/scooter-rent.webp" alt="" className="h-10 w-10 object-contain" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[24px] font-black tracking-tight">Skuter ijara</p>
            <p className="truncate text-[12px] font-semibold text-white/85">Skuter · samokat · velosiped · moto</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition active:scale-90"
            aria-label="Yopish"
          >
            <ChevronDown className="h-5 w-5" strokeWidth={2.6} />
          </button>
        </div>

        <div className="relative mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => go({ ijara: 'xarita' })}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sm transition active:scale-90"
            aria-label="Xaritada ko‘rish"
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={2.2} />
          </button>
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 text-ink shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Transport yoki ijara joyini toping"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="Tozalash" className="text-muted">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </div>

        {highlights.length ? (
          <div className="relative mt-4 flex items-center gap-3">
            <button type="button" onClick={() => setSort('cheap')} className="min-w-0 flex-1 text-left">
              <p className="text-[17px] font-black uppercase italic leading-[1.05] tracking-tight">
                {highlights.some((l) => l.featured) ? 'Top takliflar' : 'Eng arzon ijara'}
              </p>
              <p className="mt-1 inline-flex items-center text-[12px] font-semibold text-white/90">
                Barchasi <ChevronRight className="h-3.5 w-3.5" />
              </p>
            </button>
            {highlights.map((l) => {
              const price = mainPrice(l)
              return (
                <button key={l.id} type="button" onClick={() => open(l.id)} className="w-[76px] shrink-0 text-center">
                  <span className="block overflow-hidden rounded-[16px] bg-white/25 p-1">
                    <Cover src={l.cover} className="h-[64px] w-full rounded-[12px]" iconClass="h-7 w-7" />
                  </span>
                  {price ? (
                    <span className="mt-1 block truncate text-[11px] font-extrabold">
                      {som(price.amount)} so‘m
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </header>

      {/* ── Turlar ── */}
      <nav className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto bg-white px-4 pb-3 pt-7">
        {[{ id: 'all', label: 'Barchasi' }, ...VEHICLE_TYPES].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition',
              type === t.id ? 'border-2 border-ink text-ink' : 'border-2 border-transparent bg-canvas text-ink',
            )}
          >
            {t.icon ? <t.icon className="h-4 w-4 text-brand-dark" /> : null}
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Bannerlar ── */}
      <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        <Banner
          tone="bg-[linear-gradient(120deg,#1a2b3c,#24465e)]"
          title="Transportingizni ijaraga bering"
          text="Tashkilotlar va shaxslar uchun e’lon joylash bepul"
          cta="E’lon joylash"
          img="/rent/scooter.webp"
          onClick={() => go({ ijara: 'yangi' })}
        />
        <Banner
          tone="bg-[linear-gradient(120deg,#00a3ae,#00c7d4)]"
          title="Ijara nuqtalari xaritada"
          text="Eng yaqin skuter va velosiped ijarasini toping"
          cta="Xaritani ochish"
          img="/rent/bike.webp"
          onClick={() => go({ ijara: 'xarita' })}
        />
      </div>

      {/* ── Saralash ── */}
      <div className="mt-4 flex items-center justify-between px-4">
        <p className="text-[19px] font-extrabold tracking-tight text-ink">
          {type === 'all' ? 'Siz uchun' : VEHICLE_TYPES.find((t) => t.id === type)?.label}
          <span className="ml-1.5 text-[13px] font-bold text-muted">{shown.length}</span>
        </p>
        <div className="flex rounded-full bg-canvas p-1">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-bold transition',
                sort === s.id ? 'bg-white text-ink shadow-sm' : 'text-muted',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 px-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] animate-pulse rounded-[22px] bg-canvas" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-canvas" />
              <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-canvas" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyBlock
          title="E’lonlarni yuklab bo‘lmadi"
          text="Internet aloqasini tekshirib, qayta urinib ko‘ring."
          action={
            <button type="button" onClick={() => refetch()} className="mt-4 h-11 rounded-full bg-ink px-6 text-sm font-bold text-white">
              Qayta urinish
            </button>
          }
        />
      ) : shown.length ? (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 px-4">
          {shown.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              km={l.km}
              saved={favs.has(l.id)}
              onToggleSave={() => favs.toggle(l.id)}
              onOpen={() => open(l.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyBlock
          title={data.length ? 'Hech narsa topilmadi' : 'Hozircha e’lonlar yo‘q'}
          text={data.length ? 'Boshqa tur yoki so‘zni sinab ko‘ring.' : 'Birinchi bo‘lib transportingizni ijaraga bering.'}
          action={
            <button
              type="button"
              onClick={() => go({ ijara: 'yangi' })}
              className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-brand px-6 text-sm font-extrabold text-white"
            >
              <Plus className="h-4 w-4" strokeWidth={3} /> E’lon joylash
            </button>
          }
        />
      )}

      {shown.length ? (
        <button
          type="button"
          onClick={() => go({ ijara: 'xarita' })}
          className="mx-auto mt-6 flex h-11 items-center gap-2 rounded-full bg-canvas px-5 text-[14px] font-bold text-ink"
        >
          <MapIcon className="h-4 w-4 text-brand-dark" /> Xaritada ko‘rish
        </button>
      ) : null}
    </div>
  )
}

function Banner({ tone, title, text, cta, img, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-[148px] w-[86%] shrink-0 snap-center overflow-hidden rounded-[24px] p-4 text-left text-white',
        tone,
      )}
    >
      <span className="relative z-10 flex max-w-[58%] flex-col">
        <span className="text-[19px] font-black uppercase leading-[1.05] tracking-tight">{title}</span>
        <span className="mt-1.5 text-[11px] font-medium leading-snug text-white/80">{text}</span>
        <span className="mt-auto inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-ink">
          {cta} <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </span>
      <img src={img} alt="" className="pointer-events-none absolute -right-6 bottom-1 w-[58%] max-w-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.35)]" />
    </button>
  )
}
