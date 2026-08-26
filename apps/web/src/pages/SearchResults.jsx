import { useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PageTitle } from '../components/ui/ScreenHeader'
import { TripCard } from '../components/trip/TripCard'
import { useApp } from '../context/AppContext'
import { useOffersSearch } from '../lib/queries'
import { services } from '../data/mock'

const filters = [{ id: 'all', title: 'Barchasi' }, ...services.filter((s) => s.id !== 'cargo')]

export default function SearchResults() {
  const { search } = useApp()
  const [filter, setFilter] = useState(search.service === 'cargo' ? 'all' : search.service || 'all')

  const { data: trips = [], isLoading } = useOffersSearch({
    serviceId: filter === 'all' ? undefined : filter,
    date: search.date,
  })

  const list = useMemo(
    () => trips.filter((t) => t.from === search.from && t.to === search.to),
    [trips, search.from, search.to],
  )

  const shown = list.length ? list : trips

  return (
    <div>
      <ScreenHeader title="Safar natijalari" subtitle={`${search.from} → ${search.to} · ${search.time}`} />
      <PageTitle title={`${search.from} → ${search.to}`} subtitle={`${shown.length} ta safar topildi`} />

      <div className="mb-4 flex items-center gap-2">
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                filter === item.id ? 'bg-brand text-white' : 'bg-white text-ink'
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? <p className="text-sm text-muted">Yuklanmoqda…</p> : null}
      {!isLoading && shown.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Hech qanday reys topilmadi.</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  )
}
