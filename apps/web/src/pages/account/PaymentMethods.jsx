import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, CreditCard, Plus, Wallet } from 'lucide-react'
import { AccountScreen } from '../../components/account/AccountKit'
import { NetworkMark, PaymentLogo } from '../../components/payment/PaymentLogos'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { ONLINE_PAYMENTS } from '../../lib/features'
import { formatSom } from '../../lib/utils'
import { t } from '../../i18n'

// Menu → To‘lov usullari: the method new rides default to. Until a payment provider is live
// (ONLINE_PAYMENTS) cash is the only choice; the rest are listed under "Mavjud emas".

const APPS = [
  { id: 'click', title: 'Click' },
  { id: 'payme', title: 'Payme' },
  { id: 'uzum', title: 'Uzum Bank' },
]
const NETWORK_BY_BRAND = { Uzcard: 'uzcard', Humo: 'humo', Visa: 'visa', Mastercard: 'mastercard' }

function Section({ title, children }) {
  return (
    <section className="mb-2.5 rounded-[28px] bg-white px-4 pb-1 pt-4">
      <h2 className="mb-1 text-[22px] font-extrabold tracking-tight text-ink">{t(title)}</h2>
      {children}
    </section>
  )
}

function Radio({ on, disabled }) {
  return on ? (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
      <Check className="h-5 w-5" strokeWidth={3} />
    </span>
  ) : (
    <span className={`h-9 w-9 shrink-0 rounded-full ${disabled ? 'bg-canvas/60' : 'bg-canvas'}`} />
  )
}

function Method({ leading, title, subtitle, selected, disabled, onSelect, to }) {
  const body = (
    <>
      <span className="flex w-14 shrink-0 justify-center">{leading}</span>
      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-line/80 py-4 group-last:border-b-0">
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[17px] ${disabled ? 'text-muted' : 'text-ink'}`}>{title}</span>
          {subtitle ? <span className="block truncate text-[13px] text-muted">{subtitle}</span> : null}
        </span>
        {to ? <ChevronRight className="h-5 w-5 shrink-0 text-ink/70" /> : <Radio on={selected} disabled={disabled} />}
      </span>
    </>
  )
  const cls = 'group flex w-full items-center gap-3 text-left'
  if (to) return <Link to={to} className={cls}>{body}</Link>
  return (
    <button type="button" disabled={disabled} aria-pressed={selected} onClick={onSelect} className={`${cls} disabled:cursor-not-allowed`}>
      {body}
    </button>
  )
}

export default function PaymentMethods() {
  const { paymentMethod: chosen, setPaymentMethod } = useApp()
  const current = ONLINE_PAYMENTS ? chosen : 'cash'
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: () => api.get('/wallet') })
  const { data: cards = [] } = useQuery({ queryKey: ['wallet-cards'], queryFn: () => api.get('/wallet/cards'), enabled: ONLINE_PAYMENTS })

  return (
    <AccountScreen title="To‘lov usullari" large tone="canvas">
        <Section title="Kartalar va hisoblar">
          {cards.map((c) => (
            <Method
              key={c.id}
              leading={NETWORK_BY_BRAND[c.brand] ? <NetworkMark network={NETWORK_BY_BRAND[c.brand]} /> : <CreditCard className="h-6 w-6 text-ink" />}
              title={`${c.brand} ···· ${c.last4}`}
              selected={current === c.id}
              onSelect={() => setPaymentMethod(c.id)}
            />
          ))}
          <Method
            leading={<Wallet className="h-6 w-6 text-brand-dark" />}
            title={t('Hamyon')}
            subtitle={t('Balans: {0}', formatSom(wallet?.balance ?? 0))}
            {...(ONLINE_PAYMENTS ? { selected: current === 'wallet', onSelect: () => setPaymentMethod('wallet') } : { to: '/wallet' })}
          />
          <Method
            leading={
              <span className="flex h-7 w-9 items-center justify-center rounded-md border-[1.5px] border-ink text-ink">
                <Plus className="h-4 w-4" strokeWidth={2.4} />
              </span>
            }
            title={t('Karta qo‘shish')}
            subtitle={t('Uzcard, Humo, Visa, Mastercard')}
            to="/payment-methods/add-card"
          />
        </Section>

        <Section title="Boshqa usullar">
          <Method
            leading={<PaymentLogo id="cash" />}
            title={t('Naqd pul')}
            subtitle={t('Safar oxirida haydovchiga')}
            selected={current === 'cash'}
            onSelect={() => setPaymentMethod('cash')}
          />
          {ONLINE_PAYMENTS
            ? APPS.map((m) => (
                <Method
                  key={m.id}
                  leading={<PaymentLogo id={m.id} />}
                  title={m.title}
                  selected={current === m.id}
                  onSelect={() => setPaymentMethod(m.id)}
                />
              ))
            : null}
        </Section>

        {ONLINE_PAYMENTS ? null : (
          <Section title="Mavjud emas">
            {APPS.map((m) => (
              <Method
                key={m.id}
                disabled
                leading={<PaymentLogo id={m.id} dim />}
                title={m.title}
                subtitle={t('Tez orada ulanadi')}
              />
            ))}
          </Section>
        )}
    </AccountScreen>
  )
}
