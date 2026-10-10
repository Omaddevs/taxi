import { useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PageTitle } from '../components/ui/ScreenHeader'
import { TripCard } from '../components/trip/TripCard'
import { RideRequestCard } from '../components/trip/RideRequestCard'
import { useApp } from '../context/AppContext'
import { useOffersSearch } from '../lib/queries'
import { services } from '../data/mock'
import { t } from '../i18n'

const filters = [{ id: 'all', title: 'Barchasi' }, ...services.filter((s) => s.id !== 'cargo')]

export default function SearchResults() {
  const { search } = useApp()
  const [filter, setFilter] = useState(search.service === 'cargo' ? 'all' : search.service || 'all')

  const { data: trips = [], isLoading } = useOffersSearch({
    serviceId: filter === 'all' ? undefined : filter,
    date: search.date,
  })

  const list = useMemo(
    () => trips.filter((entry) => entry.from === search.from && entry.to === search.to),
    [trips, search.from, search.to],
  )

  const shown = list.length ? list : trips

  return (
    <div>
      <ScreenHeader title={t('Safar natijalari')} subtitle={`${search.from} → ${search.to} · ${search.time}`} />
      <PageTitle title={`${search.from} → ${search.to}`} subtitle={t('{0} ta safar topildi', shown.length)} />

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
              {t(item.title)}
            </button>
          ))}
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? <p className="text-sm text-muted">{t('Yuklanmoqda…')}</p> : null}
      {!isLoading && shown.length === 0 ? <RideRequestCard search={search} prominent /> : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>

      {!isLoading && shown.length > 0 ? (
        <div className="mt-4">
          <RideRequestCard search={search} />
        </div>
      ) : null}
    </div>
  )
}
