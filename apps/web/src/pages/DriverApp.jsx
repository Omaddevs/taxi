import { useState } from 'react'
import { ArrowLeft, MessageCircle, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '../components/ui/Button'
import { RouteMap } from '../components/trip/RouteMap'
import { formatSom } from '../lib/utils'
import { api, ApiError } from '../lib/api'
import { services } from '../data/mock'

const STATUS_PRIORITY = { ONGOING: 0, ACCEPTED: 1, PENDING: 2 }

export default function DriverApp() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creatingOffer, setCreatingOffer] = useState(false)
  const [offerForm, setOfferForm] = useState({
    serviceId: 'standart',
    fromLabel: '',
    toLabel: '',
    fromAddress: '',
    toAddress: '',
    departAt: '',
    seatsTotal: 3,
    pricePerSeat: 100000,
  })
  const [offerError, setOfferError] = useState('')

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: () => api.get('/drivers/me/stats'),
    retry: false,
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['driver-bookings'],
    queryFn: () => api.get('/bookings?role=driver'),
    enabled: !!stats,
    refetchInterval: 5000,
  })

  const order = bookings
    .filter((b) => ['PENDING', 'ACCEPTED', 'ONGOING'].includes(b.status))
    .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status])[0]

  const toggleOnline = useMutation({
    mutationFn: (online) => api.patch('/drivers/me/status', { online }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-stats'] }),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['driver-stats'] })
  }

  const accept = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/accept`), onSuccess: invalidate })
  const reject = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/reject`), onSuccess: invalidate })
  const start = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/start`), onSuccess: invalidate })
  const complete = useMutation({ mutationFn: (id) => api.patch(`/bookings/${id}/complete`), onSuccess: invalidate })

  const createOffer = useMutation({
    mutationFn: () =>
      api.post('/drivers/me/offers', {
        ...offerForm,
        seatsTotal: Number(offerForm.seatsTotal),
        pricePerSeat: Number(offerForm.pricePerSeat),
        departAt: new Date(offerForm.departAt).toISOString(),
      }),
    onSuccess: () => {
      setCreatingOffer(false)
      setOfferError('')
    },
    onError: (err) => setOfferError(err instanceof ApiError ? err.message : 'Reys yaratilmadi'),
  })

  if (statsError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="font-bold">Siz hali tasdiqlangan haydovchi emassiz</p>
        <p className="text-sm text-muted">Ariza holatini tekshiring yoki yangi ariza yuboring.</p>
        <Button onClick={() => navigate('/become-driver')}>Ariza yuborish</Button>
      </div>
    )
  }

  if (statsLoading || !stats) {
    return <p className="p-6 text-center text-sm text-muted">Yuklanmoqda…</p>
  }

  return (
    <div className="min-h-svh bg-canvas">
      <header className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => navigate('/')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-bold">Haydovchi ilovasi</p>
        <button
          type="button"
          onClick={() => toggleOnline.mutate(!stats.online)}
          disabled={toggleOnline.isPending}
          className={`rounded-full px-3 py-1 text-xs font-bold ${stats.online ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-ink'}`}
        >
          {stats.online ? 'Online' : 'Offline'}
        </button>
      </header>

      <div className="px-4">
        <Card className="bg-ink p-4 text-white">
          <p className="text-xs text-white/70">Bugungi daromad</p>
          <p className="mt-1 text-2xl font-extrabold">{formatSom(stats.todayEarnings)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">{stats.tripsCount}</p>
              <p className="text-white/60">Safar</p>
            </div>
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">{stats.ratingAvg.toFixed(1)}</p>
              <p className="text-white/60">Reyting</p>
            </div>
            <div className="rounded-xl bg-white/10 py-2">
              <p className="font-bold">{stats.online ? 'Online' : 'Offline'}</p>
              <p className="text-white/60">Holat</p>
            </div>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setCreatingOffer(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft py-3 text-sm font-extrabold text-brand"
        >
          <Plus className="h-4 w-4" /> Yangi reys e'lon qilish
        </button>
      </div>

      {order ? (
        <div className="mt-4 px-4">
          <RouteMap className="h-56" from={order.fromLabel} to={order.toLabel} />
        </div>
      ) : null}

      {stats.online && order ? (
        <div className="fixed inset-x-0 bottom-0 p-4">
          <Card className="p-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-brand">
                  {order.status === 'PENDING' ? 'Yangi buyurtma' : order.status === 'ACCEPTED' ? 'Qabul qilingan' : 'Yo‘lda'}
                </p>
                <p className="mt-1 text-lg font-extrabold">
                  {order.fromLabel} → {order.toLabel}
                </p>
                <p className="text-sm text-muted">{order.seatsBooked} yo‘lovchi</p>
              </div>
              <p className="text-lg font-extrabold text-brand">{formatSom(order.totalPrice)}</p>
            </div>
            {order.status === 'PENDING' ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="soft" className="text-red-500" disabled={reject.isPending} onClick={() => reject.mutate(order.id)}>
                  Rad etish
                </Button>
                <Button disabled={accept.isPending} onClick={() => accept.mutate(order.id)}>
                  Qabul qilish
                </Button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {order.conversationId ? (
                  <Button variant="soft" onClick={() => navigate(`/messages/${order.conversationId}`)}>
                    <MessageCircle className="h-4 w-4" /> Xabar
                  </Button>
                ) : (
                  <span />
                )}
                {order.status === 'ACCEPTED' ? (
                  <Button disabled={start.isPending} onClick={() => start.mutate(order.id)}>
                    Safarni boshlash
                  </Button>
                ) : (
                  <Button disabled={complete.isPending} onClick={() => complete.mutate(order.id)}>
                    Safarni yakunlash
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {creatingOffer ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setCreatingOffer(false)} />
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createOffer.mutate()
            }}
            className="absolute inset-x-0 bottom-0 max-h-[90svh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-lg font-extrabold">Yangi reys e'lon qilish</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted">Qayerdan</label>
                <input
                  value={offerForm.fromLabel}
                  onChange={(e) => setOfferForm((f) => ({ ...f, fromLabel: e.target.value }))}
                  placeholder="Qarshi"
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">Qayerga</label>
                <input
                  value={offerForm.toLabel}
                  onChange={(e) => setOfferForm((f) => ({ ...f, toLabel: e.target.value }))}
                  placeholder="Toshkent"
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                />
              </div>
            </div>
            <label className="mt-3 block text-[11px] font-bold text-muted">Jo‘nash manzili</label>
            <input
              value={offerForm.fromAddress}
              onChange={(e) => setOfferForm((f) => ({ ...f, fromAddress: e.target.value }))}
              placeholder="Ko‘cha, mo‘ljal"
              className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
            />
            <label className="mt-3 block text-[11px] font-bold text-muted">Yetib borish manzili</label>
            <input
              value={offerForm.toAddress}
              onChange={(e) => setOfferForm((f) => ({ ...f, toAddress: e.target.value }))}
              placeholder="Ko‘cha, mo‘ljal"
              className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted">Jo‘nash vaqti</label>
                <input
                  type="datetime-local"
                  value={offerForm.departAt}
                  onChange={(e) => setOfferForm((f) => ({ ...f, departAt: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">Xizmat turi</label>
                <select
                  value={offerForm.serviceId}
                  onChange={(e) => setOfferForm((f) => ({ ...f, serviceId: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                >
                  {services.filter((s) => s.id !== 'cargo').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted">O‘rindiqlar</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={offerForm.seatsTotal}
                  onChange={(e) => setOfferForm((f) => ({ ...f, seatsTotal: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">Narx (1 joy)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={offerForm.pricePerSeat}
                  onChange={(e) => setOfferForm((f) => ({ ...f, pricePerSeat: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-2xl bg-canvas px-3 text-sm outline-none"
                />
              </div>
            </div>
            {offerError ? <p className="mt-2 text-sm font-semibold text-red-500">{offerError}</p> : null}
            <button
              type="submit"
              disabled={createOffer.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
            >
              {createOffer.isPending ? 'Yuborilmoqda…' : 'E’lon qilish'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
