import { Gift, Heart, History, Shield, Siren, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useRecentTrips } from '../../lib/queries'
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from '../../lib/adapters'
import { formatSom } from '../../lib/utils'
import { Badge, Button, Card } from '../ui/Button'

export function RightPanel() {
  const { user } = useApp()
  const { data: recentTrips = [] } = useRecentTrips(3)

  if (!user) return null

  return (
    <aside className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Hisobingiz</p>
            <p className="mt-1 text-2xl font-extrabold">{formatSom(user.balance)}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        <Link to="/wallet">
          <Button className="mt-4 w-full">To‘ldirish</Button>
        </Link>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { to: '/wallet', icon: Wallet, label: 'To‘lov' },
            { to: '/favorites', icon: Heart, label: 'Sevimli' },
            { to: '/promo', icon: Gift, label: 'Promo' },
            { to: '/history', icon: History, label: 'Tarix' },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="rounded-xl bg-canvas px-1 py-2">
              <item.icon className="mx-auto h-4 w-4 text-brand" />
              <span className="mt-1 block text-[10px] font-medium text-muted">{item.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden bg-gradient-to-br from-brand-soft to-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">🎁</div>
          <div>
            <p className="font-bold">Do‘stingizni taklif qiling</p>
            <p className="text-xs text-muted">Har bir taklif uchun 20 000 so‘m</p>
          </div>
        </div>
        <Link to="/promo">
          <Button size="sm" className="mt-4 w-full">
            Taklif qilish
          </Button>
        </Link>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold">So‘nggi safarlar</h3>
        <div className="mt-2 divide-y divide-line">
          {recentTrips.length === 0 ? <p className="py-3 text-sm text-muted">Hali safarlar yo‘q</p> : null}
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
                <Badge tone={BOOKING_STATUS_TONE[item.status]}>{BOOKING_STATUS_LABEL[item.status]}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex items-center gap-4 p-5">
        <Link
          to="/sos"
          className="sos-pulse flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-extrabold text-white"
        >
          SOS
        </Link>
        <div>
          <p className="flex items-center gap-1 font-bold">
            <Siren className="h-4 w-4 text-red-500" /> Favqulodda
          </p>
          <p className="text-xs text-muted">Xavfli vaziyatda yordam chaqiring. GPS va ishonchli kontaktlar yuboriladi.</p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
        {[
          [Shield, 'Xavfsizlik kafolati'],
          [Wallet, 'Qulay to‘lov'],
        ].map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
            <Icon className="h-4 w-4 text-brand" />
            {label}
          </div>
        ))}
      </div>
    </aside>
  )
}
