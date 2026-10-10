import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button, Card } from '../components/ui/Button'
import { formatSom } from '../lib/utils'
import { api, ApiError } from '../lib/api'
import { useApp } from '../context/AppContext'
import { ONLINE_PAYMENTS } from '../lib/features'
import { SoonBadge } from '../components/ui/SoonBadge'
import { t } from '../i18n'

// Card rows come from the rider's own saved cards; these are the methods that need no stored card.
const BASE_METHODS = [
  { id: 'cash', title: 'Naqd pul', subtitle: 'Haydovchiga to‘lov' },
  { id: 'click', title: 'Click', subtitle: 'Mobil to‘lov' },
  { id: 'payme', title: 'Payme', subtitle: 'Mobil to‘lov' },
  { id: 'uzum', title: 'Uzum Bank', subtitle: 'Mobil to‘lov' },
]

export default function Payment() {
  const { paymentMethod: chosenMethod, setPaymentMethod, search } = useApp()
  const paymentMethod = ONLINE_PAYMENTS ? chosenMethod : 'cash'
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const booked = location.state ?? null

  const { data: booking } = useQuery({
    queryKey: ['booking', booked?.bookingId],
    queryFn: () => api.get(`/bookings/${booked.bookingId}`),
    enabled: !!booked?.bookingId,
    refetchInterval: (query) => (['ACCEPTED', 'ONGOING', 'COMPLETED'].includes(query.state.data?.status) ? false : 3000),
  })

  const { data: cards = [] } = useQuery({
    queryKey: ['wallet-cards'],
    queryFn: () => api.get('/wallet/cards'),
    enabled: ONLINE_PAYMENTS,
  })
  const methods = [
    ...BASE_METHODS,
    ...cards.map((c) => ({ id: c.id, title: c.brand, subtitle: `•••• ${c.last4}` })),
    { id: 'wallet', title: t('Hamyon'), subtitle: t('Balansdan yechish') },
  ]
  // The server charges booking.totalPrice — show that, not a client-side guess.
  const price = booking?.totalPrice ?? booked?.price

  // Server accepts payment from ACCEPTED through COMPLETED.
  const readyToPay = !booked?.bookingId || ['ACCEPTED', 'ONGOING', 'COMPLETED'].includes(booking?.status)
  const waitingForDriver = booked?.bookingId && booking && booking.status === 'PENDING'

  const charge = useMutation({
    mutationFn: () => api.post('/payments/charge', { bookingId: booked.bookingId, methodId: paymentMethod }),
    onSuccess: () => navigate('/history'),
    onError: (err) => setError(err instanceof ApiError ? err.message : t('To‘lov amalga oshmadi')),
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
      <ScreenHeader title={t('To‘lov')} />
      <PageTitle title={t('To‘lov')} subtitle={t('Qulay usulni tanlang va tasdiqlang')} />

      <Card className="divide-y divide-line">
        {methods.map((item) => {
          const soon = !ONLINE_PAYMENTS && item.id !== 'cash'
          return (
          <button
            key={item.id}
            type="button"
            disabled={soon}
            onClick={() => setPaymentMethod(item.id)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-extrabold ${paymentMethod === item.id ? 'bg-brand text-white' : 'bg-canvas text-brand'}`}>
              {item.title.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{t(item.title)}</span>
              <span className="text-xs text-muted">{t(item.subtitle)}</span>
            </span>
            {soon ? <SoonBadge /> : paymentMethod === item.id ? <Check className="h-5 w-5 text-brand" /> : null}
          </button>
          )
        })}
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold">
          {booked ? `${booked.from} → ${booked.to}` : `${search.from} → ${search.to}`}
        </p>
        <p className="mt-2 text-2xl font-extrabold">{price ? formatSom(price) : '—'}</p>
      </Card>

      {waitingForDriver ? (
        <p className="mt-3 text-sm font-semibold text-amber-600">
          {t('Haydovchi bronni hali tasdiqlagani yo‘q. Tasdiqlagach, to‘lovni shu yerdan yakunlashingiz mumkin.')}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-red-500">{t(error)}</p> : null}

      <Button size="lg" className="mt-4 w-full" disabled={charge.isPending || !readyToPay} onClick={onConfirm}>
        {charge.isPending ? t('Yuborilmoqda…') : waitingForDriver ? t('Haydovchi javobini kutmoqda…') : t('To‘lovni tasdiqlash')}
      </Button>
    </div>
  )
}
