import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Banknote, Check, ChevronRight, CreditCard, Plus, ShieldCheck, Wallet } from 'lucide-react'
import { ScreenHeader, PageTitle } from '../components/ui/ScreenHeader'
import { Button } from '../components/ui/Button'
import { cn, formatSom } from '../lib/utils'
import { priceLabel } from '../lib/ride'
import { api, ApiError } from '../lib/api'
import { useApp } from '../context/AppContext'
import { ONLINE_PAYMENTS } from '../lib/features'
import { SoonBadge } from '../components/ui/SoonBadge'
import { t } from '../i18n'

// Methods that need no stored card. Until a real provider is live (ONLINE_PAYMENTS) everything
// but cash stays "Tez orada". `mark` is the wordmark drawn on the method's brand-coloured tile.
const METHODS = [
  { id: 'cash', title: 'Naqd pul', subtitle: 'Safar oxirida haydovchiga', icon: Banknote, tile: 'bg-emerald-50 text-emerald-600' },
  { id: 'click', title: 'Click', subtitle: 'Click ilovasi orqali', mark: 'click', tile: 'bg-[#4c8dff] text-white' },
  { id: 'payme', title: 'Payme', subtitle: 'Payme ilovasi orqali', mark: 'payme', tile: 'bg-[#33cccc] text-white' },
  { id: 'uzum', title: 'Uzum Bank', subtitle: 'Uzum ilovasi orqali', mark: 'uzum', tile: 'bg-[#7b2ff7] text-white' },
]

const cardClass = 'overflow-hidden rounded-[22px] bg-white shadow-[0_6px_20px_rgba(16,42,67,0.05)]'

function SectionTitle({ children }) {
  return <h2 className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{children}</h2>
}

function Tile({ className, icon: Icon, mark }) {
  return (
    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', className)}>
      {Icon ? <Icon className="h-6 w-6" /> : <span className="text-[11px] font-black lowercase tracking-tight">{mark}</span>}
    </span>
  )
}

function Row({ tile, title, subtitle, muted, right, ...props }) {
  const Tag = props.to ? Link : 'button'
  return (
    <Tag
      {...(props.to ? {} : { type: 'button' })}
      {...props}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left disabled:cursor-not-allowed"
    >
      {tile}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[16px] font-extrabold', muted ? 'text-slate-400' : 'text-ink')}>{title}</span>
        <span className={cn('block truncate text-[13px]', muted ? 'text-slate-400' : 'text-muted')}>{subtitle}</span>
      </span>
      {right}
    </Tag>
  )
}

const Selected = () => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
    <Check className="h-3.5 w-3.5" strokeWidth={3} />
  </span>
)
const Chevron = () => <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />

