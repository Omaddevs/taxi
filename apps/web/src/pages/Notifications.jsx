import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, UserRound } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Card } from '../components/ui/Button'
import { api, ApiError } from '../lib/api'
import { DriverHeader } from './driver/ui'

function SatisfactionRating({ ticketId }) {
  const [rating, setRating] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = useMutation({
    mutationFn: (stars) => api.post(`/tickets/${ticketId}/satisfaction`, { rating: stars }),
    onSuccess: () => setDone(true),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 400) {
        setDone(true)
        return
      }
      setError('Xatolik yuz berdi, keyinroq urinib ko‘ring')
    },
  })

  if (done) return <p className="mt-2 text-xs font-semibold text-emerald-600">Rahmat! Bahoyingiz qabul qilindi.</p>

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setRating(n)}
            onClick={() => submit.mutate(n)}
            disabled={submit.isPending}
            aria-label={`${n} yulduz`}
          >
            <Star className={`h-5 w-5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  )
}

const ADMIN_CONTACT_URL = import.meta.env.VITE_ADMIN_CONTACT_URL || 'https://t.me/taxiline_toshkent'

// Subscription expiring/expired reminders (server: subscriptions.lifecycle.ts) carry this refId prefix.
function isSubscriptionNotice(n) {
  return typeof n.refId === 'string' && n.refId.startsWith('subscription-')
}

function AdminContactButton() {
  return (
    <a
      href={ADMIN_CONTACT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white"
    >
      <UserRound className="h-4 w-4" />
      Admin
    </a>
  )
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'hozir'
  if (mins < 60) return `${mins} daqiqa oldin`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} soat oldin`
  return `${Math.floor(hours / 24)} kun oldin`
}

export default function Notifications() {
  const inDriver = useLocation().pathname.startsWith('/driver')
  const queryClient = useQueryClient()
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications'),
  })

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    if (notifications.some((n) => !n.readAt)) markAllRead.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length])

  return (
    <div className={inDriver ? 'overflow-x-clip bg-canvas' : 'mx-auto max-w-xl'}>
      {inDriver ? <DriverHeader title="Xabarnomalar" /> : <ScreenHeader title="Xabarnomalar" />}
      {inDriver ? null : <PageTitle title="Xabarnomalar" subtitle="Buyurtma, promo va to‘lov yangiliklari" />}
      <div className={inDriver ? 'px-5 pb-6 pt-3' : ''}>
      {notifications.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted">Hozircha xabarnomalar yo‘q.</p>
      ) : (
        <Card className="divide-y divide-line">
          {notifications.map((n) => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              {!n.readAt ? <span className="mt-2 h-2 w-2 rounded-full bg-brand" /> : <span className="mt-2 h-2 w-2" />}
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted">{n.text}</p>
                <p className="mt-1 text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
                {n.type === 'TICKET_SATISFACTION' && n.refId ? <SatisfactionRating ticketId={n.refId} /> : null}
                {isSubscriptionNotice(n) ? <AdminContactButton /> : null}
              </div>
            </div>
          ))}
        </Card>
      )}
      </div>
    </div>
  )
}
