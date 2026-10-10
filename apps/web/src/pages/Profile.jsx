import { ChevronRight, CreditCard, Gift, HelpCircle, History, LogOut, MapPin, Phone, Settings, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { askForPhone } from '../components/auth/PhoneRequiredDialog'
import { Button, Card } from '../components/ui/Button'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { CoinCard } from '../components/ui/CoinCard'
import { LanguageMenuRow } from '../components/ui/LanguagePicker'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useMyBookings } from '../lib/queries'
import { formatSom } from '../lib/utils'
import { t } from '../i18n'

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
  const { logout } = useAuth()
  const { data: completedBookings = [] } = useMyBookings({ status: 'COMPLETED' })

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title={t('Profil')} back={false} right={<Link to="/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-canvas"><Settings className="h-5 w-5" /></Link>} />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand to-brand-dark px-5 pb-10 pt-8 text-white">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt="" className="h-20 w-20 rounded-full border-4 border-white object-cover" />
            <div>
              <p className="text-xl font-extrabold">{user.name || user.phone}</p>
              {user.phone ? (
                <p className="text-sm text-white/80">{user.phone}</p>
              ) : (
                // Google sign-ups start without a number; it's needed for bookings.
                <button
                  type="button"
                  onClick={() => askForPhone(t('Buyurtma berish uchun raqam kerak'))}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/40 transition hover:bg-white/30"
                >
                  <Phone className="h-3.5 w-3.5" /> {t('Telefon raqam qo‘shish')}
                </button>
              )}
              {user.verified ? (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-bold text-brand">
                  <img src="/badges/verified.webp" alt="" aria-hidden className="h-5 w-5 object-contain" />
                  {t('Tasdiqlangan')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="-mt-6 mx-5 mb-4 grid grid-cols-3 overflow-hidden rounded-2xl bg-white shadow">
          {[
            [completedBookings.length, 'Safar'],
            [user.points, 'Ball'],
            [formatSom(user.balance), 'Balans'],
          ].map(([value, label]) => (
            <div key={label} className="py-4 text-center">
              <p className="truncate px-1 text-lg font-extrabold">{value}</p>
              <p className="text-xs text-muted">{t(label)}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        <CoinCard />
      </div>

      <Card className="mt-4 divide-y divide-line">
        <LanguageMenuRow />
        {menu.map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold">{t(item.label)}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </Card>

      <Button variant="soft" className="mt-4 w-full" onClick={logout}>
        <LogOut className="h-4 w-4" /> {t('Chiqish')}
      </Button>
    </div>
  )
}