// "To‘lov": how the trip is paid. Opened from the ride screen it just records the method for the
// request being built; opened for a booking (location.state.bookingId) it also charges it.
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
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet') })
  const { data: cards = [] } = useQuery({
    queryKey: ['wallet-cards'],
    queryFn: () => api.get('/wallet/cards'),
    enabled: ONLINE_PAYMENTS,
  })

  // The server charges booking.totalPrice — show that, not a client-side guess. Without a
  // booking this is the fare of the request being built on the ride screen.
  const bookingPrice = booking?.totalPrice ?? booked?.price
  const amount = booked ? (bookingPrice ? formatSom(bookingPrice) : '—') : priceLabel(search.priceMode === 'offer' ? search.price : null)
  const from = booked?.from ?? search.from
  const to = booked?.to ?? search.to

  // Server accepts payment from ACCEPTED through COMPLETED.
  const readyToPay = ['ACCEPTED', 'ONGOING', 'COMPLETED'].includes(booking?.status)
  const waitingForDriver = booked?.bookingId && booking && booking.status === 'PENDING'

  const charge = useMutation({
    mutationFn: () => api.post('/payments/charge', { bookingId: booked.bookingId, methodId: paymentMethod }),
    onSuccess: () => navigate('/history'),
    onError: (err) => setError(err instanceof ApiError ? err.message : t('To‘lov amalga oshmadi')),
  })

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title={t('To‘lov')} />
      <PageTitle title={t('To‘lov')} subtitle={t('Qulay usulni tanlang va tasdiqlang')} />

      <section className="rounded-[24px] bg-ink px-5 py-5 text-white">
        <p className="text-[13px] font-medium text-white/70">{t('To‘lanadigan summa')}</p>
        <p className="mt-1 text-[32px] font-black leading-none tracking-tight">{amount}</p>
        {from && to ? (
          <p className="mt-2.5 text-[14px] leading-snug text-white/80">
            {from} → {to}
          </p>
        ) : null}
      </section>

      <SectionTitle>{t('To‘lov usuli')}</SectionTitle>
      <div className={cn(cardClass, 'divide-y divide-line')}>
        {METHODS.map((item) => {
          const soon = !ONLINE_PAYMENTS && item.id !== 'cash'
          return (
            <Row
              key={item.id}
              disabled={soon}
              onClick={() => setPaymentMethod(item.id)}
              aria-pressed={paymentMethod === item.id}
              tile={<Tile className={cn(item.tile, soon && 'opacity-80')} icon={item.icon} mark={item.mark} />}
              title={t(item.title)}
              subtitle={t(item.subtitle)}
              muted={soon}
              right={soon ? <SoonBadge /> : paymentMethod === item.id ? <Selected /> : null}
            />
          )
        })}
      </div>

      <SectionTitle>{t('Hamyon va kartalar')}</SectionTitle>
      <div className={cn(cardClass, 'divide-y divide-line')}>
        <Row
          {...(ONLINE_PAYMENTS ? { onClick: () => setPaymentMethod('wallet'), 'aria-pressed': paymentMethod === 'wallet' } : { to: '/wallet' })}
          tile={<Tile className="bg-brand-soft text-brand-dark" icon={Wallet} />}
          title={t('Hamyon')}
          subtitle={t('Balans: {0}', formatSom(wallet?.balance ?? 0))}
          right={ONLINE_PAYMENTS && paymentMethod === 'wallet' ? <Selected /> : <Chevron />}
        />
        {cards.map((c) => (
          <Row
            key={c.id}
            onClick={() => setPaymentMethod(c.id)}
            aria-pressed={paymentMethod === c.id}
            tile={<Tile className="bg-canvas text-ink" icon={CreditCard} />}
            title={c.brand}
            subtitle={`•••• ${c.last4}`}
            right={paymentMethod === c.id ? <Selected /> : null}
          />
        ))}
        <Row
          to="/wallet"
          tile={
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-brand text-brand">
              <Plus className="h-5 w-5" />
            </span>
          }
          title={t('Karta qo‘shish')}
          subtitle={t('Humo, UzCard, Visa yoki Mastercard')}
          right={<Chevron />}
        />
      </div>

      <p className="mt-4 flex items-start gap-2 px-1 text-[13px] leading-snug text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        {t('Karta ma’lumotlari himoyalangan: to‘liq raqam va CVV saqlanmaydi.')}
      </p>

      {booked?.bookingId ? (
        <>
          {waitingForDriver ? (
            <p className="mt-4 text-sm font-semibold text-amber-600">
              {t('Haydovchi bronni hali tasdiqlagani yo‘q. Tasdiqlagach, to‘lovni shu yerdan yakunlashingiz mumkin.')}
            </p>
          ) : null}
          {error ? <p className="mt-3 text-sm font-semibold text-red-500">{t(error)}</p> : null}
          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={charge.isPending || !readyToPay}
            onClick={() => {
              setError('')
              charge.mutate()
            }}
          >
            {charge.isPending ? t('Yuborilmoqda…') : waitingForDriver ? t('Haydovchi javobini kutmoqda…') : t('To‘lovni tasdiqlash')}
          </Button>
        </>
      ) : null}
    </div>
  )
}
