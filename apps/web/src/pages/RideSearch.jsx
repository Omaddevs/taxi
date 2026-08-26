import { SearchHero } from '../components/home/SearchHero'
import { PopularTrips } from '../components/home/PopularTrips'
import { useOffersSearch } from '../lib/queries'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'

export default function RideSearch() {
  const { data: trips = [] } = useOffersSearch({})

  return (
    <div>
      <ScreenHeader title="Taxi chaqirish" subtitle="Qayerdan — qayerga" />
      <div className="lg:pt-0">
        <PageTitle title="Taxi chaqirish" subtitle="Shahar ichida va viloyatlararo" />
        <SearchHero />
        <div className="mt-5">
          <PopularTrips trips={trips.slice(0, 3)} />
        </div>
      </div>
    </div>
  )
}
