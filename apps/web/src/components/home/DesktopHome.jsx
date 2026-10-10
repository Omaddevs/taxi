import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  BusFront,
  ChevronRight,
  Clock,
  Fuel,
  MapPin,
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
import { RegionPicker } from '../ui/SearchPickers'
import { SERVICES } from '../../data/services'

// Laptop/desktop version of MobileHome — the same visual language (soft canvas tiles with 3D
// art, pill search fields, service icons, gradient banners), laid out for a wide screen.

function Badge({ tone = 'soon', children }) {
  const cls =
    tone === 'hot'
      ? 'bg-brand text-white'
      : tone === 'glass'
        ? 'bg-white/25 text-white backdrop-blur'
        : 'bg-slate-500/80 text-white backdrop-blur'
  const Icon = tone === 'hot' ? Zap : Clock
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.6} />
      {children}
    </span>
  )
}

function Tile({ to, title, hint, badge, badgeTone, soon = false, className = '', art, artClass = '', artStyle }) {
  const Root = soon ? 'div' : Link
  return (
    <Root
      {...(soon ? { 'aria-disabled': true } : { to })}
      className={`group relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(16,42,67,0.05)] ring-1 ring-black/[0.03] transition ${
        soon ? 'cursor-default' : 'hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(16,42,67,0.10)]'
      } ${className}`}
    >
      <div className="relative z-10">
        <p className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">{title}</p>
        <p className="mt-1 text-[13px] text-muted">{hint}</p>
      </div>
      {art ? (
        <img
          src={art}
          alt=""
          style={artStyle}
          className={`pointer-events-none absolute max-w-none drop-shadow-xl transition-transform duration-300 ${
            soon ? '' : 'group-hover:scale-105'
          } ${artClass}`}
        />
      ) : null}
      {soon || badge ? (
        <div className="relative z-10">
          <Badge tone={soon ? 'soon' : badgeTone}>{soon ? 'Tez orada' : badge}</Badge>
        </div>
      ) : null}
    </Root>
  )
}

