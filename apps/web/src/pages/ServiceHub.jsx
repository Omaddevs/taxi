import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { hubs } from '../data/ecosystem'
import { AutoServiceMap, EvMap, FoodMap, ParkingMap, WashMap } from './hubMaps'

export default function ServiceHub() {
  const { slug } = useParams()
  if (slug === 'auto-service') return <AutoServiceMap />
  if (slug === 'wash') return <WashMap />
  if (slug === 'parking') return <ParkingMap />
  if (slug === 'ev') return <EvMap />
  if (slug === 'food') return <FoodMap />
  return <HubFallback slug={slug} />
}

function HubFallback({ slug }) {
  const navigate = useNavigate()
  const hub = hubs[slug]

  if (!hub) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center">
        <p className="font-bold">Bo‘lim topilmadi</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Bosh sahifa
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title={hub.title} subtitle={hub.subtitle} />
      <PageTitle title={hub.title} subtitle={hub.subtitle} />
      <div className="grid gap-3 sm:grid-cols-2">
        {hub.items.map((item) => (
          <Card key={item.title} className="flex items-center justify-between p-4">
            <div>
              <p className="font-bold">{item.title}</p>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Card>
        ))}
      </div>
    </div>
  )
}
