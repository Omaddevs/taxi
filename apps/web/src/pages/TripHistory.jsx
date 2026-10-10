import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Badge, Card } from '../components/ui/Button'
import { useRateSheet } from '../components/ui/RateSheet'
import { useMyBookings } from '../lib/queries'
import { api } from '../lib/api'
import { bookingToHistoryItem, botOrderToHistoryItem, BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../lib/adapters'
import { formatSom } from '../lib/utils'
import { DriverHeader } from './driver/ui'
import { t } from '../i18n'

const DRIVER_TAGS = ['Toza salon', 'Xushmuomala', 'Vaqtida keldi', 'Xavfsiz haydash', 'Yoqimli suhbat']

const tabs = [
  { id: 'all', label: 'Barchasi' },
  { id: 'COMPLETED', label: 'Yakunlangan' },
  { id: 'CANCELLED', label: 'Bekor qilingan' },
]

export default function TripHistory() {
  const { pathname } = useLocation()
  const inDriver = pathname.startsWith('/driver')
  const [tab, setTab] = useState('all')
  const { data: bookings = [], isLoading } = useMyBookings({ status: tab === 'all' ? undefined : tab })
  // Bot orders for users also linked to taxiline-bot (User.telegramId) — empty list otherwise,
  // so this merges in cleanly with no extra UI when there's nothing to show.
  const { data: botOrders = [] } = useQuery({
    queryKey: ['bot-orders', 'mine'],
    queryFn: () => api.get('/bot-orders/mine').then((res) => res.orders),
  })

  const list = [...bookings.map(bookingToHistoryItem), ...botOrders.map(botOrderToHistoryItem)]
    .filter((item) => tab === 'all' || item.status === tab)
    .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey))

  const [ratedIds, setRatedIds] = useState(() => new Set())
  const { openRating, sheet } = useRateSheet()
  const rate = useMutation({
    mutationFn: ({ item, stars, tags, comment }) => {
      if (item.source === 'bot') {
        const orderId = Number(String(item.id).replace('bot-', ''))
        return api.post(`/bot-orders/mine/${orderId}/rating`, { stars, tags, comment })
      }
      return api.post(`/bookings/${item.id}/rating`, { stars, tags, comment })
    },
  })

  function handleRate(item) {
    openRating({
      title: t('Haydovchini baholang'),
      subtitle: `${item.from} → ${item.to}`,
      tagOptions: DRIVER_TAGS,
      onSubmit: async ({ stars, tags, comment }) => {
        await rate.mutateAsync({ item, stars, tags, comment })
        setRatedIds((prev) => new Set(prev).add(item.id))
      },
    })
  }

  return (
    <div className={inDriver ? 'min-h-[calc(100svh-88px)] overflow-x-clip bg-canvas' : 'mx-auto max-w-2xl'}>
      {inDriver ? (
        <DriverHeader title={t('Safar tarixi')} />
      ) : (
        <>
          <ScreenHeader title={t('Safar tarixi')} back={false} />
          <PageTitle title={t('Safar tarixi')} subtitle={t('Yakunlangan va bekor qilingan buyurtmalar')} />
        </>
      )}

      <div className={inDriver ? 'px-5 pb-5 pt-5' : ''}>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                tab === item.id ? 'bg-brand text-white' : 'bg-white text-ink shadow-sm'
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-sm text-muted">{t('Yuklanmoqda…')}</p> : null}
        {!isLoading && list.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-[0_8px_30px_rgba(28,28,40,0.04)]">
            {t('Bu bo‘limda safarlar yo‘q.')}
          </p>
        ) : null}

        <div className="space-y-3">
          {list.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="min-w-0 flex-1 font-bold leading-snug">
                      {item.from} → {item.to}
                    </p>
                    {item.womenOnly ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-[#fde7f1] px-2 py-0.5 text-[10px] font-bold text-[#c2185b]">
                        {t('🌸 Ayollar uchun')}
                      </span>
                    ) : null}
                    {item.source === 'bot' ? (
                      <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-muted">
                        {t('Bot')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.date}
                    {item.driver && item.driver !== '—' ? ` · ${item.driver}` : ''}
                    {item.plate && item.plate !== '—' ? ` · ${item.plate}` : ''}
                  </p>
                </div>
                <Badge tone={BOOKING_STATUS_TONE[item.status]} className="shrink-0">
                  {t(BOOKING_STATUS_LABEL[item.status])}
                </Badge>
              </div>
              {item.price != null ? <p className="mt-3 text-sm font-extrabold text-brand">{formatSom(item.price)}</p> : null}
              {!inDriver && item.status === 'COMPLETED' ? (
                ratedIds.has(item.id) ? (
                  <p className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-600">
                    <Star className="h-3.5 w-3.5 fill-emerald-600" /> {t('Baholandi')}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRate(item)}
                    className="mt-3 flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand"
                  >
                    <Star className="h-3.5 w-3.5" /> {t('Haydovchini baholash')}
                  </button>
                )
              ) : null}
            </Card>
          ))}
        </div>
      </div>

      {sheet}
    </div>
  )
}
