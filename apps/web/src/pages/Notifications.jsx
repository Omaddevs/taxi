import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { notifications } from '../data/mock'

export default function Notifications() {
  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Xabarnomalar" />
      <PageTitle title="Xabarnomalar" subtitle="Buyurtma, promo va to‘lov yangiliklari" />
      <Card className="divide-y divide-line">
        {notifications.map((n) => (
          <div key={n.id} className="flex gap-3 px-4 py-3">
            {n.unread ? <span className="mt-2 h-2 w-2 rounded-full bg-brand" /> : <span className="mt-2 h-2 w-2" />}
            <div>
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="text-sm text-muted">{n.text}</p>
              <p className="mt-1 text-[11px] text-muted">{n.time}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
