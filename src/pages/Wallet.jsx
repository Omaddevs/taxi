import { useMemo, useState } from 'react'
import { ArrowLeft, Check, CreditCard, Plus, Trash2, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { transactions } from '../data/mock'
import { formatSom } from '../lib/utils'

const CARDS_KEY = 'taxiline-cards'

const DEFAULT_CARDS = [
  { id: 'c1', brand: 'Humo', last4: '4412', holder: 'OTABEK ANVAROV', expiry: '09/28', kind: 'humo' },
  { id: 'c2', brand: 'UzCard', last4: '8831', holder: 'OTABEK ANVAROV', expiry: '03/27', kind: 'uzcard' },
]

function loadCards() {
  try {
    const raw = localStorage.getItem(CARDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CARDS
}

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
  const [cards, setCards] = useState(loadCards)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ pan: '', holder: user.name.toUpperCase(), expiry: '', cvv: '' })
  const [note, setNote] = useState('')

  const persist = (next) => {
    setCards(next)
    localStorage.setItem(CARDS_KEY, JSON.stringify(next))
  }

  const preview = useMemo(() => brandFromPan(form.pan), [form.pan])

  function addCard(e) {
    e.preventDefault()
    const digits = form.pan.replace(/\s/g, '')
    if (digits.length < 16 || form.expiry.length < 5 || form.cvv.length < 3) {
      setNote('Kartani to‘liq kiriting')
      return
    }
    const meta = brandFromPan(form.pan)
    persist([
      ...cards,
      {
        id: `c${Date.now()}`,
        brand: meta.brand,
        kind: meta.kind,
        last4: digits.slice(-4),
        holder: form.holder || user.name.toUpperCase(),
        expiry: form.expiry,
      },
    ])
    setAdding(false)
    setForm({ pan: '', holder: user.name.toUpperCase(), expiry: '', cvv: '' })
    setNote('Karta ulandi')
  }

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
        <p className="mt-1 text-[32px] font-extrabold tracking-tight">{formatSom(user.balance)}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="h-10 flex-1 rounded-2xl bg-white text-sm font-extrabold text-brand">
            To‘ldirish
          </button>
          <button type="button" className="h-10 flex-1 rounded-2xl bg-white/15 text-sm font-extrabold text-white">
            O‘tkazma
          </button>
        </div>
      </header>

      <div className="-mt-4 rounded-t-[28px] bg-canvas px-4 pb-8 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-extrabold">Ulangan kartalar</p>
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
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {cards.map((c) => (
            <article
              key={c.id}
              className={`relative h-44 w-[260px] shrink-0 overflow-hidden rounded-[22px] p-4 text-white shadow-lg ${
                c.kind === 'humo'
                  ? 'bg-gradient-to-br from-[#6d28d9] to-[#4c1d95]'
                  : c.kind === 'uzcard'
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
                <span>{c.holder}</span>
                <span>{c.expiry}</span>
              </div>
              {c.id !== 'c1' && c.id !== 'c2' ? (
                <button
                  type="button"
                  aria-label="Kartani o‘chirish"
                  onClick={() => persist(cards.filter((x) => x.id !== c.id))}
                  className="absolute right-3 top-12 rounded-full bg-black/20 p-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </article>
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-44 w-[160px] shrink-0 flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-brand/40 bg-brand-soft text-brand"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs font-extrabold">Yangi karta</span>
          </button>
        </div>

        {note ? (
          <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${note.includes('to‘liq') ? 'text-red-500' : 'text-success'}`}>
            <Check className="h-3.5 w-3.5" /> {note}
          </p>
        ) : null}

        <p className="mb-2 mt-6 text-sm font-extrabold">So‘nggi tranzaksiyalar</p>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-white">
          {transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted">
                  {item.route} · {item.date}
                </p>
              </div>
              <p className={`text-sm font-extrabold ${item.type === 'in' ? 'text-success' : 'text-ink'}`}>
                {item.amount > 0 ? '+' : ''}
                {formatSom(item.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {adding ? (
        <div className="fixed inset-0 z-[140]">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Yopish" onClick={() => setAdding(false)} />
          <form
            onSubmit={addCard}
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <p className="text-lg font-extrabold">Karta qo‘shish</p>
            <p className="text-xs text-muted">Humo yoki UzCard raqamini kiriting</p>
            <div className={`mt-4 rounded-[22px] p-4 text-white ${preview.kind === 'humo' ? 'bg-[#6d28d9]' : preview.kind === 'uzcard' ? 'bg-[#1d4ed8]' : 'bg-brand'}`}>
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
            <button type="submit" className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white">
              Kartani ulash
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
