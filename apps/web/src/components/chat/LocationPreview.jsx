import { MapPin } from 'lucide-react'
import { googleMapsUrl, osmTilePreview, yandexMapsUrl } from '../../lib/geo'

export function LocationPreview({ lat, lng, label, mine }) {
  const title = label || 'Joylashuv'
  return (
    <div className="w-[220px] overflow-hidden">
      <div className="relative h-[110px] w-full bg-slate-200">
        <img src={osmTilePreview(lat, lng)} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-brand drop-shadow">
          <MapPin className="h-8 w-8 fill-brand text-white" />
        </span>
      </div>
      <p className={`mt-2 text-[13px] font-bold leading-snug ${mine ? 'text-white' : 'text-ink'}`}>{title}</p>
      <div className="mt-1.5 flex gap-1.5">
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            mine ? 'bg-white/20 text-white' : 'bg-brand-soft text-brand'
          }`}
        >
          Google
        </a>
        <a
          href={yandexMapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
            mine ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
          }`}
        >
          Yandex
        </a>
      </div>
    </div>
  )
}