export function DesktopHome() {
  const { location, openLocationPicker, search, setSearch } = useApp()
  const navigate = useNavigate()
  const [picker, setPicker] = useState(null)

  const update = (patch) => setSearch((s) => ({ ...s, ...patch }))
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
    if (which === 'to' && !search.fromRegion && gpsOrigin) {
      update({ fromRegion: gpsOrigin.region, fromPlace: gpsOrigin.place, from: formatPlace(gpsOrigin.region, gpsOrigin.place) })
    }
    setPicker(which)
  }

  const swap = () =>
    update({
      fromRegion: search.toRegion,
      fromPlace: search.toPlace,
      from: search.to,
      toRegion: search.fromRegion,
      toPlace: search.fromPlace,
      to: search.from,
    })

  const pickOriginOnMap = () =>
    openLocationPicker({
      title: 'Mo‘ljal',
      onPick: (loc) => {
        const region = matchRegion(loc.state, loc.city, loc.label)
        if (!region) return
        update({ fromRegion: region, fromPlace: loc.label, from: formatPlace(region, loc.label) })
      },
    })

  const findTrip = () => {
    if (!search.toRegion) return openPicker('to')
    navigate('/ride')
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      {/* ── Qidiruv + Taxi ── */}
      <section className="grid grid-cols-12 gap-5">
        <div className="col-span-12 rounded-[32px] bg-white p-7 shadow-[0_10px_40px_rgba(16,42,67,0.06)] xl:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[30px] font-black leading-tight tracking-tight text-ink">Qayerga boramiz?</h2>
              <p className="mt-1 text-[14px] text-muted">Shahar ichida va viloyatlar bo‘ylab — bir necha bosishda</p>
            </div>
            <button
              type="button"
              onClick={openLocationPicker}
              className="flex max-w-[260px] items-center gap-1.5 rounded-full bg-canvas px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:bg-brand-soft"
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate">{hasLocation ? location.label : 'Manzilni aniqlang'}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </button>
          </div>

          <div className="relative mt-6 space-y-3">
            <div className="flex h-16 items-center gap-3 rounded-[20px] bg-canvas pl-5 pr-2.5 transition focus-within:ring-2 focus-within:ring-brand/40">
              <PersonStanding className="h-5 w-5 shrink-0 text-ink" strokeWidth={2.4} />
              <button type="button" onClick={() => openPicker('from')} className="min-w-0 flex-1 text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Qayerdan</span>
                <span className={`block truncate text-[16px] font-semibold ${originText ? 'text-ink' : 'text-muted'}`}>
                  {originText || 'Manzilni tanlang'}
                </span>
              </button>
              <button
                type="button"
                onClick={pickOriginOnMap}
                className="h-10 shrink-0 rounded-xl bg-white px-4 text-[13px] font-semibold text-ink shadow-sm transition hover:bg-brand-soft"
              >
                Mo‘ljal
              </button>
              <Link
                to="/favorites"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink shadow-sm transition hover:bg-brand-soft"
                aria-label="Saqlangan manzillar"
              >
                <Bookmark className="h-4 w-4" />
              </Link>
            </div>

            <button
              type="button"
              onClick={swap}
              aria-label="Manzillarni almashtirish"
              className="absolute right-[120px] top-[52px] z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-brand text-white shadow-md transition hover:rotate-180"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => openPicker('to')}
              className="flex h-16 w-full items-center gap-3 rounded-[20px] bg-canvas px-5 text-left transition hover:bg-[#eef1f5]"
            >
              <Search className="h-5 w-5 shrink-0 text-ink" strokeWidth={2.4} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Qayerga</span>
                <span className={`block truncate text-[16px] font-semibold ${search.to ? 'text-ink' : 'text-muted'}`}>
                  {search.to || 'Qayerga borasiz?'}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={findTrip}
              className="inline-flex h-13 items-center gap-2 rounded-[18px] bg-brand px-7 text-[15px] font-extrabold text-white shadow-[0_10px_24px_rgba(0,199,212,0.35)] transition hover:bg-brand-dark"
            >
              Safar topish <ArrowRight className="h-5 w-5" />
            </button>
            {[
              ['/taxi', 'Shahar taxi'],
              ['/women/taxi', 'Ayollar uchun'],
              ['/cargo', 'Yuk jo‘natish'],
            ].map(([to, label]) => (
              <Link key={to} to={to} className="rounded-full bg-canvas px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-brand-soft">
                {label}
              </Link>
            ))}
          </div>

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
        </div>

        <Link
          to="/taxi"
          className="group relative col-span-12 flex min-h-[300px] flex-col overflow-hidden rounded-[32px] bg-[linear-gradient(150deg,#00d2de_0%,#00b5c2_55%,#0098a6_100%)] p-7 text-white xl:col-span-5"
        >
          <span aria-hidden className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative z-10">
            <Badge tone="glass">Tez</Badge>
            <p className="mt-3 text-[34px] font-black leading-none tracking-tight">Taxi</p>
            <p className="mt-2 max-w-[220px] text-[14px] text-white/85">Shahar ichida va viloyatlararo — haydovchi bir zumda</p>
          </div>
          <img
            src="/landing/taxi-car.webp"
            alt=""
            className="pointer-events-none absolute -right-16 bottom-14 w-[460px] max-w-none drop-shadow-[0_24px_30px_rgba(0,60,70,0.35)] transition-transform duration-500 group-hover:-translate-x-3"
          />
          <span className="relative z-10 mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-extrabold text-ink shadow-lg">
            Taxi chaqirish <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* ── Xizmat plitkalari ── */}
      <section className="grid grid-cols-4 gap-4">
        <Tile
          to="/women/taxi"
          title="Ayollar uchun Taxi"
          hint="Avval ayol haydovchilarga"
          badge="Xavfsiz"
          badgeTone="hot"
          className="col-span-2 bg-gradient-to-br from-[#fff0f5] to-[#fde2ec]"
          art="/landing/taxi-car-sm.webp"
          artClass="-right-10 bottom-2 w-[300px]"
          artStyle={{ filter: 'hue-rotate(150deg) saturate(1.2)' }}
        />
        <Tile to="/cargo" title="Yetkazish" hint="Posilka, hujjat" art="/home/box.webp" artClass="-bottom-4 -right-4 w-[140px]" />
        <Tile to="/map" title="Smart Xarita" hint="Yangi" art="/home/smart-map.png" artClass="-bottom-4 -right-4 w-[140px]" />
        <Tile
          to="?ijara=1"
          title="Skuter ijara"
          hint="Skuter, samokat, velosiped"
          badge="Yangi"
          badgeTone="hot"
          art="/home/scooter-rent.webp"
          artClass="-bottom-3 -right-3 w-[130px]"
        />
        <Tile to="/hub/auto-service" title="Avtoservis" hint="Ustaxonalar va xizmatlar" art="/home/service.webp" artClass="-bottom-4 -right-4 w-[130px]" />
        <Tile to="/fuel" title="Yoqilg‘i" hint="Narxlar va manzillar" art="/home/fuel.webp" artClass="-bottom-4 -right-4 w-[130px]" />
        <Tile to="/drivers" title="Haydovchilar" hint="E’lonlar va aloqa" badge="Yangi" badgeTone="hot" art="/home/driver-mascot.webp" artClass="-bottom-2 right-1 w-[96px]" />
      </section>

      {/* ── Barcha xizmatlar ── */}
      <section className="rounded-[32px] bg-white p-6 shadow-[0_10px_40px_rgba(16,42,67,0.05)]">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-[20px] font-extrabold tracking-tight text-ink">Barcha xizmatlar</h3>
            <p className="text-[13px] text-muted">Yo‘l, avtomobil va kundalik xizmatlar — bir joyda</p>
          </div>
          <Link to="/map" className="flex items-center gap-1 text-[13px] font-bold text-brand-dark hover:underline">
            Xaritada ko‘rish <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-6 gap-3 xl:grid-cols-8">
          {SERVICES.map(({ to, label, img, badge, wide }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col items-center gap-2 rounded-[22px] bg-canvas px-2 pb-3 pt-4 transition hover:-translate-y-0.5 hover:bg-brand-soft/60"
            >
              {badge ? (
                <span className="absolute -top-2 rounded-full bg-[#ff5a1f] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">{badge}</span>
              ) : null}
              <span className="flex h-16 w-16 items-center justify-center">
                <img
                  src={img}
                  alt=""
                  className={`pointer-events-none max-w-none object-contain drop-shadow-md transition-transform group-hover:scale-110 ${
                    wide ? 'w-[72px]' : 'h-14 w-14'
                  }`}
                />
              </span>
              <span className="w-full truncate text-center text-[13px] font-semibold text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Bannerlar ── */}
      <section className="grid grid-cols-2 gap-5">
        <div className="relative flex min-h-[230px] flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-brand to-brand-dark p-7 text-white">
          <p className="relative z-10 max-w-[300px] text-[26px] font-black leading-[1.1] tracking-tight">Tez va qulay safar TaxiLine bilan</p>
          <p className="relative z-10 mt-2 max-w-[260px] text-[13px] text-white/85">Ishonchli haydovchilar, aniq narx va onlayn kuzatuv</p>
          <img
            src="/landing/taxi-car-sm.webp"
            alt=""
            className="pointer-events-none absolute -right-14 bottom-6 w-[330px] max-w-none drop-shadow-xl"
          />
          <button
            type="button"
            onClick={() => navigate('/ride')}
            className="relative z-10 mt-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-ink"
          >
            Sinab ko‘ring <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-[230px] flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] p-7 text-white">
          <p className="text-[24px] font-black leading-[1.1] tracking-tight">Tez orada yangi xizmatlar TaxiLine da</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[14px] font-medium">
            {[
              [Wrench, 'Avtoservis'],
              [Fuel, 'Yoqilg‘i shahobchasi'],
              [BusFront, 'Shaharlararo avtobus'],
              [ShieldCheck, 'Yo‘lda yordam'],
              [Sparkles, 'Bonus va chegirmalar'],
            ].map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
