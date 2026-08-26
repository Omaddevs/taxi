import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Phone, Share2, Star, X } from 'lucide-react'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { PageTitle } from '../components/ui/ScreenHeader'
import { RouteMap } from '../components/trip/RouteMap'
import { Badge, Button, Card } from '../components/ui/Button'
import { api } from '../lib/api'
import { offerToTrip, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../lib/adapters'
import { formatSom } from '../lib/utils'
import { useShare } from '../components/ui/ShareSheet'
import { useApp } from '../context/AppContext'

export default function TripDetails() {
  const { id } = useParams()
  const { search, paymentMethod } = useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { share, sheet } = useShare()
  const [booking, setBooking] = useState(null)

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', id],
    queryFn: () => api.get(`/offers/${id}`),
  })

  const createBooking = useMutation({
    mutationFn: () =>
      api.post('/bookings', { rideOfferId: id, seatsBooked: search.passengers || 1, luggage: 0 }),
    onSuccess: (created) => {
      setBooking(created)
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      navigate('/payment', {
        state: { bookingId: created.id, price: created.totalPrice, from: created.fromLabel, to: created.toLabel },
      })
    },
  })

  const cancelBooking = useMutation({
    mutationFn: () => api.patch(`/bookings/${booking.id}/cancel`, { reason: 'Yo‘lovchi tomonidan bekor qilindi' }),
    onSuccess: (updated) => setBooking(updated),
  })

  if (isLoading || !offer) {
    return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
  }

  const trip = offerToTrip(offer)
  const seats = search.passengers || 1
  const totalPrice = trip.price * seats

  const payLabel = { cash: 'Naqd to‘lov', uzcard: 'UzCard', humo: 'Humo', click: 'Click', payme: 'Payme', uzum: 'Uzum Bank' }

  const onShare = () =>
    share({
      title: `TaxiLine: ${trip.from} → ${trip.to}`,
      text: [
        `${trip.from} → ${trip.to}`,
        `${trip.date}, ${trip.time} – ${trip.arrive}`,
        `${trip.driver.name} · ${trip.car} · ${trip.plate}`,
        formatSom(totalPrice),
        window.location.href,
      ].join('\n'),
      url: window.location.href,
    })

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
          { icon: Phone, label: 'Qo‘ng‘iroq', action: 'call' },
          { icon: MessageCircle, label: 'Xabar', action: 'chat' },
          { icon: Share2, label: 'Ulashish', action: 'share' },
          { icon: X, label: 'Bekor', action: 'cancel' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.action === 'chat' && !booking?.conversationId}
            onClick={() => {
              if (item.action === 'call' && trip.driver.phone) window.location.href = `tel:${trip.driver.phone.replace(/\s/g, '')}`
              else if (item.action === 'chat' && booking?.conversationId) navigate(`/messages/${booking.conversationId}`)
              else if (item.action === 'cancel') {
                if (booking && !['CANCELLED', 'COMPLETED'].includes(booking.status)) cancelBooking.mutate()
                else navigate('/history')
              } else if (item.action === 'share') onShare()
            }}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white py-3 text-xs font-medium disabled:opacity-40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <item.icon className="h-4 w-4" />
            </span>
            {item.label}
          </button>
        ))}
      </div>

      <Card className="mt-4 flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted">Jami to‘lov · {seats} joy</p>
          <p className="text-xl font-extrabold">{formatSom(totalPrice)}</p>
        </div>
        <button type="button" onClick={() => navigate('/payment')} className="text-right">
          <p className="text-xs text-muted">To‘lov usuli</p>
          <p className="font-semibold text-brand">{payLabel[paymentMethod]}</p>
        </button>
      </Card>

      {booking ? (
        <Card className="mt-4 flex items-center justify-between p-4">
          <p className="text-sm font-semibold">Bron holati</p>
          <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Badge>
        </Card>
      ) : (
        <Button
          size="lg"
          className="mt-4 w-full"
          disabled={createBooking.isPending}
          onClick={() => createBooking.mutate()}
        >
          {createBooking.isPending ? 'Yuborilmoqda…' : 'Joy band qilish'}
        </Button>
      )}

      {sheet}
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
