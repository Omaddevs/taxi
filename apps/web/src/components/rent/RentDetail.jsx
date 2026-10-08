import { useState } from 'react'
import { MapContainer, Marker } from 'react-leaflet'
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  Eye,
  Gauge,
  IdCard,
  MapPin,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react'
import { BaseTiles } from '../map/BaseTiles'
import { useShare } from '../ui/ShareSheet'
import { googleMapsUrl, yandexMapsUrl } from '../../lib/geo'
import { OWNER_LABEL, VEHICLE_TYPE, RENT_SCOOTER_COLOR } from '../../data/rentals'
import { cn } from '../../lib/utils'
import { pinIcon } from '../places/PlacesMap'
import { Cover, HeartButton } from './shared'
import { distanceKm, formatKm, ownerName, som, useOrigin, useRental, useRentFavorites } from './rentData'
import 'leaflet/dist/leaflet.css'

const ROUND = 'flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_4px_12px_rgba(16,42,67,0.16)] backdrop-blur active:scale-90 transition'

export function RentDetail({ id, onBack }) {
  const { data: l, isLoading, isError } = useRental(id)
  const favs = useRentFavorites()
  const origin = useOrigin()
  const { share, sheet } = useShare()
  const [slide, setSlide] = useState(0)

  if (isLoading || isError || !l) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center p-4">
          <button type="button" onClick={onBack} className={ROUND} aria-label="Orqaga">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="px-4">
            <div className="aspect-[4/3] animate-pulse rounded-[24px] bg-canvas" />
            <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-canvas" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-canvas" />
          </div>
        ) : (
          <p className="mt-16 px-6 text-center text-[15px] font-semibold text-muted">
            E’lon topilmadi yoki olib tashlangan.
          </p>
        )}
      </div>
    )
  }

  const type = VEHICLE_TYPE[l.vehicleType]
  const km = distanceKm(origin, l)
  const hasPoint = l.lat != null && l.lng != null
  const photos = l.photos?.length ? l.photos : [null]
  const prices = [
    { label: 'Soatiga', value: l.pricePerHour },
    { label: 'Kuniga', value: l.pricePerDay },
    { label: 'Haftasiga', value: l.pricePerWeek },
  ].filter((p) => p.value)
  const specs = [
    l.maxSpeed ? { icon: Gauge, label: `${l.maxSpeed} km/soat`, hint: 'Maks. tezlik' } : null,
    l.rangeKm ? { icon: BatteryCharging, label: `${l.rangeKm} km`, hint: 'Bir zaryadda' } : null,
    { icon: IdCard, label: l.licenseRequired ? 'Kerak' : 'Shart emas', hint: 'Guvohnoma' },
  ].filter(Boolean)
  const telegram = l.telegram ? `https://t.me/${l.telegram}` : null
  const shareUrl = `${window.location.origin}/?ijara=1&elon=${l.id}`

  const onScroll = (e) => {
    const el = e.currentTarget
    setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:pb-24">
        {/* ── Galereya ── (desktop: chap ustunda, yopishqoq) */}
        <div className="relative bg-canvas lg:sticky lg:top-0 lg:m-6 lg:overflow-hidden lg:rounded-[28px]">
          <div onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {photos.map((src, i) => (
              <Cover key={i} src={src} className="aspect-[4/3] w-full shrink-0 snap-center" iconClass="h-16 w-16" />
            ))}
          </div>
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button type="button" onClick={onBack} className={ROUND} aria-label="Orqaga">
              <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={ROUND}
                aria-label="Ulashish"
                onClick={() => share({ title: l.title, text: `${l.title}\n${shareUrl}`, url: shareUrl })}
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>
              <HeartButton active={favs.has(l.id)} onClick={() => favs.toggle(l.id)} className="h-10 w-10" />
            </div>
          </div>
          {photos.length > 1 ? (
            <div className="absolute inset-x-0 bottom-9 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <span key={i} className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/60')} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative -mt-6 rounded-t-[28px] bg-white px-4 pt-5 lg:mt-0 lg:px-8 lg:pt-8">
          <div className="flex flex-wrap items-center gap-1.5">
            {type ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-bold text-brand-dark">
                <type.icon className="h-3.5 w-3.5" /> {type.label}
              </span>
            ) : null}
            {l.featured ? (
              <span className="rounded-full bg-[linear-gradient(135deg,#ffb020,#ff7a00)] px-2.5 py-1 text-[11px] font-extrabold uppercase text-white">
                Top
              </span>
            ) : null}
            {Number.isFinite(km) ? (
              <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-muted">{formatKm(km)} uzoqlikda</span>
            ) : null}
          </div>
          <h1 className="mt-2.5 text-[22px] font-extrabold leading-tight tracking-tight text-ink">{l.title}</h1>
          {l.brand || l.model ? <p className="mt-0.5 text-[14px] text-muted">{[l.brand, l.model].filter(Boolean).join(' ')}</p> : null}

          {/* ── Narxlar ── */}
          <div className={cn('mt-4 grid gap-2', prices.length === 1 ? 'grid-cols-1' : prices.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            {prices.map((p) => (
              <div
                key={p.label}
                className={cn(
                  'rounded-[18px] px-3 py-3',
                  p.label === 'Kuniga' ? 'bg-[linear-gradient(140deg,#00c7d4,#00a3ae)] text-white' : 'bg-canvas text-ink',
                )}
              >
                <p className={cn('text-[11px] font-semibold', p.label === 'Kuniga' ? 'text-white/85' : 'text-muted')}>{p.label}</p>
                <p className="mt-0.5 text-[16px] font-extrabold leading-tight">{som(p.value)}</p>
                <p className={cn('text-[11px] font-semibold', p.label === 'Kuniga' ? 'text-white/85' : 'text-muted')}>so‘m</p>
              </div>
            ))}
          </div>
          {l.deposit ? (
            <p className="mt-2 flex items-center gap-2 rounded-[16px] bg-amber-50 px-3 py-2.5 text-[13px] font-semibold text-amber-800">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Zalog (qaytariladigan depozit): {som(l.deposit)} so‘m
            </p>
          ) : null}

          {/* ── Xususiyatlar ── */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {specs.map((s) => (
              <div key={s.hint} className="rounded-[18px] border border-line px-3 py-3">
                <s.icon className="h-5 w-5 text-brand-dark" />
                <p className="mt-1.5 text-[14px] font-extrabold text-ink">{s.label}</p>
                <p className="text-[11px] text-muted">{s.hint}</p>
              </div>
            ))}
          </div>

          {l.description ? (
            <section className="mt-5">
              <h2 className="text-[16px] font-extrabold text-ink">Tavsif</h2>
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink/90">{l.description}</p>
            </section>
          ) : null}

          {/* ── Joylashuv ── */}
          {hasPoint || l.address ? (
            <section className="mt-5">
              <h2 className="text-[16px] font-extrabold text-ink">Qayerdan olish mumkin</h2>
              {l.address ? (
                <p className="mt-1 flex items-start gap-1.5 text-[14px] text-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {l.address}
                </p>
              ) : null}
              {hasPoint ? (
                <>
                  <div className="isolate mt-2.5 h-[160px] overflow-hidden rounded-[20px]">
                    <MapContainer
                      center={[l.lat, l.lng]}
                      zoom={15}
                      className="h-full w-full"
                      zoomControl={false}
                      attributionControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      touchZoom={false}
                    >
                      <BaseTiles />
                      <Marker position={[l.lat, l.lng]} icon={pinIcon(RENT_SCOOTER_COLOR, ownerName(l), true)} />
                    </MapContainer>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <a
                      href={yandexMapsUrl(l.lat, l.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-[13px] font-extrabold text-ink"
                    >
                      Yandex xarita
                    </a>
                    <a
                      href={googleMapsUrl(l.lat, l.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-[13px] font-extrabold text-ink"
                    >
                      Google xarita
                    </a>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {/* ── Egasi ── */}
          <section className="mt-5 flex items-center gap-3 rounded-[22px] bg-canvas p-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm">
              {l.ownerType === 'COMPANY' ? <Store className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[15px] font-extrabold text-ink">
                <span className="truncate">{ownerName(l)}</span>
                {l.ownerType === 'COMPANY' ? <BadgeCheck className="h-4 w-4 shrink-0 text-brand" /> : null}
              </p>
              <p className="truncate text-[12px] text-muted">
                {OWNER_LABEL[l.ownerType]}
                {l.ownerType === 'COMPANY' && l.contactName ? ` · ${l.contactName}` : ''}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-muted">
              <Eye className="h-3.5 w-3.5" /> {l.views}
            </span>
          </section>

          <p className="mt-3 rounded-[18px] border border-dashed border-line px-3.5 py-3 text-[12px] leading-relaxed text-muted">
            <b className="text-ink">Xavfsiz ijara:</b> oldindan pul o‘tkazmang. Transportni ko‘rib, holatini tekshirib, shartnoma
            yoki tilxat asosida oling. Shlem va qulf so‘rashni unutmang.
          </p>
        </div>
      </div>

      {/* ── Bog‘lanish ── */}
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-line bg-white px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:left-[51%] lg:border-l lg:px-8">
        {telegram ? (
          <a
            href={telegram}
            target="_blank"
            rel="noreferrer"
            className="flex h-13 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e7f5fd] text-[#229ed9]"
            aria-label="Telegramda yozish"
          >
            <Send className="h-5 w-5" />
          </a>
        ) : null}
        <a
          href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-[18px] bg-brand text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(0,199,212,0.35)]"
        >
          <Phone className="h-5 w-5" /> Qo‘ng‘iroq qilish
        </a>
      </div>
      {sheet}
    </div>
  )
}
