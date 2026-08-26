import { ArrowRight, Clock, Heart, MapPin, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Button'
import { formatSom } from '../../lib/utils'
import { useApp } from '../../context/AppContext'

export function TripCard({ trip, compact = false }) {
  const { favoriteIds, toggleFavorite } = useApp()
  const liked = favoriteIds.has(trip.id)

  if (compact) {
    return (
      <Link to={`/trip/${trip.id}`} className="flex items-center justify-between gap-3 py-3">
        <div>
          <p className="text-sm font-semibold">
            {trip.from} → {trip.to}
          </p>
          <p className="text-xs text-muted">
            {trip.date}, {trip.time}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand">{formatSom(trip.price)}</p>
          <Badge tone="green">Bajarilgan</Badge>
        </div>
      </Link>
    )
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[0_8px_24px_rgba(28,28,40,0.04)]">
      <div className="flex gap-4">
        <img src={trip.carImage} alt={trip.car} className="h-20 w-28 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold">{trip.serviceTitle}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {trip.driver.rating} · {trip.car}
              </p>
            </div>
            <button type="button" onClick={() => toggleFavorite(trip.id)} className="text-slate-300">
              <Heart className={`h-5 w-5 ${liked ? 'fill-brand text-brand' : ''}`} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {trip.seats} joy
            </span>
            <span>{trip.luggage} bagaj</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {trip.time}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-brand" />
            {trip.from} <ArrowRight className="h-3.5 w-3.5 text-muted" /> {trip.to}
          </p>
          <p className="text-lg font-extrabold text-brand">{formatSom(trip.price)}</p>
        </div>
        <Link
          to={`/trip/${trip.id}`}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
        >
          Joy band qilish
        </Link>
      </div>
    </article>
  )
}
