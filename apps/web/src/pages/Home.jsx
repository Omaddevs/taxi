import { Headset, Shield, Sparkles, Wallet } from 'lucide-react'
import { SearchHero } from '../components/home/SearchHero'
import { EcosystemGrid } from '../components/home/EcosystemGrid'
import { ServiceTypes } from '../components/home/ServiceTypes'
import { PopularTrips } from '../components/home/PopularTrips'
import { RightPanel } from '../components/home/RightPanel'
import { MobileHome } from '../components/home/MobileHome'
import { useOffersSearch } from '../lib/queries'

export default function Home() {
  const { data: trips = [] } = useOffersSearch({})

  return (
    <>
      <div className="lg:hidden">
        <MobileHome />
      </div>

      <div className="hidden gap-6 lg:grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative z-20 space-y-6">
          <SearchHero />
          <EcosystemGrid />
          <ServiceTypes />
          <PopularTrips trips={trips.slice(0, 4)} />
          <div className="grid grid-cols-4 gap-3 rounded-2xl bg-white p-4 text-xs text-muted">
            {[
              [Shield, 'Xavfsizlik kafolati'],
              [Headset, '24/7 yordam'],
              [Wallet, 'Qulay to‘lov'],
              [Sparkles, 'Bonus va chegirma'],
            ].map(([Icon, label]) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="hidden xl:block">
          <RightPanel />
        </div>
      </div>
    </>
  )
}
