import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { payments } from '../data/mock'
import { formatSom } from '../lib/utils'
import { api, ApiError } from '../lib/api'
import { useApp } from '../context/AppContext'

export default function Payment() {
  const { paymentMethod, setPaymentMethod, search } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const booked = location.state ?? null
  const price = booked?.price ?? 350000

  const { data: booking } = useQuery({
    queryKey: ['booking', booked?.bookingId],
    queryFn: () => api.get(`/bookings/${booked.bookingId}`),
    enabled: !!booked?.bookingId,
    refetchInterval: (query) => (['ACCEPTED', 'ONGOING', 'COMPLETED'].includes(query.state.data?.status) ? false : 3000),
  })

  const readyToPay = !booked?.bookingId || ['ACCEPTED', 'ONGOING'].includes(booking?.status)
  const waitingForDriver = booked?.bookingId && booking && booking.status === 'PENDING'

  const charge = useMutation({
    mutationFn: () => api.post('/payments/charge', { bookingId: booked.bookingId, methodId: paymentMethod }),
    onSuccess: () => navigate('/history'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'To‘lov amalga oshmadi'),
  })

  function onConfirm() {
    setError('')
    if (!booked?.bookingId) {
      navigate('/history')
      return
    }
    charge.mutate()
  }

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="To‘lov" />
      <PageTitle title="To‘lov" subtitle="Qulay usulni tanlang va tasdiqlang" />

      <Card className="divide-y divide-line">
        {[...payments, { id: 'wallet', title: 'Hamyon', subtitle: 'Balansdan yechish' }].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPaymentMethod(item.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold ${paymentMethod === item.id ? 'bg-brand text-white' : 'bg-canvas text-brand'}`}>
              {item.title.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="text-xs text-muted">{item.subtitle}</span>
            </span>
            {paymentMethod === item.id ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
        ))}
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold">
          {booked ? `${booked.from} → ${booked.to}` : `${search.from} → ${search.to}`}
        </p>
        <p className="mt-2 text-2xl font-extrabold">{formatSom(price)}</p>
      </Card>

      {waitingForDriver ? (
        <p className="mt-3 text-sm font-semibold text-amber-600">
          Haydovchi bronni hali tasdiqlagani yo‘q. Tasdiqlagach, to‘lovni shu yerdan yakunlashingiz mumkin.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-red-500">{error}</p> : null}

      <Button size="lg" className="mt-4 w-full" disabled={charge.isPending || !readyToPay} onClick={onConfirm}>
        {charge.isPending ? 'Yuborilmoqda…' : waitingForDriver ? 'Haydovchi javobini kutmoqda…' : 'To‘lovni tasdiqlash'}
      </Button>
    </div>
  )
}
