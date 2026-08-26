import { useState } from 'react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Badge, Card } from '../components/ui/Button'
import { useMyBookings } from '../lib/queries'
import { bookingToHistoryItem, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../lib/adapters'
import { formatSom } from '../lib/utils'

const tabs = [
  { id: 'all', label: 'Barchasi' },
  { id: 'COMPLETED', label: 'Yakunlangan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
]

export default function TripHistory() {
  const [tab, setTab] = useState('all')
  const { data: bookings = [], isLoading } = useMyBookings({ status: tab === 'all' ? undefined : tab })
  const list = bookings.map(bookingToHistoryItem)

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Safar tarixi" back={false} />
      <PageTitle title="Safar tarixi" subtitle="Yakunlangan va bekor qilingan buyurtmalar" />

      <div className="mb-4 flex gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-brand text-white' : 'bg-white'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-sm text-muted">Yuklanmoqda…</p> : null}
      {!isLoading && list.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Bu bo‘limda safarlar yo‘q.</p>
      ) : null}

      <div className="space-y-3">
        {list.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">
                  {item.from} → {item.to}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {item.date} · {item.driver} · {item.plate}
                </p>
              </div>
              <Badge tone={BOOKING_STATUS_TONE[item.status]}>{BOOKING_STATUS_LABEL[item.status]}</Badge>
            </div>
            <p className="mt-3 text-sm font-extrabold text-brand">{formatSom(item.price)}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
