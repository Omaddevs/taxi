import { useMemo, useState } from 'react'
import { ArrowLeft, Check, CreditCard, Plus, Trash2, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApp } from '../context/AppContext'
import { api, ApiError } from '../lib/api'
import { formatSom } from '../lib/utils'
import { ONLINE_PAYMENTS } from '../lib/features'
import { SoonBadge } from '../components/ui/SoonBadge'

function formatPan(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function brandFromPan(pan) {
  const d = pan.replace(/\s/g, '')
  if (d.startsWith('9860')) return { brand: 'Humo', kind: 'humo' }
  if (d.startsWith('8600')) return { brand: 'UzCard', kind: 'uzcard' }
  return { brand: 'Karta', kind: 'other' }
}

export default function Wallet() {
  const navigate = useNavigate()
  const { user } = useApp()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [toppingUp, setToppingUp] = useState(false)
  const [payingOut, setPayingOut] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutCardId, setPayoutCardId] = useState('')
  const [form, setForm] = useState({ pan: '', holder: user?.name?.toUpperCase() || '', expiry: '', cvv: '' })
  const [note, setNote] = useState('')

  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet') })
  const { data: cards = [] } = useQuery({ queryKey: ['wallet-cards'], queryFn: () => api.get('/wallet/cards') })

  const addCardMutation = useMutation({
    mutationFn: (payload) => api.post('/wallet/cards', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-cards'] })
      setAdding(false)
      setNote('Karta ulandi')
    },
    onError: (err) => setNote(err instanceof ApiError ? err.message : 'Kartani to‘liq kiriting'),
  })

  const deleteCardMutation = useMutation({
    mutationFn: (id) => api.delete(`/wallet/cards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet-cards'] }),
  })

  const topupMutation = useMutation({
    mutationFn: (amount) => api.post('/wallet/topup', { amount, methodId: 'click' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setToppingUp(false)
      setTopupAmount('')
      setNote('Hisob to‘ldirildi')
    },
    onError: (err) => setNote(err instanceof ApiError ? err.message : 'To‘ldirishda xatolik'),
  })

  const payoutMutation = useMutation({
    mutationFn: ({ amount, cardId }) => api.post('/wallet/payout', { amount, cardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setPayingOut(false)
      setPayoutAmount('')
      setNote('Mablag‘ kartaga o‘tkazildi')
    },
    onError: (err) => setNote(err instanceof ApiError ? err.message : 'O‘tkazmada xatolik'),
  })

  const preview = useMemo(() => brandFromPan(form.pan), [form.pan])

  function addCard(e) {
    e.preventDefault()
    const digits = form.pan.replace(/\s/g, '')
    if (digits.length < 16 || form.expiry.length < 5 || form.cvv.length < 3) {
      setNote('Kartani to‘liq kiriting')
      return
    }
    const meta = brandFromPan(form.pan)
    addCardMutation.mutate({
      providerToken: `demo_${digits.slice(-4)}_${Date.now()}`,
      brand: meta.brand,
      last4: digits.slice(-4),
    })
    setForm({ pan: '', holder: user?.name?.toUpperCase() || '', expiry: '', cvv: '' })
  }

  function submitPayout(e) {
    e.preventDefault()
    const amount = Number(payoutAmount)
    const cardId = payoutCardId || cards[0]?.id
    if (!cardId) {
      setNote('Avval karta qo‘shing')
      setPayingOut(false)
      setAdding(true)
      return
    }
    if (!amount || amount < 1000) {
      setNote('Minimal summa 1 000 so‘m')
      return
    }
    payoutMutation.mutate({ amount, cardId })
  }

  function submitTopup(e) {
    e.preventDefault()
    const amount = Number(topupAmount)
    if (!amount || amount < 1000) return
    topupMutation.mutate(amount)
  }

  if (!user) return null

  return (
    <div className="min-h-[calc(100svh-5.5rem)] bg-canvas">
      <header className="bg-gradient-to-br from-brand to-brand-dark px-4 pb-8 pt-[max(12px,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
            aria-label="Orqaga"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-base font-extrabold">Hamyon</h1>
          <WalletCards className="h-5 w-5 text-white/80" />
        </div>
        <p className="mt-6 text-xs font-semibold text-white/70">Joriy balans</p>
        <p className="mt-1 text-[32px] font-extrabold tracking-tight">{formatSom(wallet?.balance ?? user.balance)}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={!ONLINE_PAYMENTS}
            onClick={() => setToppingUp(true)}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white text-sm font-extrabold text-brand disabled:opacity-80"
          >
            To‘ldirish
            {ONLINE_PAYMENTS ? null : <SoonBadge />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!cards.length) {
                setNote('Avval karta qo‘shing')
                setAdding(true)
                return
              }
              setPayoutCardId(cards.find((c) => c.isDefault)?.id || cards[0].id)
              setPayingOut(true)
              setNote('')
            }}
            disabled={!ONLINE_PAYMENTS}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white/15 text-sm font-extrabold text-white disabled:opacity-80"
          >
            O‘tkazma
            {ONLINE_PAYMENTS ? null : <SoonBadge />}
          </button>
        </div>
      </header>

      <div className="-mt-4 rounded-t-2xl bg-canvas px-4 pb-8 pt-5">
        {ONLINE_PAYMENTS ? null : (
          <p className="mb-4 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-medium leading-snug text-amber-700">
            Hisobni to‘ldirish, pul yechish va karta orqali to‘lov tez orada ishga tushadi. Hozircha safar uchun
            haydovchiga naqd pul bilan to‘lang.
          </p>
        )}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold">Ulangan kartalar</p>
          {ONLINE_PAYMENTS ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true)
                setNote('')
              }}
              className="inline-flex items-center gap-1 text-xs font-extrabold text-brand"
            >
              <Plus className="h-3.5 w-3.5" /> Karta qo‘shish
            </button>
          ) : (
            <SoonBadge />
          )}
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {cards.map((c) => {
            const kind = c.brand === 'Humo' ? 'humo' : c.brand === 'UzCard' ? 'uzcard' : 'other'
            return (
              <article
                key={c.id}
                className={`relative h-44 w-[260px] shrink-0 overflow-hidden rounded-2xl p-4 text-white shadow-lg ${
                  kind === 'humo'
                    ? 'bg-gradient-to-br from-[#6d28d9] to-[#4c1d95]'
                    : kind === 'uzcard'
                      ? 'bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a]'
                      : 'bg-gradient-to-br from-brand to-brand-dark'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-extrabold">{c.brand}</p>
                  <CreditCard className="h-5 w-5 opacity-80" />
                </div>
                <p className="mt-8 text-[17px] font-bold tracking-[0.18em]">•••• •••• •••• {c.last4}</p>
                <div className="mt-6 flex items-end justify-between text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  <span>{user.name?.toUpperCase() || user.phone}</span>
                  <span>{c.isDefault ? 'Asosiy' : ''}</span>
                </div>
                <button
                  type="button"
                  aria-label="Kartani o‘chirish"
                  onClick={() => deleteCardMutation.mutate(c.id)}
                  className="absolute right-3 top-12 rounded-full bg-black/20 p-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </article>
            )
          })}
          <button
            type="button"
            disabled={!ONLINE_PAYMENTS}
            onClick={() => setAdding(true)}
            className="flex h-44 w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft text-brand disabled:opacity-70"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-extrabold">Yangi karta</span>
            {ONLINE_PAYMENTS ? null : <SoonBadge />}
          </button>
        </div>

        {note ? (
          <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${note.includes('to‘liq') ? 'text-red-500' : 'text-success'}`}>
            <Check className="h-3.5 w-3.5" /> {note}
          </p>
        ) : null}

        <p className="mb-2 mt-6 text-sm font-extrabold">So‘nggi tranzaksiyalar</p>
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white">
          {(wallet?.recentTransactions ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Hali tranzaksiyalar yo‘q</p>
          ) : null}
          {(wallet?.recentTransactions ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted">
                  {item.routeLabel || item.provider} · {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                </p>
              </div>
              <p className={`text-sm font-extrabold ${item.amount > 0 ? 'text-success' : 'text-ink'}`}>
                {item.amount > 0 ? '+' : ''}
                {formatSom(item.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {toppingUp ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setToppingUp(false)} />
          <form
            onSubmit={submitTopup}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-lg font-extrabold">Hisobni to‘ldirish</p>
            <p className="text-xs text-muted">Summani kiriting</p>
            <input
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="100 000"
              className="mt-4 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
            />
            <button
              type="submit"
              disabled={topupMutation.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
            >
              {topupMutation.isPending ? 'Yuklanmoqda…' : 'Toʻldirish'}
            </button>
          </form>
        </div>
      ) : null}

      {payingOut ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setPayingOut(false)} />
          <form
            onSubmit={submitPayout}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-lg font-extrabold">Kartaga yechish</p>
            <p className="text-xs text-muted">Daromadni ulangan kartaga o‘tkazing</p>
            <div className="mt-3 space-y-1.5">
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPayoutCardId(c.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${
                    payoutCardId === c.id ? 'bg-brand-soft text-brand ring-1 ring-brand/30' : 'bg-canvas'
                  }`}
                >
                  <span>
                    {c.brand} •••• {c.last4}
                  </span>
                  {c.isDefault ? <span className="text-[11px] font-semibold text-muted">Asosiy</span> : null}
                </button>
              ))}
            </div>
            <input
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="100 000"
              className="mt-4 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
            />
            <button
              type="submit"
              disabled={payoutMutation.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
            >
              {payoutMutation.isPending ? 'Yuborilmoqda…' : 'O‘tkazish'}
            </button>
          </form>
        </div>
      ) : null}

      {adding ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setAdding(false)} />
          <form
            onSubmit={addCard}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-lg font-extrabold">Karta qo‘shish</p>
            <p className="text-xs text-muted">Humo yoki UzCard raqamini kiriting</p>
            <div className={`mt-4 rounded-2xl p-4 text-white ${preview.kind === 'humo' ? 'bg-[#6d28d9]' : preview.kind === 'uzcard' ? 'bg-[#1d4ed8]' : 'bg-brand'}`}>
              <p className="text-xs font-bold">{preview.brand}</p>
              <p className="mt-6 text-lg font-bold tracking-[0.12em]">{form.pan || '•••• •••• •••• ••••'}</p>
            </div>
            <label className="mt-4 block text-[11px] font-bold text-muted">Karta raqami</label>
            <input
              value={form.pan}
              onChange={(e) => setForm((f) => ({ ...f, pan: formatPan(e.target.value) }))}
              inputMode="numeric"
              placeholder="8600 12•• •••• 4412"
              className="mt-1 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
            />
            <label className="mt-3 block text-[11px] font-bold text-muted">Egasi</label>
            <input
              value={form.holder}
              onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value.toUpperCase() }))}
              className="mt-1 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted">Amal muddati</label>
                <input
                  value={form.expiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setForm((f) => ({ ...f, expiry: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v }))
                  }}
                  placeholder="09/28"
                  className="mt-1 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted">CVV</label>
                <input
                  value={form.cvv}
                  onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                  inputMode="numeric"
                  placeholder="•••"
                  className="mt-1 h-12 w-full rounded-2xl bg-canvas px-4 text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addCardMutation.isPending}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white disabled:opacity-50"
            >
              {addCardMutation.isPending ? 'Ulanmoqda…' : 'Kartani ulash'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
