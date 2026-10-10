import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BusFront,
  ChevronRight,
  Clock,
  Fuel,
  Menu,
  PersonStanding,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DEFAULT_LOCATION } from '../../lib/geocode'
import { formatPlace, isRegionActive, matchRegion } from '../../data/uzbekistan'
import { Logo, Wordmark } from '../ui/Logo'
import { RegionPicker } from '../ui/SearchPickers'
import { ServiceStrip } from './ServiceStrip'

function TileBadge({ tone = 'soon', children }) {
  const cls = tone === 'hot' ? 'bg-brand text-white' : 'bg-slate-500/80 text-white backdrop-blur'
  const Icon = tone === 'hot' ? Zap : Clock
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" strokeWidth={2.6} />
      {children}
    </span>
  )
}

// `soon` — xizmat hali ishga tushmagan: bosilmaydi va "Tez orada" yorlig‘i chiqadi.
function Tile({ to, title, hint, badge, badgeTone, soon = false, className = '', children }) {
  const Root = soon ? 'div' : Link
  return (
    <Root
      {...(soon ? { 'aria-disabled': true } : { to })}
      className={`relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[22px] bg-canvas p-3 ${
        soon ? 'cursor-default' : 'active:scale-[0.98] transition-transform'
      } ${className}`}
    >
      <div className="relative z-10">
        <p className="text-[15px] font-bold leading-tight text-ink">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted">{hint}</p>
      </div>
      {children}
      {soon || badge ? (
        <div className="relative z-10">
          <TileBadge tone={soon ? 'soon' : badgeTone}>{soon ? 'Tez orada' : badge}</TileBadge>
        </div>
      ) : null}
    </Root>
  )
}

