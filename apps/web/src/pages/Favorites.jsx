import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { TripCard } from '../components/trip/TripCard'
import { useApp } from '../context/AppContext'
import { offerToTrip } from '../lib/adapters'

export default function Favorites() {
  const { favorites } = useApp()
  const list = favorites.map(offerToTrip)

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Saqlash" />
      <PageTitle title="Saqlash" subtitle="Saqlangan safarlar va haydovchilar" />
      {list.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Hali saqlangan safar yo‘q.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
