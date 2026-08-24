import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MessageCircle, Phone, Share2, Star, X } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PageTitle } from '../components/ui/ScreenHeader'
import { RouteMap } from '../components/trip/RouteMap'
import { Badge, Button, Card } from '../components/ui/Button'
import { trips } from '../data/mock'
import { formatSom } from '../lib/utils'
import { useApp } from '../context/AppContext'

export default function TripDetails() {
  const { id } = useParams()
  const trip = trips.find((t) => t.id === id) || trips[0]
  const { bookTrip, paymentMethod } = useApp()
  const navigate = useNavigate()
  const [started, setStarted] = useState(false)

  const payLabel = { cash: 'Naqd to‘lov', uzcard: 'UzCard', humo: 'Humo', click: 'Click', payme: 'Payme', uzum: 'Uzum Bank' }

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader title="Safar tafsilotlari" subtitle={`${trip.from} → ${trip.to}`} />
      <PageTitle title="Safar tafsilotlari" subtitle={`${trip.from} → ${trip.to}`} />

      <RouteMap from={trip.from} to={trip.to} className="h-52 lg:h-64" />

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold">
          {trip.date}, {trip.time} – {trip.arrive}
        </p>
        <div className="mt-3 space-y-3">
          <Stop color="bg-brand" title={trip.from} text={trip.fromAddress} />
          <Stop color="bg-ink" title={trip.to} text={trip.toAddress} />
        </div>
      </Card>

      <Card className="mt-4 flex items-center gap-3 p-4">
        <img src={trip.driver.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        <div className="flex-1">
          <p className="font-bold">{trip.driver.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {trip.driver.rating} · {trip.car} · {trip.plate}
          </p>
        </div>
        <Badge>{trip.serviceTitle}</Badge>
      </Card>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { icon: Phone, label: 'Qo‘ng‘iroq', to: `tel:${trip.driver.phone}` },
          { icon: MessageCircle, label: 'Xabar', to: '/messages/c1' },
          { icon: Share2, label: 'Ulashish', to: '#' },
          { icon: X, label: 'Bekor', to: '/history' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => item.to.startsWith('/') && navigate(item.to)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white py-3 text-xs font-medium"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted">Jami to‘lov</p>
          <p className="text-xl font-extrabold">{formatSom(trip.price)}</p>
        </div>
        <button type="button" onClick={() => navigate('/payment')} className="text-right">
          <p className="text-xs text-muted">To‘lov usuli</p>
          <p className="font-semibold text-brand">{payLabel[paymentMethod]}</p>
        </button>
      </Card>

      <Button
        size="lg"
        className="mt-4 w-full"
        onClick={() => {
          bookTrip(trip)
          if (!started) {
            navigate('/payment')
          } else {
            navigate('/history')
          }
          setStarted(true)
        }}
      >
        {started ? 'Safarni yakunlash' : 'Joy band qilish'}
      </Button>
    </div>
  )
}

function Stop({ color, title, text }) {
  return (
    <div className="flex gap-3">
      <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{text}</p>
      </div>
    </div>
  )
}
