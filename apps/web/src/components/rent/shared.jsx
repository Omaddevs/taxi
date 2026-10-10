import { Bike, Heart, Store, UserRound } from 'lucide-react'
import { VEHICLE_TYPE } from '../../data/rentals'
import { cn } from '../../lib/utils'
import { formatKm, mainPrice, ownerName, som } from './rentData'
import { t } from '../../i18n'

// ---------------------------------------------------------------------------------------------
// UI bits
// ---------------------------------------------------------------------------------------------

export function Cover({ src, className, iconClass = 'h-10 w-10' }) {
  if (src) return <img src={src} alt="" loading="lazy" className={cn('object-cover', className)} />
  return (
    <span className={cn('flex items-center justify-center bg-[linear-gradient(140deg,#e0f9fb,#c4f1f5)] text-brand-dark', className)}>
      <Bike className={iconClass} strokeWidth={1.6} />
    </span>
  )
}

export function HeartButton({ active, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={active ? t('Saqlanganlardan olib tashlash') : t('Saqlash')}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-[0_4px_12px_rgba(16,42,67,0.16)] backdrop-blur transition active:scale-90',
        className,
      )}
    >
      <Heart className={cn('h-[18px] w-[18px]', active ? 'fill-[#ff4d6d] text-[#ff4d6d]' : 'text-ink')} strokeWidth={2.2} />
    </button>
  )
}

export function ListingCard({ listing, km, saved, onToggleSave, onOpen }) {
  const type = VEHICLE_TYPE[listing.vehicleType]
  const price = mainPrice(listing)
  const OwnerIcon = listing.ownerType === 'COMPANY' ? Store : UserRound
  return (
    <article className="relative min-w-0">
      <button type="button" onClick={onOpen} className="block w-full text-left active:scale-[0.98] transition-transform">
        <div className="relative overflow-hidden rounded-[22px] bg-canvas">
          <Cover src={listing.cover} className="aspect-[4/5] w-full" />
          {listing.featured ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[linear-gradient(135deg,#ffb020,#ff7a00)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
              {t('Top')}
            </span>
          ) : null}
          {type ? (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
              <type.icon className="h-3 w-3" /> {t(type.label)}
            </span>
          ) : null}
          {listing.photoCount > 1 ? (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {t('{0} foto', listing.photoCount)}
            </span>
          ) : null}
        </div>
        <div className="px-1 pt-2">
          {price ? (
            <p className="text-[17px] font-extrabold leading-tight tracking-tight text-ink">
              {som(price.amount)} <span className="text-[12px] font-bold text-muted">{t('so‘m/')}{t(price.unit)}</span>
            </p>
          ) : null}
          <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink">{t(listing.title)}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-muted">
            <OwnerIcon className="h-3.5 w-3.5 shrink-0 text-brand-dark" />
            <span className="truncate">{ownerName(listing)}</span>
            {Number.isFinite(km) ? <span className="shrink-0">· {formatKm(km)}</span> : null}
          </p>
        </div>
      </button>
      <HeartButton active={saved} onClick={onToggleSave} className="absolute right-2.5 top-2.5" />
    </article>
  )
}

export function EmptyBlock({ title, text, action }) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center rounded-[28px] bg-canvas px-6 py-10 text-center">
      <img src="/home/scooter-rent.webp" alt="" className="h-28 w-28 object-contain drop-shadow-lg" />
      <p className="mt-3 text-[17px] font-extrabold text-ink">{t(title)}</p>
      {text ? <p className="mt-1 max-w-[280px] text-[13px] text-muted">{t(text)}</p> : null}
      {t(action)}
    </div>
  )
}
