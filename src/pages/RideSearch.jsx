import { SearchHero } from '../components/home/SearchHero'
import { PopularTrips } from '../components/home/PopularTrips'
import { trips } from '../data/mock'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'

export default function RideSearch() {
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
