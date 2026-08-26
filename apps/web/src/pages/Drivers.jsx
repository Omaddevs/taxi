import { Star } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { drivers } from '../data/mock'

export default function Drivers() {
  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Haydovchilar" />
      <PageTitle title="Haydovchilar" subtitle="Tasdiqlangan haydovchilar bazasi" />
      <div className="grid gap-3 sm:grid-cols-2">
        {drivers.map((d) => (
          <Card key={d.id} className="flex items-center gap-3 p-4">
            <img src={d.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
            <div>
              <p className="font-bold">{d.name}</p>
              <p className="text-xs text-muted">
                {d.car} · {d.city}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {d.rating} · {d.trips} safar
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
