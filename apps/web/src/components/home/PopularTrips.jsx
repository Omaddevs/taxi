import { Clock, Heart, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { formatSom } from '../../lib/utils'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Button'

export function PopularTrips({ trips }) {
  const { favoriteIds, toggleFavorite } = useApp()
  const navigate = useNavigate()

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Mashhur yo‘nalishlar</h2>
        <Link to="/results" className="text-sm font-semibold text-brand">
          Barchasi
        </Link>
      </div>
      <div className="space-y-3">
        {trips.map((trip) => (
          <Card
            key={trip.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/trip/${trip.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/trip/${trip.id}`)
              }
            }}
            className="cursor-pointer p-4 transition-colors hover:border-brand/40"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold">
                  {trip.from} → {trip.to}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {trip.date}, {trip.time} – {trip.arrive}
                  </span>
                  <span>{trip.seats} ta joy</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {trip.car}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img src={trip.driver.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold">{trip.driver.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {trip.driver.ratingCount > 0 ? trip.driver.rating.toFixed(1) : 'Yangi'}
                  </p>
                </div>
              </div>
              <p className="text-lg font-extrabold text-brand lg:w-40 lg:text-right">{formatSom(trip.price)}</p>
              <div className="flex items-center gap-2">
                <Button onClick={(e) => { e.stopPropagation(); navigate(`/trip/${trip.id}`) }}>Joy band qilish</Button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(trip.id)
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line"
                >
                  <Heart className={`h-5 w-5 ${favoriteIds.has(trip.id) ? 'fill-brand text-brand' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
