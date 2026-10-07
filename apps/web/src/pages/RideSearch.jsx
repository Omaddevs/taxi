import { SearchHero } from '../components/home/SearchHero'
import { PopularTrips } from '../components/home/PopularTrips'
import { useOffersSearch } from '../lib/queries'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { WomenOrderRibbon } from '../components/trip/OrderAudience'
import { useApp } from '../context/AppContext'

export default function RideSearch() {
  const { data: trips = [] } = useOffersSearch({})
  const { search, setSearch } = useApp()
  const women = search.service === 'women'

  return (
    <div>
      <ScreenHeader title="Taxi chaqirish" subtitle="Qayerdan — qayerga" />
      <div className="lg:pt-0">
        <PageTitle title="Taxi chaqirish" subtitle="Shahar ichida va viloyatlararo" />
        {women ? (
          <div className="mb-4 space-y-2">
            <WomenOrderRibbon />
            <button
              type="button"
              onClick={() => setSearch((s) => ({ ...s, service: 'all' }))}
              className="text-xs font-bold text-muted underline underline-offset-2"
            >
              Oddiy taxiga o‘tish
            </button>
          </div>
        ) : null}
        <SearchHero />
        <div className="mt-5">
          <PopularTrips trips={trips.slice(0, 3)} />
        </div>
      </div>
    </div>
  )
}
