import { ChevronRight, CreditCard, Gift, HelpCircle, History, LogOut, MapPin, Settings, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui/Button'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { useApp } from '../context/AppContext'

const menu = [
  { to: '/settings', icon: User, label: 'Shaxsiy ma’lumotlar' },
  { to: '/wallet', icon: CreditCard, label: "To‘lov usullari" },
  { to: '/favorites', icon: MapPin, label: 'Manzillar kitobi' },
  { to: '/history', icon: History, label: 'Safar tarixi' },
  { to: '/promo', icon: Gift, label: 'Promo kodlar' },
  { to: '/notifications', icon: Settings, label: 'Bildirishnomalar' },
  { to: '/help', icon: HelpCircle, label: 'Yordam' },
]

export default function Profile() {
  const { user } = useApp()

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Profil" back={false} right={<Link to="/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"><Settings className="h-5 w-5" /></Link>} />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand to-brand-dark px-5 pb-10 pt-8 text-white">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover" />
            <div>
              <p className="text-xl font-extrabold">{user.name}</p>
              <p className="text-sm text-white/80">{user.phone}</p>
              {user.verified ? <Badge className="mt-2 bg-white text-brand">Tasdiqlangan</Badge> : null}
            </div>
          </div>
        </div>
        <div className="-mt-6 mx-5 mb-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-white shadow">
          {[
            [user.trips, 'Safar'],
            [user.rating, 'Reyting'],
            [user.points, 'Ball'],
          ].map(([value, label]) => (
            <div key={label} className="py-4 text-center">
              <p className="text-lg font-extrabold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 divide-y divide-line">
        {menu.map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold">{item.label}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </Card>

      <Button variant="soft" className="mt-4 w-full" onClick={() => window.location.reload()}>
        <LogOut className="h-4 w-4" /> Chiqish
      </Button>
    </div>
  )
}
