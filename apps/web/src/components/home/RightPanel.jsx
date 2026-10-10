import { Gift, Heart, History, Shield, Siren, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useRecentTrips } from '../../lib/queries'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/adapters'
import { formatSom } from '../../lib/utils'
import { Badge, Button, Card } from '../ui/Button'
import { ONLINE_PAYMENTS } from '../../lib/features'
import { REFERRAL_ENABLED, SOS_ENABLED } from '../../lib/features'
import { SoonBadge } from '../ui/SoonBadge'
import { t } from '../../i18n'

export function RightPanel() {
  const { user } = useApp()
  const { data: recentTrips = [] } = useRecentTrips(3)

  if (!user) return null

  return (
    <aside className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">{t('Hisobingiz')}</p>
            <p className="mt-1 text-2xl font-extrabold">{formatSom(user.balance)}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        {ONLINE_PAYMENTS ? (
          <Link to="/wallet">
            <Button className="mt-4 w-full">{t('To‘ldirish')}</Button>
          </Link>
        ) : (
          <Button className="mt-4 w-full" disabled>
            {t('To‘ldirish · Tez orada')}
          </Button>
        )}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { to: '/wallet', icon: Wallet, label: t('To‘lov') },
            { to: '/favorites', icon: Heart, label: t('Sevimli') },
            { to: '/promo', icon: Gift, label: t('Promo') },
            { to: '/history', icon: History, label: t('Tarix') },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="rounded-xl bg-canvas px-1 py-2">
              <item.icon className="mx-auto h-4 w-4 text-brand" />
              <span className="mt-1 block text-[10px] font-medium text-muted">{t(item.label)}</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden bg-gradient-to-br from-brand-soft to-white p-5" aria-disabled={!REFERRAL_ENABLED || undefined}>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ${REFERRAL_ENABLED ? '' : 'grayscale'}`}>🎁</div>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-bold">
              {t('Do‘stingizni taklif qiling')}{' '}{REFERRAL_ENABLED ? null : <SoonBadge />}
            </p>
            <p className="text-xs text-muted">{REFERRAL_ENABLED ? t('Har bir taklif uchun 20 000 so‘m') : t('Taklif bonuslari tez orada ishga tushadi')}</p>
          </div>
        </div>
        {REFERRAL_ENABLED ? (
          <Link to="/promo">
            <Button size="sm" className="mt-4 w-full">
              {t('Taklif qilish')}
            </Button>
          </Link>
        ) : (
          <span className="mt-4 flex h-9 w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
            {t('Tez orada')}
          </span>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold">{t('So‘nggi safarlar')}</h3>
        <div className="mt-2 divide-y divide-line">
          {recentTrips.length === 0 ? <p className="py-3 text-sm text-muted">{t('Hali safarlar yo‘q')}</p> : null}
          {recentTrips.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold">
                  {item.from} → {item.to}
                </p>
                <p className="text-xs text-muted">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatSom(item.price)}</p>
                <Badge tone={BOOKING_STATUS_TONE[item.status]}>{t(BOOKING_STATUS_LABEL[item.status])}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {SOS_ENABLED ? (
        <Card className="flex items-center gap-4 p-5">
          <Link
            to="/sos"
            className="sos-pulse flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-extrabold text-white"
          >
            SOS
          </Link>
          <div>
            <p className="flex items-center gap-1 font-bold">
              <Siren className="h-4 w-4 text-red-500" /> {t('Favqulodda')}
            </p>
            <p className="text-xs text-muted">{t('Xavfli vaziyatda yordam chaqiring. GPS va ishonchli kontaktlar yuboriladi.')}</p>
          </div>
        </Card>
      ) : (
        <Card className="flex items-center gap-4 p-5" aria-disabled="true">
          <span className="flex h-16 w-16 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-400">
            SOS
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-bold text-ink/60">
              <Siren className="h-4 w-4 text-slate-400" /> {t('Favqulodda')}{' '}<SoonBadge />
            </p>
            <p className="text-xs text-muted">{t('Favqulodda yordam xizmati tez orada ishga tushadi.')}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
        {[
          [Shield, 'Xavfsizlik kafolati'],
          [Wallet, 'Qulay to‘lov'],
        ].map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
            <Icon className="h-4 w-4 text-brand" />
            {t(label)}
          </div>
        ))}
      </div>
    </aside>
  )
}