export function MobileHome() {
  const { setDrawerOpen, location, openLocationPicker, search, setSearch } = useApp()
  const navigate = useNavigate()
  const [picker, setPicker] = useState(null)

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))
  // Standart manzil (DEFAULT_LOCATION) localStorage'ga ham yozilib qoladi — shuning uchun
  // obyektni emas, koordinatani solishtiramiz va uni yo‘lovchining haqiqiy manzili deb ko‘rsatmaymiz.
  const hasLocation =
    Boolean(location?.label) && !(location.lat === DEFAULT_LOCATION.lat && location.lng === DEFAULT_LOCATION.lng)
  const gpsOrigin = useMemo(() => {
    if (!hasLocation) return null
    const region = matchRegion(location.state, location.city, location.label)
    return region && isRegionActive(region) ? { region, place: location.label } : null
  }, [hasLocation, location])
  const origin = search.fromRegion ? { region: search.fromRegion, place: search.fromPlace } : gpsOrigin
  const originText = search.fromRegion ? search.from : hasLocation ? location.label : ''

  const openPicker = (which) => {
    // "Qayerdan" tanlanmagan bo‘lsa — joriy joylashuvni boshlang‘ich nuqta qilib olamiz.
    if (which === 'to' && !search.fromRegion && gpsOrigin) {
      update({
        fromRegion: gpsOrigin.region,
        fromPlace: gpsOrigin.place,
        from: formatPlace(gpsOrigin.region, gpsOrigin.place),
      })
    }
    setPicker(which)
  }

  const pickOriginOnMap = () =>
    openLocationPicker({
      title: 'Mo‘ljal',
      onPick: (loc) => {
        const region = matchRegion(loc.state, loc.city, loc.label)
        if (!region) return
        update({ fromRegion: region, fromPlace: loc.label, from: formatPlace(region, loc.label) })
      },
    })

  return (
    <div className="min-h-svh bg-white pb-8">
      <header className="relative flex items-center justify-center px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="absolute left-3 top-[max(14px,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full text-ink"
          aria-label="Menyu"
        >
          <Menu className="h-6 w-6" strokeWidth={2.4} />
        </button>
        <div className="flex min-w-0 flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Logo size={34} />
            <Wordmark className="text-[26px]" />
          </div>
          <button
            type="button"
            onClick={openLocationPicker}
            className="mt-1 flex max-w-[230px] items-center gap-0.5 text-[14px] text-muted"
            aria-label="Manzilni o‘zgartirish"
          >
            <span className="truncate">{hasLocation ? location.label : 'Manzilni aniqlang'}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2.5 px-3">
        <Tile to="/taxi" title="Taxi" hint="Shahar va viloyat" badge="Tez" badgeTone="hot">
          <img
            src="/landing/taxi-car-sm.webp"
            alt=""
            className="pointer-events-none absolute -right-10 bottom-9 w-[150px] max-w-none drop-shadow-lg"
          />
        </Tile>
        <Tile to="/cargo" title="Yetkazish" hint="Posilka, hujjat">
          <img
            src="/home/box.webp"
            alt=""
            className="pointer-events-none absolute -bottom-3 -right-3 w-[108px] max-w-none drop-shadow-lg"
          />
        </Tile>
        <Tile to="/map" title="Smart Xarita" hint="Yangi">
          <img
            src="/home/smart-map.png"
            alt=""
            className="pointer-events-none absolute -bottom-3 -right-3 w-[108px] max-w-none drop-shadow-lg"
          />
        </Tile>

        <Tile
          to="/women/taxi"
          title="Ayollar uchun Taxi"
          hint="Avval ayol haydovchilarga"
          badge="Xavfsiz"
          badgeTone="hot"
          className="col-span-2 bg-gradient-to-br from-[#fff0f5] to-[#fde2ec]"
        >
          <img
            src="/landing/taxi-car-sm.webp"
            alt=""
            className="pointer-events-none absolute -right-8 bottom-1 w-[210px] max-w-none drop-shadow-lg"
            style={{ filter: 'hue-rotate(150deg) saturate(1.2)' }}
          />
        </Tile>
        <Tile to="/drivers" title="Haydovchilar" hint="E’lonlar va aloqa" badge="Yangi" badgeTone="hot" className="bg-gradient-to-br from-[#fff6d6] to-[#ffe7a3]">
          <img
            src="/home/driver-mascot.webp"
            alt=""
            className="pointer-events-none absolute -bottom-2 -right-1 w-[78px] max-w-none drop-shadow-lg"
          />
        </Tile>
      </section>

      <section className="mt-5 space-y-2.5 px-3">
        <div className="flex h-14 items-center gap-3 rounded-2xl bg-canvas pl-4 pr-2">
          <PersonStanding className="h-5 w-5 shrink-0 text-ink" strokeWidth={2.4} />
          <button type="button" onClick={() => openPicker('from')} className="min-w-0 flex-1 text-left">
            <span className={`block truncate text-[16px] font-semibold ${originText ? 'text-ink' : 'text-muted'}`}>
              {originText || 'Qayerdan?'}
            </span>
          </button>
          <button
            type="button"
            onClick={pickOriginOnMap}
            className="h-9 shrink-0 rounded-xl bg-white px-3 text-[13px] font-semibold text-ink shadow-sm"
          >
            Mo‘ljal
          </button>
          <Link
            to="/favorites"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-sm"
            aria-label="Saqlangan manzillar"
          >
            <Bookmark className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => openPicker('to')}
          className="flex h-14 w-full items-center gap-3 rounded-2xl bg-canvas px-4 text-left"
        >
          <Search className="h-5 w-5 shrink-0 text-ink" strokeWidth={2.4} />
          <span className={`min-w-0 flex-1 truncate text-[16px] font-semibold ${search.to ? 'text-ink' : 'text-muted'}`}>
            {search.to || 'Qayerga?'}
          </span>
        </button>

        <RegionPicker
          variant="headless"
          kind="from"
          label="Qayerdan"
          forceSheet
          region={search.fromRegion}
          place={search.fromPlace}
          onChange={({ region, place, label }) => {
            update({ fromRegion: region, fromPlace: place, from: label })
            setPicker('to')
          }}
          open={picker === 'from'}
          onToggle={() => setPicker((cur) => (cur === 'from' ? null : 'from'))}
          onClose={() => setPicker(null)}
        />
        <RegionPicker
          variant="headless"
          kind="to"
          label="Qayerga"
          forceSheet
          region={search.toRegion}
          place={search.toPlace}
          origin={origin}
          onEditOrigin={() => setPicker('from')}
          onChange={({ region, place, label }) => {
            update({ toRegion: region, toPlace: place, to: label })
            navigate('/ride')
          }}
          open={picker === 'to'}
          onToggle={() => setPicker((cur) => (cur === 'to' ? null : 'to'))}
          onClose={() => setPicker(null)}
        />
      </section>

      <ServiceStrip />

      <section className="mt-4 grid grid-cols-2 gap-2.5 px-3">
        <div className="relative flex min-h-[200px] flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-brand to-brand-dark p-4 text-white">
          <p className="relative z-10 text-[19px] font-extrabold leading-[1.15]">Tez va qulay safar TaxiLine bilan</p>
          <img
            src="/landing/taxi-car-sm.webp"
            alt=""
            className="pointer-events-none absolute -right-12 bottom-10 w-[200px] max-w-none drop-shadow-xl"
          />
          <button
            type="button"
            onClick={() => navigate('/ride')}
            className="relative z-10 mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-ink"
          >
            Sinab ko‘ring <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-[200px] flex-col overflow-hidden rounded-[24px] bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] p-4 text-white">
          <p className="text-[17px] font-extrabold leading-[1.15]">Tez orada yangi xizmatlar TaxiLine da</p>
          <ul className="mt-3 space-y-2 text-[13px] font-medium">
            {[
              [Wrench, 'Avtoservis'],
              [Fuel, 'Yoqilg‘i shahobchasi'],
              [BusFront, 'Shaharlararo avtobus'],
              [ShieldCheck, 'Yo‘lda yordam'],
              [Sparkles, 'Bonus va chegirmalar'],
            ].map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
