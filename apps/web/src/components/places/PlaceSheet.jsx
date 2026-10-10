import { Clock, MapPin, Navigation, Phone, Share2, X } from 'lucide-react'
import { formatSom } from '../../lib/utils'
import { googleMapsUrl, yandexMapsUrl } from '../../lib/geo'
import { t } from '../../i18n'

export function PlaceSheet({ place, onClose, onShare, children }) {
  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {place.brand ? <p className="text-[11px] font-bold uppercase tracking-wide text-brand">{place.brand}</p> : null}
          <p className="text-lg font-extrabold leading-tight">{t(place.name)}</p>
          {place.address ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-3.5 w-3.5 text-brand" />
              {place.address}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas" aria-label={t('Yopish')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
      {place.hours || place.phone ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          {place.hours ? (
            <>
              <Clock className="h-4 w-4" /> {place.hours}
            </>
          ) : null}
          {place.phone ? (
            <a href={`tel:${place.phone.replace(/\s/g, '')}`} className="ml-auto flex items-center gap-1 font-bold text-ink">
              <Phone className="h-3.5 w-3.5 text-brand" /> {place.phone}
            </a>
          ) : null}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href={yandexMapsUrl(place.lat, place.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-center text-[11px] font-extrabold"
        >
          Yandex
        </a>
        <a
          href={googleMapsUrl(place.lat, place.lng)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-2xl bg-canvas text-center text-[11px] font-extrabold"
        >
          Google
        </a>
        <button
          type="button"
          onClick={onShare}
          className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-canvas text-[11px] font-extrabold disabled:opacity-50"
          disabled={!onShare}
        >
          <Share2 className="h-3.5 w-3.5" /> {t('Ulashish')}
        </button>
      </div>
      <a
        href={googleMapsUrl(place.lat, place.lng)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-extrabold text-white"
      >
        <Navigation className="h-4 w-4" /> {t('Yo‘nalish olish')}
      </a>
    </div>
  )
}

export function PriceGrid({ items }) {
  if (!items?.length) return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {items.map((row) => (
        <div key={row.title} className="rounded-2xl bg-canvas px-3 py-2.5">
          <p className="text-[11px] font-semibold text-muted">{t(row.title)}</p>
          <p className="text-[15px] font-extrabold">{formatSom(row.price)}</p>
        </div>
      ))}
    </div>
  )
}

export function PhotoRow({ photos }) {
  if (!photos?.length) return null
  return (
    <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
      {photos.map((src) => (
        <img key={src} src={src} alt="" className="h-28 w-40 shrink-0 rounded-2xl object-cover" />
      ))}
    </div>
  )
}
